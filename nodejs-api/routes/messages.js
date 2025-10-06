/**
 * Messages Routes - Chat message handling and AI integration
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { logActivity } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ===== SEND MESSAGE (with AI Response) =====
router.post('/', [
    body('conversationId')
        .isInt({ min: 1 })
        .withMessage('Valid conversation ID is required'),
    body('content')
        .notEmpty()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message content must be between 1 and 10000 characters'),
    body('messageType')
        .optional()
        .isIn(['user', 'system'])
        .withMessage('Message type must be user or system')
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

        const { conversationId, content, messageType = 'user' } = req.body;

        // Check if conversation exists and belongs to user
        const conversationCheck = await Database.query(
            'SELECT id, title FROM conversations WHERE id = $1 AND user_id = $2 AND is_active = true',
            [conversationId, req.user.id]
        );

        if (conversationCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Save user message
        const messageResult = await Database.query(`
            INSERT INTO messages (conversation_id, user_id, content, message_type) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `, [conversationId, req.user.id, content, messageType]);

        const userMessage = messageResult.rows[0];

        // Update conversation timestamp
        await Database.query(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [conversationId]
        );

        // Get AI response if it's a user message
        let aiResponse = null;
        let aiMessage = null;

        if (messageType === 'user') {
            try {
                aiResponse = await getAIResponse(content, conversationId);
                
                if (aiResponse) {
                    // Save AI response as a separate message
                    const aiMessageResult = await Database.query(`
                        INSERT INTO messages (conversation_id, user_id, content, message_type, ai_response) 
                        VALUES ($1, $2, $3, $4, $5) 
                        RETURNING *
                    `, [conversationId, req.user.id, aiResponse, 'ai', aiResponse]);

                    aiMessage = aiMessageResult.rows[0];
                }
            } catch (aiError) {
                logger.error('AI response error:', aiError);
                // Continue without AI response - don't fail the whole request
            }
        }

        await logActivity(req.user.id, 'MESSAGE_SENT', { 
            conversationId,
            messageId: userMessage.id,
            hasAiResponse: !!aiResponse
        });

        logger.info(`Message sent in conversation ${conversationId} by user ${req.user.username}`);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            userMessage: userMessage,
            aiMessage: aiMessage,
            aiResponse: aiResponse
        });

    } catch (error) {
        logger.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

// ===== GET MESSAGE BY ID =====
router.get('/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);

        if (isNaN(messageId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid message ID'
            });
        }

        const result = await Database.query(`
            SELECT 
                m.*,
                u.username,
                u.full_name,
                c.title as conversation_title
            FROM messages m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = $1 AND m.user_id = $2
        `, [messageId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            message: result.rows[0]
        });

    } catch (error) {
        logger.error('Get message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message'
        });
    }
});

// ===== UPDATE MESSAGE =====
router.put('/:id', [
    body('content')
        .notEmpty()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message content must be between 1 and 10000 characters')
], async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const errors = validationResult(req);

        if (isNaN(messageId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid message ID'
            });
        }

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { content } = req.body;

        // Check if message exists and belongs to user
        const existingMessage = await Database.query(
            'SELECT id, conversation_id FROM messages WHERE id = $1 AND user_id = $2',
            [messageId, req.user.id]
        );

        if (existingMessage.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        const result = await Database.query(`
            UPDATE messages 
            SET content = $1, metadata = jsonb_set(COALESCE(metadata, '{}'), '{edited}', 'true') 
            WHERE id = $2 AND user_id = $3 
            RETURNING *
        `, [content, messageId, req.user.id]);

        await logActivity(req.user.id, 'MESSAGE_UPDATED', { 
            messageId,
            conversationId: existingMessage.rows[0].conversation_id
        });

        res.json({
            success: true,
            message: 'Message updated successfully',
            updatedMessage: result.rows[0]
        });

    } catch (error) {
        logger.error('Update message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update message'
        });
    }
});

// ===== DELETE MESSAGE =====
router.delete('/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);

        if (isNaN(messageId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid message ID'
            });
        }

        // Check if message exists and belongs to user
        const existingMessage = await Database.query(
            'SELECT id, conversation_id, content FROM messages WHERE id = $1 AND user_id = $2',
            [messageId, req.user.id]
        );

        if (existingMessage.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Soft delete - update content and add deleted flag
        await Database.query(`
            UPDATE messages 
            SET content = '[Tin nhắn đã bị xóa]', 
                metadata = jsonb_set(COALESCE(metadata, '{}'), '{deleted}', 'true')
            WHERE id = $1
        `, [messageId]);

        await logActivity(req.user.id, 'MESSAGE_DELETED', { 
            messageId,
            conversationId: existingMessage.rows[0].conversation_id
        });

        logger.info(`Message deleted: ${messageId} by user ${req.user.username}`);

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        logger.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
});

// ===== SEARCH MESSAGES =====
router.get('/search', async (req, res) => {
    try {
        const { q: query, conversationId, limit = 20, offset = 0 } = req.query;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        let searchQuery = `
            SELECT 
                m.*,
                u.username,
                u.full_name,
                c.title as conversation_title,
                ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $1)) as rank
            FROM messages m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN conversations c ON m.conversation_id = c.id
            WHERE m.user_id = $2 
            AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $1)
        `;

        const params = [query.trim(), req.user.id];
        let paramCount = 3;

        if (conversationId) {
            searchQuery += ` AND m.conversation_id = $${paramCount}`;
            params.push(parseInt(conversationId));
            paramCount++;
        }

        searchQuery += `
            ORDER BY rank DESC, m.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;

        params.push(parseInt(limit), parseInt(offset));

        const result = await Database.query(searchQuery, params);

        res.json({
            success: true,
            messages: result.rows,
            searchQuery: query.trim(),
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: result.rows.length === parseInt(limit)
            }
        });

    } catch (error) {
        logger.error('Search messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search messages'
        });
    }
});

// ===== AI RESPONSE HELPER FUNCTION =====
async function getAIResponse(userMessage, conversationId) {
    try {
        // Get conversation context (last few messages)
        const contextResult = await Database.query(`
            SELECT content, message_type, ai_response
            FROM messages 
            WHERE conversation_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [conversationId]);

        const context = contextResult.rows.reverse(); // Reverse to get chronological order

        // Prepare request to Python AI service
        const aiServiceUrl = process.env.PYTHON_AI_API || 'https://hcm-chat-2.onrender.com';
        const requestBody = {
            message: userMessage,
            context: context,
            conversation_id: conversationId
        };

        const response = await fetch(`${aiServiceUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: 30000 // 30 seconds timeout
        });

        if (!response.ok) {
            throw new Error(`AI service responded with status: ${response.status}`);
        }

        const aiData = await response.json();
        return aiData.response || aiData.answer || 'Xin lỗi, tôi không thể trả lời câu hỏi này lúc này.';

    } catch (error) {
        logger.error('AI service error:', error);
        // Return a fallback response
        return 'Xin lỗi, dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.';
    }
}

module.exports = router;
