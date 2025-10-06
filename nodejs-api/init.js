/**
 * Database Initialization Script
 * Run this to set up tables and create admin user
 */

require('dotenv').config();
const { Database } = require('./models/database');
const logger = require('./utils/logger');

async function initializeDatabase() {
    try {
        logger.info('🚀 Starting database initialization...');

        // Test connection
        const isConnected = await Database.testConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }

        // Initialize tables
        await Database.initializeTables();

        // Create admin user
        await Database.createAdminUser();

        logger.info('✅ Database initialization completed successfully!');
        logger.info('📝 Default admin user: admin / admin123');
        
        process.exit(0);
    } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };
