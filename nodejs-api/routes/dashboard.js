/**
 * Dashboard Routes - Admin Analytics and Statistics
 */

const express = require('express');
const { Database } = require('../models/database');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ===== DASHBOARD STATS =====
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        // Get total users
        const totalUsersResult = await Database.query(
            "SELECT COUNT(*) as count FROM users WHERE is_active = true"
        );

        // Get total conversations
        const totalConversationsResult = await Database.query(
            'SELECT COUNT(*) as count FROM conversations'
        );

        // Get total messages
        const totalMessagesResult = await Database.query(
            'SELECT COUNT(*) as count FROM messages'
        );

        // Get active users (users who have conversations in last 7 days)
        const activeUsersResult = await Database.query(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM conversations 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        // Get new users today
        const newUsersResult = await Database.query(`
            SELECT COUNT(*) as count 
            FROM users 
            WHERE DATE(created_at) = CURRENT_DATE
        `);

        // Get conversations today
        const conversationsTodayResult = await Database.query(`
            SELECT COUNT(*) as count 
            FROM conversations 
            WHERE DATE(created_at) = CURRENT_DATE
        `);

        // Get messages today
        const messagesTodayResult = await Database.query(`
            SELECT COUNT(*) as count 
            FROM messages 
            WHERE DATE(created_at) = CURRENT_DATE
        `);

        res.json({
            success: true,
            data: {
                totalUsers: parseInt(totalUsersResult.rows[0].count),
                totalConversations: parseInt(totalConversationsResult.rows[0].count),
                totalMessages: parseInt(totalMessagesResult.rows[0].count),
                activeUsers: parseInt(activeUsersResult.rows[0].count),
                today: {
                    newUsers: parseInt(newUsersResult.rows[0].count),
                    conversations: parseInt(conversationsTodayResult.rows[0].count),
                    messages: parseInt(messagesTodayResult.rows[0].count)
                }
            }
        });

    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard stats'
        });
    }
});

// ===== RECENT ACTIVITY =====
router.get('/activity', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const result = await Database.query(`
            SELECT 
                al.*,
                u.username,
                u.full_name
            FROM activity_logs al
            JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const totalResult = await Database.query('SELECT COUNT(*) as count FROM activity_logs');

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(totalResult.rows[0].count),
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Dashboard activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get activity logs'
        });
    }
});

// ===== USER MANAGEMENT =====
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';

        let query = `
            SELECT 
                u.id, u.username, u.email, u.full_name, u.role, u.is_active as status,
                u.created_at, u.updated_at,
                COUNT(DISTINCT c.id) as total_conversations,
                COUNT(DISTINCT m.id) as total_messages
            FROM users u
            LEFT JOIN conversations c ON u.id = c.user_id AND c.is_active = true
            LEFT JOIN messages m ON u.id = m.user_id
        `;

        const params = [limit, offset];
        let paramCount = 3;

        if (search) {
            query += ` WHERE (u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += `
            GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at, u.updated_at
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await Database.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as count FROM users';
        const countParams = [];

        if (search) {
            countQuery += ' WHERE (username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1)';
            countParams.push(`%${search}%`);
        }

        const totalResult = await Database.query(countQuery, countParams);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(totalResult.rows[0].count),
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Dashboard users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});

// ===== RECENT CONVERSATIONS =====
router.get('/conversations', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const result = await Database.query(`
            SELECT 
                c.*,
                u.username,
                u.full_name,
                COUNT(m.id) as message_count
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.is_active = true
            GROUP BY c.id, u.username, u.full_name
            ORDER BY c.updated_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const totalResult = await Database.query(
            'SELECT COUNT(*) as count FROM conversations WHERE is_active = true'
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(totalResult.rows[0].count),
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Dashboard conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversations'
        });
    }
});

// ===== RECENT MESSAGES =====
router.get('/messages', requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const result = await Database.query(`
            SELECT 
                m.id,
                m.content,
                m.message_type as role,
                m.created_at,
                m.metadata,
                u.username,
                u.full_name,
                c.title as conversation_title
            FROM messages m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN conversations c ON m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const totalResult = await Database.query('SELECT COUNT(*) as count FROM messages');

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(totalResult.rows[0].count),
                limit,
                offset,
                hasMore: (offset + limit) < parseInt(totalResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Dashboard messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages'
        });
    }
});

// ===== ANALYTICS CHARTS DATA =====
router.get('/analytics/users', requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const result = await Database.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_users
            FROM users
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Analytics users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user analytics'
        });
    }
});

router.get('/analytics/messages', requireAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const result = await Database.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as message_count
            FROM messages
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        logger.error('Analytics messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message analytics'
        });
    }
});

// ===== MESSAGE STATISTICS =====
router.get('/messages/stats', requireAdmin, async (req, res) => {
    try {
        // Get messages this week count
        const thisWeekResult = await Database.query(`
            SELECT COUNT(*) as count 
            FROM messages 
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        // Get average messages per conversation
        const avgResult = await Database.query(`
            SELECT 
                COALESCE(AVG(message_count), 0) as average
            FROM (
                SELECT conversation_id, COUNT(*) as message_count
                FROM messages
                WHERE conversation_id IS NOT NULL
                GROUP BY conversation_id
            ) as conv_messages
        `);

        res.json({
            success: true,
            data: {
                thisWeekCount: parseInt(thisWeekResult.rows[0].count),
                averagePerConversation: parseFloat(avgResult.rows[0].average)
            }
        });

    } catch (error) {
        logger.error('Message stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message statistics'
        });
    }
});

// ===== USER STATISTICS =====
router.get('/users/stats', requireAdmin, async (req, res) => {
    try {
        // Get active users count (users who created conversations in last 7 days)
        const activeResult = await Database.query(`
            SELECT COUNT(DISTINCT user_id) as count
            FROM conversations
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        res.json({
            success: true,
            data: {
                activeCount: parseInt(activeResult.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('User stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user statistics'
        });
    }
});

// ===== USER MANAGEMENT =====
router.put('/users/:userId/status', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;

        if (!['enable', 'disable'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const isActive = status === 'enable';
        const result = await Database.query(
            'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [isActive, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`User ${userId} status changed to ${status} by admin ${req.user.id}`);

        res.json({
            success: true,
            message: `User ${status === 'enable' ? 'enabled' : 'disabled'} successfully`,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
});

router.put('/users/:userId/role', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role value'
            });
        }

        const result = await Database.query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`User ${userId} role changed to ${role} by admin ${req.user.id}`);

        res.json({
            success: true,
            message: `User role updated to ${role} successfully`,
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role'
        });
    }
});

router.delete('/users/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting yourself
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Check if user exists
        const userCheck = await Database.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete by setting is_active to false
        const result = await Database.query(
            "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *",
            [userId]
        );

        logger.info(`User ${userId} deleted by admin ${req.user.id}`);

        res.json({
            success: true,
            message: 'User deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});

module.exports = router;
