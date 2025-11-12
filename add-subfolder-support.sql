-- Add Sub-folder Support to 3C Library
-- This migration adds parent_id to folders table to enable nested folder structure

-- ==================== ADD PARENT_ID COLUMN ====================
-- Add parent_id column to folders table
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES folders(id) ON DELETE CASCADE;

-- Add index for faster parent lookups
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- ==================== ADD DEPTH COLUMN ====================
-- Track folder depth for easier queries (0 = root, 1 = first level, etc.)
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- Add index for depth queries
CREATE INDEX IF NOT EXISTS idx_folders_depth ON folders(depth);

-- ==================== ADD PATH COLUMN ====================
-- Store full path for breadcrumb navigation (e.g., 'parent-slug/child-slug')
ALTER TABLE folders 
ADD COLUMN IF NOT EXISTS path TEXT;

-- Add index for path queries
CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);

-- ==================== HELPER FUNCTIONS ====================

-- Function to get folder path
CREATE OR REPLACE FUNCTION get_folder_path(folder_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  folder_record RECORD;
  path_parts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Start from the given folder and walk up to root
  FOR folder_record IN
    WITH RECURSIVE folder_tree AS (
      -- Base case: start with the given folder
      SELECT id, slug, parent_id, 0 as level
      FROM folders
      WHERE id = folder_uuid
      
      UNION ALL
      
      -- Recursive case: get parent folders
      SELECT f.id, f.slug, f.parent_id, ft.level + 1
      FROM folders f
      INNER JOIN folder_tree ft ON f.id = ft.parent_id
    )
    SELECT slug FROM folder_tree ORDER BY level DESC
  LOOP
    path_parts := array_append(path_parts, folder_record.slug);
  END LOOP;
  
  RETURN array_to_string(path_parts, '/');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate folder depth
CREATE OR REPLACE FUNCTION get_folder_depth(folder_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  depth_count INTEGER := 0;
  current_parent UUID;
BEGIN
  SELECT parent_id INTO current_parent FROM folders WHERE id = folder_uuid;
  
  WHILE current_parent IS NOT NULL LOOP
    depth_count := depth_count + 1;
    SELECT parent_id INTO current_parent FROM folders WHERE id = current_parent;
  END LOOP;
  
  RETURN depth_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== TRIGGER TO AUTO-UPDATE PATH AND DEPTH ====================

CREATE OR REPLACE FUNCTION update_folder_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Update depth
  NEW.depth := get_folder_depth(NEW.id);
  
  -- Update path
  NEW.path := get_folder_path(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_folder_hierarchy ON folders;
CREATE TRIGGER trigger_update_folder_hierarchy
BEFORE INSERT OR UPDATE ON folders
FOR EACH ROW
EXECUTE FUNCTION update_folder_hierarchy();

-- ==================== VIEWS FOR EASIER QUERIES ====================

-- View: Folders with parent information
CREATE OR REPLACE VIEW folders_with_parent AS
SELECT 
  f.*,
  p.title as parent_title,
  p.slug as parent_slug,
  p.path as parent_path
FROM folders f
LEFT JOIN folders p ON f.parent_id = p.id;

-- View: Root folders only (no parent)
CREATE OR REPLACE VIEW root_folders AS
SELECT * FROM folders WHERE parent_id IS NULL ORDER BY created_at DESC;

-- View: Folder tree (hierarchical structure)
CREATE OR REPLACE VIEW folder_tree AS
WITH RECURSIVE tree AS (
  -- Root folders
  SELECT 
    id, 
    title, 
    slug, 
    parent_id, 
    depth,
    path,
    ARRAY[id] as ancestors,
    title as full_path
  FROM folders 
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Child folders
  SELECT 
    f.id,
    f.title,
    f.slug,
    f.parent_id,
    f.depth,
    f.path,
    tree.ancestors || f.id,
    tree.full_path || ' > ' || f.title
  FROM folders f
  INNER JOIN tree ON f.parent_id = tree.id
)
SELECT * FROM tree ORDER BY full_path;

-- ==================== UPDATE EXISTING FOLDERS ====================

-- Update existing folders to have correct depth and path
UPDATE folders 
SET 
  depth = 0,
  path = slug
WHERE parent_id IS NULL;

-- ==================== COMMENTS ====================

COMMENT ON COLUMN folders.parent_id IS 'Parent folder ID for nested folder structure. NULL = root folder';
COMMENT ON COLUMN folders.depth IS 'Folder depth in hierarchy. 0 = root, 1 = first level, etc.';
COMMENT ON COLUMN folders.path IS 'Full path from root to this folder (e.g., parent-slug/child-slug)';

-- ==================== EXAMPLE USAGE ====================

/*
-- Create a root folder
INSERT INTO folders (title, slug, table_name, is_public)
VALUES ('Anica Coffee Break Chats', 'anica-coffee-break-chats', 'anica_chats', true);

-- Create a sub-folder
INSERT INTO folders (title, slug, table_name, is_public, parent_id)
VALUES (
  'Season 1', 
  'season-1', 
  'anica_chats', 
  true, 
  (SELECT id FROM folders WHERE slug = 'anica-coffee-break-chats')
);

-- Create a sub-sub-folder
INSERT INTO folders (title, slug, table_name, is_public, parent_id)
VALUES (
  'Episode 1-10', 
  'episode-1-10', 
  'anica_chats', 
  true, 
  (SELECT id FROM folders WHERE slug = 'season-1')
);

-- Query all root folders
SELECT * FROM root_folders;

-- Query children of a specific folder
SELECT * FROM folders WHERE parent_id = (SELECT id FROM folders WHERE slug = 'anica-coffee-break-chats');

-- Query entire folder tree
SELECT * FROM folder_tree;

-- Get folder with parent info
SELECT * FROM folders_with_parent WHERE slug = 'season-1';
*/
