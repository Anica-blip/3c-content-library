-- ==================== MIGRATION: ADD SLUG SUPPORT ====================
-- Run this if you already have a database and need to add slug columns
-- If you're starting fresh, just run supabase-schema.sql instead

-- ==================== STEP 1: ADD SLUG COLUMNS ====================

-- Add slug column to content_public (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_public' AND column_name = 'slug'
    ) THEN
        ALTER TABLE content_public ADD COLUMN slug TEXT;
        CREATE INDEX idx_content_public_slug ON content_public(slug);
    END IF;
END $$;

-- Add slug column to content_private (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'content_private' AND column_name = 'slug'
    ) THEN
        ALTER TABLE content_private ADD COLUMN slug TEXT;
        CREATE INDEX idx_content_private_slug ON content_private(slug);
    END IF;
END $$;

-- ==================== STEP 2: CREATE/UPDATE FUNCTIONS ====================

-- Function to generate unique FOLDER slug from title
-- Example: "Anica Coffee Break Chats" → "anica-coffee-break-chats"
-- If duplicate: "anica-coffee-break-chats-02", "anica-coffee-break-chats-03"
CREATE OR REPLACE FUNCTION generate_slug(title_text TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 2;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(title_text, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and increment (starting from 02)
  WHILE EXISTS (SELECT 1 FROM folders WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || LPAD(counter::TEXT, 2, '0');
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique CONTENT slug within a folder
-- Example: "Episode 1" in folder "anica-chats" → "anica-chats-01"
-- Uses table_name (short version) instead of full folder slug
CREATE OR REPLACE FUNCTION generate_content_slug(
  content_title TEXT,
  folder_uuid UUID,
  table_short_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  content_table TEXT;
  folder_is_public BOOLEAN;
BEGIN
  -- Get folder visibility to determine which table to check
  SELECT is_public INTO folder_is_public FROM folders WHERE id = folder_uuid;
  content_table := CASE WHEN folder_is_public THEN 'content_public' ELSE 'content_private' END;
  
  -- Use table_name as base (e.g., "anica_chats" → "anica-chats")
  base_slug := lower(regexp_replace(table_short_name, '_', '-', 'g'));
  
  -- Start with -01, -02, etc.
  final_slug := base_slug || '-' || LPAD(counter::TEXT, 2, '0');
  
  -- Check if slug exists in the appropriate content table
  WHILE (
    (folder_is_public AND EXISTS (
      SELECT 1 FROM content_public WHERE slug = final_slug AND folder_id = folder_uuid
    ))
    OR
    (NOT folder_is_public AND EXISTS (
      SELECT 1 FROM content_private WHERE slug = final_slug AND folder_id = folder_uuid
    ))
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || LPAD(counter::TEXT, 2, '0');
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ==================== STEP 3: POPULATE SLUGS FOR EXISTING DATA ====================

-- Update folder slugs (if they don't have one)
UPDATE folders 
SET slug = generate_slug(title)
WHERE slug IS NULL OR slug = '';

-- Update content_public slugs (if they don't have one)
UPDATE content_public c
SET slug = generate_content_slug(c.title, c.folder_id, c.table_name)
WHERE (slug IS NULL OR slug = '') AND table_name IS NOT NULL;

-- Update content_private slugs (if they don't have one)
UPDATE content_private c
SET slug = generate_content_slug(c.title, c.folder_id, c.table_name)
WHERE (slug IS NULL OR slug = '') AND table_name IS NOT NULL;

-- ==================== STEP 4: VERIFY ====================

-- Check folder slugs
SELECT 
    'Folder Slugs' as check_type,
    COUNT(*) as total_folders,
    COUNT(slug) as folders_with_slugs,
    COUNT(*) - COUNT(slug) as folders_missing_slugs
FROM folders;

-- Check content_public slugs
SELECT 
    'Public Content Slugs' as check_type,
    COUNT(*) as total_content,
    COUNT(slug) as content_with_slugs,
    COUNT(*) - COUNT(slug) as content_missing_slugs
FROM content_public;

-- Check content_private slugs
SELECT 
    'Private Content Slugs' as check_type,
    COUNT(*) as total_content,
    COUNT(slug) as content_with_slugs,
    COUNT(*) - COUNT(slug) as content_missing_slugs
FROM content_private;

-- Show sample folder slugs
SELECT 
    'Sample Folder Slugs' as info,
    title,
    slug,
    table_name
FROM folders
LIMIT 5;

-- Show sample content slugs
SELECT 
    'Sample Content Slugs' as info,
    c.title,
    c.slug,
    c.table_name,
    f.title as folder_title
FROM content_public c
JOIN folders f ON c.folder_id = f.id
LIMIT 5;

-- ==================== DONE ====================
-- Migration complete!
-- All folders and content should now have slugs
-- New content will automatically get slugs via supabase-client.js
