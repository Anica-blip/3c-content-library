-- Fix folders_with_stats view to include all necessary fields
-- This fixes the issue where sub-root folders show as 'root' in the admin panel

-- Drop the old view
DROP VIEW IF EXISTS folders_with_stats CASCADE;

-- Create updated view with all fields including folder_type, depth, path
CREATE OR REPLACE VIEW folders_with_stats AS
SELECT 
  f.id,
  f.title,
  f.slug,
  f.custom_url,
  f.table_name,
  f.description,
  f.is_public,
  f.item_count,
  f.folder_type,      -- ADDED: Shows 'root' or 'sub_root'
  f.parent_id,        -- ADDED: Parent folder reference
  f.depth,            -- ADDED: Folder depth in hierarchy
  f.path,             -- ADDED: Full path for breadcrumbs
  f.created_at,
  f.updated_at,
  COALESCE(pub.count, 0) + COALESCE(priv.count, 0) as actual_item_count,
  GREATEST(pub.last_update, priv.last_update, f.updated_at) as last_content_update
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
) priv ON f.id = priv.folder_id
ORDER BY f.depth ASC, f.created_at DESC;

-- Verify the view has all fields
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'folders_with_stats' 
ORDER BY ordinal_position;

-- Test query to see folder hierarchy
SELECT 
  id,
  title,
  folder_type,
  depth,
  path,
  custom_url,
  slug,
  actual_item_count
FROM folders_with_stats
ORDER BY depth, created_at;
