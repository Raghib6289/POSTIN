-- ============================================================================
-- 🐘 Neon PostgreSQL Database Schema for Instagram Caption Agent SaaS
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    stripe_customer_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'free',
    credits_remaining INT DEFAULT 10, -- 10 free generations on sign up
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Posts & Drafts Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'casual',
    captions JSONB DEFAULT '[]'::jsonb,
    hashtags JSONB DEFAULT '{}'::jsonb,
    visual_prompt TEXT DEFAULT '',
    alt_text TEXT DEFAULT '',
    audience_schedule JSONB DEFAULT '{}'::jsonb,
    qa_feedback JSONB DEFAULT '{}'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user draft retrieval
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
