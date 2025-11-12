-- ==================== FIX URLs AND FOLDER STRUCTURE ====================
-- This migration adds:
-- 1. Custom URL field for folders and content
-- 2. Root folder type (root vs sub_root)
-- 3. Better slug generation
-- 4. Performance indexes

-- ==================== ADD CUSTOM URL FIELDS ====================

-- Add custom_url to folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS custom_url TEXT UNIQUE;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS folder_type TEXT DEFAULT 'root' CHECK (folder_type IN ('root', 'sub_root'));

-- Add custom_url to content tables
ALTER TABLE content_public ADD COLUMN IF NOT EXISTS custom_url TEXT;
ALTER TABLE content_private ADD COLUMN IF NOT EXISTS custom_url TEXT;

-- Create indexes for custom URLs
CREATE INDEX IF NOT EXISTS idx_folders_custom_url ON folders(custom_url) WHERE custom_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_public_custom_url ON content_public(custom_url) WHERE custom_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_private_custom_url ON content_private(custom_url) WHERE custom_url IS NOT NULL;

-- ==================== UPDATE SLUG GENERATION FUNCTIONS ====================

-- Updated function to generate unique FOLDER slug with custom URL support
CREATE OR REPLACE FUNCTION generate_folder_slug(
  title_text TEXT,
  parent_folder_id UUID DEFAULT NULL,
  custom_slug TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  parent_slug TEXT;
BEGIN
  -- If custom slug provided, validate and use it
  IF custom_slug IS NOT NULL AND custom_slug != '' THEN
    base_slug := lower(regexp_replace(custom_slug, '[^a-zA-Z0-9_-]', '', 'g'));
    base_slug := regexp_replace(base_slug, '_', '-', 'g');
    
    -- Check if custom slug is unique
    IF NOT EXISTS (SELECT 1 FROM folders WHERE slug = base_slug OR custom_url = base_slug) THEN
      RETURN base_slug;
    ELSE
      RAISE EXCEPTION 'Custom URL "%" already exists', base_slug;
    END IF;
  END IF;
  
  -- Auto-generate slug from title
  base_slug := lower(regexp_replace(title_text, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- If this is a sub-folder, get parent slug and prepend
  IF parent_folder_id IS NOT NULL THEN
    SELECT COALESCE(custom_url, slug) INTO parent_slug FROM folders WHERE id = parent_folder_id;
    IF parent_slug IS NOT NULL THEN
      -- For sub-folders: parent_sub.01, parent_sub.02, etc.
      final_slug := parent_slug || '_sub.' || LPAD(counter::TEXT, 2, '0');
      
      WHILE EXISTS (SELECT 1 FROM folders WHERE slug = final_slug OR custom_url = final_slug) LOOP
        counter := counter + 1;
        final_slug := parent_slug || '_sub.' || LPAD(counter::TEXT, 2, '0');
      END LOOP;
      
      RETURN final_slug;
    END IF;
  END IF;
  
  -- For root folders: just use base slug
  final_slug := base_slug;
  
  -- Check if slug exists and increment
  WHILE EXISTS (SELECT 1 FROM folders WHERE slug = final_slug OR custom_url = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || LPAD(counter::TEXT, 2, '0');
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Updated function to generate unique CONTENT slug with custom URL support
CREATE OR REPLACE FUNCTION generate_content_slug_v2(
  content_title TEXT,
  folder_uuid UUID,
  custom_slug TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  content_table TEXT;
  folder_is_public BOOLEAN;
  folder_slug TEXT;
  folder_custom_url TEXT;
BEGIN
  -- If custom slug provided, validate and use it
  IF custom_slug IS NOT NULL AND custom_slug != '' THEN
    base_slug := lower(regexp_replace(custom_slug, '[^a-zA-Z0-9_.-]', '', 'g'));
    
    -- Get folder visibility to determine which table to check
    SELECT is_public, COALESCE(custom_url, slug) INTO folder_is_public, folder_slug FROM folders WHERE id = folder_uuid;
    content_table := CASE WHEN folder_is_public THEN 'content_public' ELSE 'content_private' END;
    
    -- Check if custom slug is unique within folder
    IF (folder_is_public AND NOT EXISTS (
      SELECT 1 FROM content_public WHERE (slug = base_slug OR custom_url = base_slug) AND folder_id = folder_uuid
    )) OR (NOT folder_is_public AND NOT EXISTS (
      SELECT 1 FROM content_private WHERE (slug = base_slug OR custom_url = base_slug) AND folder_id = folder_uuid
    )) THEN
      RETURN base_slug;
    ELSE
      RAISE EXCEPTION 'Custom URL "%" already exists in this folder', base_slug;
    END IF;
  END IF;
  
  -- Get folder info
  SELECT is_public, COALESCE(custom_url, slug) INTO folder_is_public, folder_slug FROM folders WHERE id = folder_uuid;
  content_table := CASE WHEN folder_is_public THEN 'content_public' ELSE 'content_private' END;
  
  -- Use folder slug as base (e.g., "aurion_goal" or "aurion_goal_sub.01")
  base_slug := folder_slug;
  
  -- Generate content slug: folder_slug_content.01, folder_slug_content.02, etc.
  final_slug := base_slug || '_content.' || LPAD(counter::TEXT, 2, '0');
  
  -- Check if slug exists in the appropriate content table
  WHILE (
    (folder_is_public AND EXISTS (
      SELECT 1 FROM content_public WHERE (slug = final_slug OR custom_url = final_slug) AND folder_id = folder_uuid
    ))
    OR
    (NOT folder_is_public AND EXISTS (
      SELECT 1 FROM content_private WHERE (slug = final_slug OR custom_url = final_slug) AND folder_id = folder_uuid
    ))
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '_content.' || LPAD(counter::TEXT, 2, '0');
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ==================== UPDATE EXISTING FUNCTIONS ====================

-- Update the old generate_slug function to use new logic
CREATE OR REPLACE FUNCTION generate_slug(title_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN generate_folder_slug(title_text, NULL, NULL);
END;
$$ LANGUAGE plpgsql;

-- Update the old generate_content_slug function
CREATE OR REPLACE FUNCTION generate_content_slug(
  content_title TEXT,
  folder_uuid UUID,
  table_short_name TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN generate_content_slug_v2(content_title, folder_uuid, NULL);
END;
$$ LANGUAGE plpgsql;

-- ==================== HELPER FUNCTIONS ====================

-- Function to get content by custom URL or slug
CREATE OR REPLACE FUNCTION get_content_by_url(url_slug TEXT)
RETURNS TABLE (
  id UUID,
  folder_id UUID,
  title TEXT,
  type TEXT,
  url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  is_public BOOLEAN
) AS $$
BEGIN
  -- Try public content first
  RETURN QUERY
  SELECT 
    c.id, c.folder_id, c.title, c.type, c.url, c.thumbnail_url, c.description, true as is_public
  FROM content_public c
  WHERE c.custom_url = url_slug OR c.slug = url_slug
  LIMIT 1;
  
  -- If not found, try private content
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      c.id, c.folder_id, c.title, c.type, c.url, c.thumbnail_url, c.description, false as is_public
    FROM content_private c
    WHERE c.custom_url = url_slug OR c.slug = url_slug
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get folder by custom URL or slug
CREATE OR REPLACE FUNCTION get_folder_by_url(url_slug TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  custom_url TEXT,
  description TEXT,
  is_public BOOLEAN,
  folder_type TEXT,
  parent_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.title, f.slug, f.custom_url, f.description, f.is_public, f.folder_type, f.parent_id
  FROM folders f
  WHERE f.custom_url = url_slug OR f.slug = url_slug
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ==================== PERFORMANCE OPTIMIZATIONS ====================

-- Add materialized view for faster folder loading with stats
CREATE MATERIALIZED VIEW IF NOT EXISTS folders_stats_cache AS
SELECT 
  f.id,
  f.title,
  f.slug,
  f.custom_url,
  f.description,
  f.is_public,
  f.folder_type,
  f.parent_id,
  f.depth,
  f.path,
  f.created_at,
  f.updated_at,
  COALESCE(pub.count, 0) + COALESCE(priv.count, 0) as item_count,
  GREATEST(pub.last_update, priv.last_update, f.updated_at) as last_update
FROM folders f
LEFT JOIN (
  SELECT folder_id, COUNT(*) as count, MAX(updated_at) as last_update
  FROM content_public
  GROUP BY folder_id
) pub ON f.id = pub.folder_id
LEFT JOIN (
  SELECT folder_id, COUNT(*) as count, MAX(updated_at) as last_update
  FROM content_private
  GROUP BY folder_id
) priv ON f.id = priv.folder_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_stats_cache_id ON folders_stats_cache(id);
CREATE INDEX IF NOT EXISTS idx_folders_stats_cache_parent ON folders_stats_cache(parent_id);

-- Function to refresh the cache
CREATE OR REPLACE FUNCTION refresh_folders_cache()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY folders_stats_cache;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-refresh cache when folders or content change
CREATE OR REPLACE FUNCTION trigger_refresh_folders_cache()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_folders_cache();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Uncomment these triggers if you want auto-refresh (may impact performance on large datasets)
-- CREATE TRIGGER trigger_folders_cache_refresh
-- AFTER INSERT OR UPDATE OR DELETE ON folders
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION trigger_refresh_folders_cache();

-- ==================== MIGRATION SCRIPT ====================

-- Update existing folders to set folder_type based on parent_id
UPDATE folders 
SET folder_type = CASE 
  WHEN parent_id IS NULL THEN 'root'
  ELSE 'sub_root'
END
WHERE folder_type IS NULL OR folder_type = 'root';

-- Generate custom URLs for existing folders (optional - you can set these manually)
-- This will create URLs like: aurion_goal, aurion_goal_sub.01, etc.
UPDATE folders
SET custom_url = slug
WHERE custom_url IS NULL;

-- ==================== DONE ====================
-- Migration complete!
-- 
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Update admin panel to include custom URL input fields
-- 3. Update library.html to use custom URLs instead of UUIDs
-- 4. Manually refresh the cache: SELECT refresh_folders_cache();
