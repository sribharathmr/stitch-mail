-- ══════════════════════════════════════════════════════════════
-- Stitch Mail — Tree View Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- Add tree_org_override column for drag-drop reassignment
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tree_org_override TEXT DEFAULT '';

-- Index for efficient domain-based queries
CREATE INDEX IF NOT EXISTS idx_emails_from_domain 
  ON emails USING btree ((from_address->>'address'));

-- Index for tree override queries
CREATE INDEX IF NOT EXISTS idx_emails_tree_override
  ON emails(user_id, tree_org_override) WHERE tree_org_override != '';
