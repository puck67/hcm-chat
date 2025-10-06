/**
 * Users Routes - User management endpoints
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { requireAdmin, logActivity } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ===== GET ALL USERS (Admin only) =====
router.get('/', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';
        const role = req.query.role;
        const isActive = req.query.isActive;

        let query = `
            SELECT 
                u.id, u.username, u.email, u.full_name, u.role, 
                u.created_at, u.updated_at, u.is_active,
                COUNT(DISTINCT c.id) as conversation_count,
                COUNT(DISTINCT m.id) as message_count,
                MAX(al.created_at) as last_activity
            FROM users u
            LEFT JOIN conversations c ON u.id = c.user_id
            LEFT JOIN messages m ON u.id = m.user_id
            LEFT JOIN activity_logs al ON u.id = al.user_id
        `;

        const conditions = [];
        const params = [];
        let paramCount = 1;

        if (search) {
            conditions.push(`(u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        if (role) {
            conditions.push(`u.role = $${paramCount}`);
            params.push(role);
            paramCount++;
        }

        if (isActive !== undefined) {
            conditions.push(`u.is_active = $${paramCount}`);
            params.push(isActive === 'true');
            paramCount++;
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += `
            GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.created_at, u.updated_at, u.is_active
            ORDER BY u.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        params.push(limit, offset);

        const result = await Database.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM users';
        const countParams = [];
        let countParamCount = 1;

        const countConditions = [];
        if (search) {
            countConditions.push(`(username ILIKE $${countParamCount} OR email ILIKE $${countParamCount} OR full_name ILIKE $${countParamCount})`);
            countParams.push(`%${search}%`);
            countParamCount++;
        }

        if (role) {
            countConditions.push(`role = $${countParamCount}`);
            countParams.push(role);
            countParamCount++;
        }

        if (isActive !== undefined) {
            countConditions.push(`is_active = $${countParamCount}`);
            countParams.push(isActive === 'true');
            countParamCount++;
        }

        if (countConditions.length > 0) {
            countQuery += ` WHERE ${countConditions.join(' AND ')}`;
        }

        const totalResult = await Database.query(countQuery, countParams);

        res.json({
            success: true,
            users: result.rows,
            pagination: {
                total: parseInt(totalResult.rows[0].count),
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});

// ===== GET USER BY ID =====
router.get('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Regular users can only view their own profile, admins can view any
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const result = await Database.query(`
            SELECT 
                u.id, u.username, u.email, u.full_name, u.role, 
                u.created_at, u.updated_at, u.is_active,
                COUNT(DISTINCT c.id) as conversation_count,
                COUNT(DISTINCT m.id) as message_count,
                MAX(al.created_at) as last_activity
            FROM users u
            LEFT JOIN conversations c ON u.id = c.user_id
            LEFT JOIN messages m ON u.id = m.user_id
            LEFT JOIN activity_logs al ON u.id = al.user_id
            WHERE u.id = $1
            GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.created_at, u.updated_at, u.is_active
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user'
        });
    }
});

// ===== UPDATE USER (Admin only) =====
router.put('/:id', requireAdmin, [
    body('email').optional().isEmail().normalizeEmail(),
    body('fullName').optional().isLength({ max: 100 }),
    body('role').optional().isIn(['user', 'admin', 'moderator']),
    body('isActive').optional().isBoolean()
], async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const errors = validationResult(req);

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, fullName, role, isActive } = req.body;

        // Check if user exists
        const existingUser = await Database.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [userId]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (email) {
            // Check if email is already taken by another user
            const existingEmail = await Database.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );

            if (existingEmail.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already exists'
                });
            }

            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }

        if (fullName !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(fullName);
        }

        if (role) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }

        if (isActive !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(isActive);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        const result = await Database.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, full_name, role, is_active, updated_at`,
            values
        );

        await logActivity(req.user.id, 'USER_UPDATED', { 
            targetUserId: userId,
            targetUsername: existingUser.rows[0].username,
            changes: { email, fullName, role, isActive }
        });

        logger.info(`User updated: ${existingUser.rows[0].username} by admin ${req.user.username}`);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});

// ===== DELETE USER (Admin only) =====
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Prevent admin from deleting themselves
        if (req.user.id === userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Check if user exists
        const existingUser = await Database.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [userId]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete - mark as inactive
        await Database.query(
            'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );

        await logActivity(req.user.id, 'USER_DELETED', { 
            targetUserId: userId,
            targetUsername: existingUser.rows[0].username
        });

        logger.info(`User deleted: ${existingUser.rows[0].username} by admin ${req.user.username}`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

// ===== GET USER ACTIVITY =====
router.get('/:id/activity', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Regular users can only view their own activity, admins can view any
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const result = await Database.query(`
            SELECT 
                al.*,
                u.username,
                u.full_name
            FROM activity_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.user_id = $1
            ORDER BY al.created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const totalResult = await Database.query(
            'SELECT COUNT(*) as count FROM activity_logs WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            activities: result.rows,
            pagination: {
                total: parseInt(totalResult.rows[0].count),
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Get user activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user activity'
        });
    }
});

module.exports = router;
