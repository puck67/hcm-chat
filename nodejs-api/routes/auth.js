/**
 * Authentication Routes
 * Handles login, register, password changes, profile updates
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { generateToken, authenticateToken, logActivity } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ===== REGISTER =====
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('fullName')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Full name must be less than 100 characters')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password, fullName } = req.body;

        // Check if user already exists
        const existingUser = await Database.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await Database.query(
            `INSERT INTO users (username, email, password_hash, full_name) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username, email, full_name, role, created_at`,
            [username, email, passwordHash, fullName || username]
        );

        const newUser = result.rows[0];

        // Log activity
        await logActivity(newUser.id, 'USER_REGISTERED', { username, email }, req);

        logger.info(`New user registered: ${username} (${email})`);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.full_name,
                role: newUser.role
            }
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// ===== LOGIN =====
router.post('/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password } = req.body;

        // Find user
        const result = await Database.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        const user = result.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Update last login
        await Database.query(
            'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Log activity
        await logActivity(user.id, 'USER_LOGIN', { username: user.username }, req);

        logger.info(`User logged in: ${user.username}`);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// ===== VERIFY TOKEN =====
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                fullName: req.user.full_name,
                role: req.user.role
            }
        });
    } catch (error) {
        logger.error('Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user info'
        });
    }
});

// ===== GET PROFILE =====
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await Database.query(
            'SELECT id, username, email, full_name, role, created_at, updated_at FROM users WHERE id = $1',
            [req.user.id]
        );

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
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

// ===== UPDATE PROFILE =====
router.put('/profile', authenticateToken, [
    body('email').optional().isEmail().normalizeEmail(),
    body('fullName').optional().isLength({ max: 100 })
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

        const { email, fullName } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (email) {
            // Check if email is already taken by another user
            const existingEmail = await Database.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, req.user.id]
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

        if (fullName) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(fullName);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.user.id);

        const result = await Database.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, full_name, role`,
            values
        );

        await logActivity(req.user.id, 'PROFILE_UPDATED', { email, fullName }, req);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// ===== CHANGE PASSWORD =====
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
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

        const { currentPassword, newPassword } = req.body;

        // Get current user
        const result = await Database.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await Database.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        await logActivity(req.user.id, 'PASSWORD_CHANGED', {}, req);

        logger.info(`Password changed for user: ${req.user.username}`);

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công!'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

module.exports = router;
