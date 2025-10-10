#!/usr/bin/env node

/**
 * Script để restart server với timezone configuration mới
 */

const { execSync } = require('child_process');
const logger = require('./utils/logger');

async function restartServer() {
    try {
        logger.info('🔄 Restarting Node.js server with VN timezone...');
        
        // Kill existing process if running
        try {
            execSync('pkill -f "node.*server.js"', { stdio: 'ignore' });
            logger.info('✅ Stopped existing server process');
        } catch (e) {
            // Process might not be running, ignore error
        }
        
        // Set timezone environment variable
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start server
        logger.info('🚀 Starting server with VN timezone...');
        execSync('node server.js', { 
            stdio: 'inherit',
            env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh' }
        });
        
    } catch (error) {
        logger.error('❌ Error restarting server:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    restartServer();
}

module.exports = { restartServer };
