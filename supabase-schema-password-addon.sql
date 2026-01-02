-- ==================== PASSWORD MANAGEMENT ADDON ====================
-- Add these to your existing Supabase schema
-- Run this ONLY if you haven't already added these fields/tables

-- 1. Add parent_id and depth to folders table (if not exists)
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- 2. Create folder_passwords table for password-protected private folder sharing
CREATE TABLE IF NOT EXISTS folder_passwords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_plain TEXT,
  user_identifier TEXT,
  access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_folder_passwords_folder ON folder_passwords(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_passwords_active ON folder_passwords(is_active);

-- 3. Enable RLS for folder_passwords
ALTER TABLE folder_passwords ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policies for folder_passwords
CREATE POLICY "Admin full access for folder passwords"
ON folder_passwords FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Public read active folder passwords"
ON folder_passwords FOR SELECT
USING (is_active = true);
