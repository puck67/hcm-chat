/**
 * HCM CHATBOT NODE.JS API SERVER
 * Complete API server with authentication, database, and all endpoints
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');
const { Database } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 8000;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// ===== CORS CONFIGURATION =====
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5173', 
        'http://localhost:8080',
        'https://hcm-chat.vercel.app',
        'https://hcm-chatbot-frontend.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// ===== BASIC MIDDLEWARE =====
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== HEALTH CHECK =====
app.get('/', (req, res) => {
    res.json({
        message: 'HCM Chatbot Node.js API is running!',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'healthy'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'nodejs-api',
        uptime: process.uptime()
    });
});

// ===== API ROUTES =====
app.use('/auth', authRoutes);
app.use('/dashboard', authenticateToken, dashboardRoutes);
app.use('/conversations', authenticateToken, conversationRoutes);
app.use('/chat', authenticateToken, messageRoutes);
app.use('/users', authenticateToken, userRoutes);

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, { stack: err.stack });
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', async () => {
    logger.info(`🚀 HCM Chatbot API Server running on port ${PORT}`);
    logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
    
    // Initialize database on startup
    try {
        await Database.testConnection();
        await Database.initializeTables();
        await Database.createAdminUser();
        logger.info('✅ Database initialized successfully');
    } catch (error) {
        logger.error('❌ Database initialization failed:', error);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
