# HCM Chatbot Database Documentation

## Overview
Complete PostgreSQL database schema for HCM Chatbot with user management, chat functionality, admin panel, and analytics.

## Key Features
- ✅ User authentication & authorization
- ✅ Multi-role system (User, Admin, Super Admin)
- ✅ Conversation & message management
- ✅ RAG knowledge base with vector search
- ✅ Admin analytics & user management
- ✅ Activity tracking & audit logs
- ✅ Notification system
- ✅ GDPR compliance features

## Database Tables

### 👥 Users & Authentication
- **users** - Main user accounts with roles & subscription info
- **user_profiles** - Extended user preferences & settings
- **user_consents** - GDPR consent tracking

### 💬 Chat System
- **conversations** - Chat conversations between users and AI
- **messages** - Individual messages with AI metadata
- **message_attachments** - File attachments (future use)
- **message_feedback** - User ratings for AI responses

### 📚 Knowledge Base (RAG)
- **knowledge_documents** - Documents with vector embeddings
- **document_citations** - Track which docs were used in responses

### 📊 Admin & Analytics
- **user_activities** - Track all user actions
- **daily_stats** - Daily aggregated statistics
- **admin_logs** - Admin action audit trail
- **system_settings** - Configurable system parameters

### 🔔 Notifications
- **notifications** - User notifications system
- **data_retention_logs** - Data cleanup audit trail

## Admin Dashboard Data

### User Statistics
```sql
-- Total registered users
SELECT COUNT(*) as total_users FROM users;

-- New users this week
SELECT COUNT(*) as new_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- Active users today
SELECT COUNT(DISTINCT user_id) as active_today
FROM user_activities
WHERE created_at >= CURRENT_DATE;
```

### Chat Analytics
```sql
-- Total conversations
SELECT COUNT(*) as total_conversations FROM conversations;

-- Messages per day (last 30 days)
SELECT
    DATE(created_at) as date,
    COUNT(*) as message_count
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Average confidence score
SELECT AVG(confidence_score) as avg_confidence
FROM messages
WHERE confidence_score IS NOT NULL;
```

## Default Admin Account
- **Username**: admin
- **Email**: admin@hcmchatbot.com
- **Password**: admin123 (⚠️ CHANGE IMMEDIATELY!)
- **Role**: super_admin

## Required PostgreSQL Extensions
- **uuid-ossp** - UUID generation
- **pgcrypto** - Password hashing
- **vector** - Vector similarity search for RAG

## Performance Indexes
- Vector similarity search on knowledge_documents
- User lookup optimization
- Chat message queries
- Activity tracking queries
- Admin dashboard aggregations

## Security Features
- Password hashing with bcrypt
- Role-based access control
- Activity logging
- IP address tracking
- Session management
- Data retention policies