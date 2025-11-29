-- Add thumbnail_url column to content_public and content_private tables
-- Run this in Supabase SQL Editor

-- Add to content_public
ALTER TABLE content_public 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add to content_private
ALTER TABLE content_private 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment
COMMENT ON COLUMN content_public.thumbnail_url IS 'Auto-generated screenshot URL for external links';
COMMENT ON COLUMN content_private.thumbnail_url IS 'Auto-generated screenshot URL for external links';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_public_thumbnail ON content_public(thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_content_private_thumbnail ON content_private(thumbnail_url);

-- Success message
SELECT 'Migration complete! thumbnail_url column added to both tables.' as status;
