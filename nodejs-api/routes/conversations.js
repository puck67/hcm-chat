/**
 * Conversations Routes - Chat conversation management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { logActivity } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ===== GET USER CONVERSATIONS =====
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const result = await Database.query(`
            SELECT 
                c.*,
                COUNT(m.id) as message_count,
                MAX(m.created_at) as last_message_at
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.user_id = $1 AND c.is_active = true
            GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at, c.is_active
            ORDER BY c.updated_at DESC
            LIMIT $2 OFFSET $3
        `, [req.user.id, limit, offset]);

        const totalResult = await Database.query(
            'SELECT COUNT(*) as count FROM conversations WHERE user_id = $1 AND is_active = true',
            [req.user.id]
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
        logger.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversations'
        });
    }
});

// ===== GET SPECIFIC CONVERSATION =====
router.get('/:id', async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);

        if (isNaN(conversationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation ID'
            });
        }

        const result = await Database.query(`
            SELECT 
                c.*,
                COUNT(m.id) as message_count
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.id = $1 AND c.user_id = $2 AND c.is_active = true
            GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at, c.is_active
        `, [conversationId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            conversation: result.rows[0]
        });

    } catch (error) {
        logger.error('Get conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversation'
        });
    }
});

// ===== CREATE NEW CONVERSATION =====
router.post('/', [
    body('title')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title must be between 1 and 255 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { title } = req.body;
        const conversationTitle = title || `Cuộc trò chuyện ${new Date().toLocaleString('vi-VN')}`;

        const result = await Database.query(`
            INSERT INTO conversations (user_id, title) 
            VALUES ($1, $2) 
            RETURNING *
        `, [req.user.id, conversationTitle]);

        const newConversation = result.rows[0];

        await logActivity(req.user.id, 'CONVERSATION_CREATED', { 
            conversationId: newConversation.id,
            title: conversationTitle 
        });

        logger.info(`New conversation created: ${newConversation.id} by user ${req.user.username}`);

        res.status(201).json({
            success: true,
            message: 'Conversation created successfully',
            conversation: newConversation
        });

    } catch (error) {
        logger.error('Create conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create conversation'
        });
    }
});

// ===== UPDATE CONVERSATION =====
router.put('/:id', [
    body('title')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Title must be between 1 and 255 characters')
], async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const errors = validationResult(req);

        if (isNaN(conversationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation ID'
            });
        }

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { title } = req.body;

        // Check if conversation exists and belongs to user
        const existingConversation = await Database.query(
            'SELECT id FROM conversations WHERE id = $1 AND user_id = $2 AND is_active = true',
            [conversationId, req.user.id]
        );

        if (existingConversation.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        const result = await Database.query(`
            UPDATE conversations 
            SET title = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 AND user_id = $3 
            RETURNING *
        `, [title, conversationId, req.user.id]);

        await logActivity(req.user.id, 'CONVERSATION_UPDATED', { 
            conversationId,
            newTitle: title 
        });

        res.json({
            success: true,
            message: 'Conversation updated successfully',
            conversation: result.rows[0]
        });

    } catch (error) {
        logger.error('Update conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update conversation'
        });
    }
});

// ===== DELETE CONVERSATION =====
router.delete('/:id', async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);

        if (isNaN(conversationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation ID'
            });
        }

        // Check if conversation exists and belongs to user
        const existingConversation = await Database.query(
            'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2 AND is_active = true',
            [conversationId, req.user.id]
        );

        if (existingConversation.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Soft delete - mark as inactive
        await Database.query(
            'UPDATE conversations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [conversationId]
        );

        await logActivity(req.user.id, 'CONVERSATION_DELETED', { 
            conversationId,
            title: existingConversation.rows[0].title 
        });

        logger.info(`Conversation deleted: ${conversationId} by user ${req.user.username}`);

        res.json({
            success: true,
            message: 'Conversation deleted successfully'
        });

    } catch (error) {
        logger.error('Delete conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete conversation'
        });
    }
});

// ===== GET CONVERSATION MESSAGES =====
router.get('/:id/messages', async (req, res) => {
    try {
        const conversationId = parseInt(req.params.id);
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        if (isNaN(conversationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation ID'
            });
        }

        // Check if conversation exists and belongs to user
        const conversationCheck = await Database.query(
            'SELECT id FROM conversations WHERE id = $1 AND user_id = $2 AND is_active = true',
            [conversationId, req.user.id]
        );

        if (conversationCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        const result = await Database.query(`
            SELECT 
                m.*,
                u.username,
                u.full_name
            FROM messages m
            JOIN users u ON m.user_id = u.id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC
            LIMIT $2 OFFSET $3
        `, [conversationId, limit, offset]);

        const totalResult = await Database.query(
            'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
            [conversationId]
        );

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
        logger.error('Get conversation messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversation messages'
        });
    }
});

module.exports = router;
