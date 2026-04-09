-- Migration: Add Linked Accounts support
-- This adds the ability to link multiple Google/IMAP accounts to a single user.

CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'imap', -- 'google', 'outlook', 'imap'
  google_tokens JSONB DEFAULT '{}',
  imap_config JSONB DEFAULT '{}',
  smtp_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  sync_depth INTEGER DEFAULT 500,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Add account_id to emails to track which account they belong to
ALTER TABLE emails ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES linked_accounts(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER tr_linked_accounts_updated_at BEFORE UPDATE ON linked_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migrate current user settings to the new table (for existing users)
INSERT INTO linked_accounts (user_id, email, google_tokens, imap_config, smtp_config, provider)
SELECT id, email, google_tokens, imap_config, smtp_config, 
       CASE WHEN google_id IS NOT NULL THEN 'google' ELSE 'imap' END
FROM users
ON CONFLICT (user_id, email) DO NOTHING;
