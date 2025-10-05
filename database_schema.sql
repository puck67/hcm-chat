-- HCM Chatbot Database Schema
-- PostgreSQL 17 Optimized

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid()

-- =============================================
-- USERS TABLE
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,

    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status VARCHAR(20) DEFAULT 'enable' CHECK (status IN ('enable', 'disable')),

    -- Counters for admin dashboard
    total_messages INTEGER DEFAULT 0 CHECK (total_messages >= 0),
    total_conversations INTEGER DEFAULT 0 CHECK (total_conversations >= 0),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
) WITH (fillfactor = 90); -- Leave space for updates

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message_count INTEGER DEFAULT 0 CHECK (message_count >= 0),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_conversations_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) WITH (fillfactor = 90); -- Leave space for updates

-- =============================================
-- MESSAGES TABLE
-- =============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    content TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),

    -- AI response metadata (only for assistant messages)
    sources JSONB,
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Constraints
    CONSTRAINT fk_messages_conversation_id
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- =============================================
-- DAILY STATS TABLE (for admin dashboard)
-- =============================================

CREATE TABLE daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,

    -- User statistics
    total_users INTEGER DEFAULT 0 CHECK (total_users >= 0),
    new_users INTEGER DEFAULT 0 CHECK (new_users >= 0),
    active_users INTEGER DEFAULT 0 CHECK (active_users >= 0),

    -- Chat statistics
    total_messages INTEGER DEFAULT 0 CHECK (total_messages >= 0),
    total_conversations INTEGER DEFAULT 0 CHECK (total_conversations >= 0),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
) WITH (fillfactor = 100); -- Read-only data, no updates expected

-- =============================================
-- OPTIMIZED INDEXES FOR POSTGRESQL 17
-- =============================================

-- Users indexes (B-tree by default, optimized for PostgreSQL 17)
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role) WHERE role = 'admin'; -- Partial index
CREATE INDEX idx_users_status ON users(status) WHERE status = 'disable'; -- Partial index for disabled users only
CREATE INDEX idx_users_created_at ON users(created_at);

-- Conversations indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_user_created ON conversations(user_id, created_at DESC); -- Composite for user chat history
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- Messages indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC); -- For chat history ordering
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- JSONB index for AI sources (GIN index for JSONB)
CREATE INDEX idx_messages_sources ON messages USING GIN(sources) WHERE sources IS NOT NULL;

-- Daily stats indexes
CREATE UNIQUE INDEX idx_daily_stats_date ON daily_stats(date);
CREATE INDEX idx_daily_stats_created_at ON daily_stats(created_at DESC);

-- =============================================
-- AUTO UPDATE TIMESTAMP TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Apply triggers to tables with updated_at column
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PERFORMANCE TUNING SETTINGS
-- =============================================

-- Enable auto-vacuum for high-traffic tables
ALTER TABLE users SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE conversations SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE messages SET (autovacuum_vacuum_scale_factor = 0.05); -- More aggressive for messages

-- Set statistics targets for better query planning (reduced from 1000 to reasonable values)
ALTER TABLE users ALTER COLUMN role SET STATISTICS 100; -- Only 2 values: 'user', 'admin'
ALTER TABLE messages ALTER COLUMN role SET STATISTICS 100; -- Only 2 values: 'user', 'assistant'
ALTER TABLE conversations ALTER COLUMN user_id SET STATISTICS 200; -- Many users, needs more stats