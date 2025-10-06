/**
 * PostgreSQL Database Connection và Models
 * Kết nối với Supabase PostgreSQL
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres.vdikmrnnvqomdacvyskb',
    password: process.env.DB_PASSWORD || '12345',
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
    logger.info('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    logger.error('❌ PostgreSQL connection error:', err);
});

// Database helper functions
class Database {
    static async query(text, params) {
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug(`Executed query in ${duration}ms: ${text}`);
            return result;
        } catch (error) {
            logger.error(`Database query error: ${error.message}`);
            throw error;
        }
    }

    static async getClient() {
        return await pool.connect();
    }

    // Initialize database tables if they don't exist
    static async initializeTables() {
        try {
            // Drop all existing tables to ensure clean schema
            await this.query(`DROP TABLE IF EXISTS activity_logs CASCADE`);
            await this.query(`DROP TABLE IF EXISTS messages CASCADE`);
            await this.query(`DROP TABLE IF EXISTS conversations CASCADE`);
            await this.query(`DROP TABLE IF EXISTS users CASCADE`);
            logger.info('🔄 Dropped all existing tables for clean recreation');

            await this.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100),
                    role VARCHAR(20) DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT true
                )
            `);

            await this.query(`
                CREATE TABLE conversations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT true
                )
            `);

            await this.query(`
                CREATE TABLE messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    message_type VARCHAR(20) DEFAULT 'user',
                    ai_response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB
                )
            `);

            await this.query(`
                CREATE TABLE activity_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    action VARCHAR(100) NOT NULL,
                    details JSONB,
                    ip_address INET,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes for better performance
            await this.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
            await this.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
            await this.query(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`);
            await this.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
            await this.query(`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`);
            await this.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)`);

            logger.info('✅ Database tables initialized successfully');
        } catch (error) {
            logger.error('❌ Error initializing database tables:', error);
            throw error;
        }
    }

    // Create default admin user
    static async createAdminUser() {
        try {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            const result = await this.query(
                `INSERT INTO users (username, email, password_hash, full_name, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (username) DO NOTHING 
                 RETURNING id`,
                ['admin', 'admin@hcmchatbot.com', hashedPassword, 'System Administrator', 'admin']
            );

            if (result.rows.length > 0) {
                logger.info('✅ Default admin user created successfully');
            } else {
                logger.info('ℹ️  Admin user already exists');
            }
        } catch (error) {
            logger.error('❌ Error creating admin user:', error);
        }
    }

    // Test database connection
    static async testConnection() {
        try {
            const result = await this.query('SELECT NOW() as current_time, version() as pg_version');
            logger.info('✅ Database connection test successful:', {
                time: result.rows[0].current_time,
                version: result.rows[0].pg_version.split(' ')[0]
            });
            return true;
        } catch (error) {
            logger.error('❌ Database connection test failed:', error);
            return false;
        }
    }
}

module.exports = { Database, pool };
