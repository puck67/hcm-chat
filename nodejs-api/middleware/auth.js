/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const { Database } = require('../models/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'hcm-chatbot-secret-key-2024-very-long-key-for-security';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name
    };

    return jwt.sign(payload, JWT_SECRET, { 
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'HCMChatbotAPI',
        audience: 'HCMChatbotUsers'
    });
};

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Verify user still exists and is active
        const result = await Database.query(
            'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1 AND is_active = true',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        logger.error('JWT verification error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Token verification failed'
        });
    }
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Log user activity
const logActivity = async (userId, action, details = {}, req = null) => {
    try {
        await Database.query(
            `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                userId,
                action,
                JSON.stringify(details),
                req?.ip || null,
                req?.get('User-Agent') || null
            ]
        );
    } catch (error) {
        logger.error('Error logging activity:', error);
    }
};

module.exports = {
    generateToken,
    authenticateToken,
    requireAdmin,
    logActivity
};
