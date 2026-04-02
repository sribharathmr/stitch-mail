-- ══════════════════════════════════════════════════════════════
-- Stitch Mail — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  google_tokens JSONB DEFAULT '{}',
  avatar TEXT DEFAULT '',
  signature JSONB DEFAULT '{"text": "", "name": "", "title": ""}',
  preferences JSONB DEFAULT '{"theme": "light", "smartNotifications": true, "threadGrouping": false, "compactView": true}',
  imap_config JSONB DEFAULT '{}',
  smtp_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Emails ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id TEXT DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'inbox' CHECK (folder IN ('inbox', 'sent', 'drafts', 'spam', 'trash', 'archive', 'starred')),
  from_address JSONB NOT NULL DEFAULT '{"name": "", "address": ""}',
  to_addresses JSONB DEFAULT '[]',
  cc JSONB DEFAULT '[]',
  bcc JSONB DEFAULT '[]',
  subject TEXT DEFAULT '(No Subject)',
  body_html TEXT DEFAULT '',
  body_text TEXT DEFAULT '',
  attachments JSONB DEFAULT '[]',
  labels TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  thread_id TEXT DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_user_folder ON emails(user_id, folder, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_user_starred ON emails(user_id, is_starred);
CREATE INDEX IF NOT EXISTS idx_emails_user_thread ON emails(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_read ON emails(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(user_id, message_id);

-- Full text search
ALTER TABLE emails ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(body_text, ''))
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_emails_fts ON emails USING gin(fts);

-- ─── Threads ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT DEFAULT '',
  participants JSONB DEFAULT '[]',
  email_ids UUID[] DEFAULT '{}',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id, last_activity DESC);

-- ─── Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_emails_updated_at BEFORE UPDATE ON emails FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_threads_updated_at BEFORE UPDATE ON threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
