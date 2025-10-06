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
            'SELECT COUNT(*) as count FROM users WHERE is_active = true'
        );

        // Get total conversations
        const totalConversationsResult = await Database.query(
            'SELECT COUNT(*) as count FROM conversations WHERE is_active = true'
        );

        // Get total messages
        const totalMessagesResult = await Database.query(
            'SELECT COUNT(*) as count FROM messages'
        );

        // Get active users (users who logged in within last 7 days)
        const activeUsersResult = await Database.query(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM activity_logs 
            WHERE action = 'USER_LOGIN' 
            AND created_at >= NOW() - INTERVAL '7 days'
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
            stats: {
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
            activities: result.rows,
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
                u.id, u.username, u.email, u.full_name, u.role, 
                u.created_at, u.updated_at, u.is_active,
                COUNT(c.id) as conversation_count,
                COUNT(m.id) as message_count
            FROM users u
            LEFT JOIN conversations c ON u.id = c.user_id
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
            GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.created_at, u.updated_at, u.is_active
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
            users: result.rows,
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
                COUNT(m.id) as message_count,
                MAX(m.created_at) as last_message_at
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.is_active = true
            GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at, c.is_active, u.username, u.full_name
            ORDER BY c.updated_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const totalResult = await Database.query(
            'SELECT COUNT(*) as count FROM conversations WHERE is_active = true'
        );

        res.json({
            success: true,
            conversations: result.rows,
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
                m.*,
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
            messages: result.rows,
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

module.exports = router;
