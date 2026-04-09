-- Migration: Add classifier_corrections table for hybrid ML learning
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS classifier_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup per user
CREATE INDEX IF NOT EXISTS idx_classifier_corrections_user ON classifier_corrections(user_id);

-- Optional: Enable RLS
ALTER TABLE classifier_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own corrections"
  ON classifier_corrections
  FOR ALL
  USING (auth.uid() = user_id);
