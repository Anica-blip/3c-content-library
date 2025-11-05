-- 3C Public Library - Enhanced Supabase Schema
-- Proper relational structure with folders and content as separate tables

-- ==================== FOLDERS TABLE ====================
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  table_name TEXT, -- Logical grouping name (e.g., 'anica_chats')
  description TEXT,
  is_public BOOLEAN DEFAULT true, -- true = content_public, false = content_private
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_folders_slug ON folders(slug);
CREATE INDEX IF NOT EXISTS idx_folders_table_name ON folders(table_name);
CREATE INDEX IF NOT EXISTS idx_folders_visibility ON folders(is_public);

-- ==================== CONTENT TABLES ====================
-- Two separate tables: public (anyone) and private (auth required)

-- PUBLIC CONTENT (no authentication required)
CREATE TABLE IF NOT EXISTS content_public (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    table_name TEXT, -- Logical grouping name (e.g., 'anica_chats')
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'image', 'audio', 'link')),
    url TEXT, -- Primary content URL (R2, external, or base64)
    external_url TEXT, -- Additional external reference URL
    thumbnail_url TEXT,
    description TEXT,
    file_size BIGINT,
    metadata JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_page INTEGER, -- For PDFs, track last viewed page
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_public_folder ON content_public(folder_id);
CREATE INDEX idx_content_public_table ON content_public(table_name);
CREATE INDEX idx_content_public_type ON content_public(type);
CREATE INDEX idx_content_public_order ON content_public(folder_id, display_order);

-- PRIVATE CONTENT (authentication required - for courses, premium content)
CREATE TABLE IF NOT EXISTS content_private (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    table_name TEXT, -- Logical grouping name
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'image', 'audio', 'link')),
    url TEXT,
    external_url TEXT,
    thumbnail_url TEXT,
    description TEXT,
    file_size BIGINT,
    metadata JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_page INTEGER,
    access_level TEXT DEFAULT 'basic', -- 'basic', 'premium', 'course_specific'
    password_hash TEXT, -- For simple password protection
    allowed_users UUID[], -- Array of user IDs who can access
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_private_folder ON content_private(folder_id);
CREATE INDEX idx_content_private_table ON content_private(table_name);
CREATE INDEX idx_content_private_type ON content_private(type);
CREATE INDEX idx_content_private_order ON content_private(folder_id, display_order);
CREATE INDEX idx_content_private_access ON content_private(access_level);

-- ==================== USER INTERACTIONS TABLE ====================
-- Track user interactions for analytics (works with both public and private content)
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL, -- ID from either content_public or content_private
  content_table TEXT NOT NULL, -- 'public' or 'private' to identify source table
  interaction_type TEXT NOT NULL, -- view, download, share
  last_page INTEGER, -- For PDFs
  duration INTEGER, -- Time spent in seconds
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_content ON user_interactions(content_id, content_table);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON user_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type);

-- ==================== TRIGGERS ====================

-- Auto-update folder item count
CREATE OR REPLACE FUNCTION update_folder_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE folders SET item_count = item_count + 1, updated_at = NOW()
    WHERE id = NEW.folder_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE folders SET item_count = item_count - 1, updated_at = NOW()
    WHERE id = OLD.folder_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.folder_id != NEW.folder_id THEN
    UPDATE folders SET item_count = item_count - 1, updated_at = NOW()
    WHERE id = OLD.folder_id;
    UPDATE folders SET item_count = item_count + 1, updated_at = NOW()
    WHERE id = NEW.folder_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for both public and private content tables
CREATE TRIGGER trigger_update_folder_item_count_public
AFTER INSERT OR DELETE OR UPDATE ON content_public
FOR EACH ROW
EXECUTE FUNCTION update_folder_item_count();

CREATE TRIGGER trigger_update_folder_item_count_private
AFTER INSERT OR DELETE OR UPDATE ON content_private
FOR EACH ROW
EXECUTE FUNCTION update_folder_item_count();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_folders_updated_at
BEFORE UPDATE ON folders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_public_updated_at
BEFORE UPDATE ON content_public
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_private_updated_at
BEFORE UPDATE ON content_private
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Public read access for folders and public content
CREATE POLICY "Public read access for folders"
ON folders FOR SELECT
USING (true);

CREATE POLICY "Public read access for public content"
ON content_public FOR SELECT
USING (true);

-- Private content requires authentication (to be implemented later)
CREATE POLICY "Authenticated read access for private content"
ON content_private FOR SELECT
USING (auth.role() = 'authenticated' OR true); -- Change 'true' to enforce auth later

-- Admin write access (for now, allow all - you can add auth later)
CREATE POLICY "Admin full access for folders"
ON folders FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin full access for public content"
ON content_public FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admin full access for private content"
ON content_private FOR ALL
USING (true)
WITH CHECK (true);

-- Allow anyone to log interactions
CREATE POLICY "Public insert for interactions"
ON user_interactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public read for interactions"
ON user_interactions FOR SELECT
USING (true);

-- ==================== HELPER FUNCTIONS ====================

-- Function to generate unique slug from title
CREATE OR REPLACE FUNCTION generate_slug(title_text TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(title_text, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and increment
  WHILE EXISTS (SELECT 1 FROM folders WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || LPAD(counter::TEXT, 2, '0');
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(content_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE content 
  SET view_count = view_count + 1, 
      last_viewed_at = NOW()
  WHERE id = content_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update last page for PDF
CREATE OR REPLACE FUNCTION update_last_page(content_uuid UUID, page_num INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE content 
  SET last_page = page_num,
      last_viewed_at = NOW()
  WHERE id = content_uuid;
END;
$$ LANGUAGE plpgsql;

-- ==================== SAMPLE DATA (OPTIONAL) ====================
-- Uncomment to insert sample data for testing

-- INSERT INTO folders (title, slug, description) VALUES
-- ('Getting Started', 'getting-started', 'Introduction and setup guides'),
-- ('Tutorials', 'tutorials', 'Step-by-step tutorials'),
-- ('Reference', 'reference', 'Reference documentation');

-- INSERT INTO content (folder_id, title, type, url, description) VALUES
-- ((SELECT id FROM folders WHERE slug = 'getting-started'), 'Welcome Guide', 'pdf', 'https://files.3c-public-library.org/sample.pdf', 'Welcome to 3C Library'),
-- ((SELECT id FROM folders WHERE slug = 'tutorials'), 'First Steps', 'video', 'https://youtube.com/watch?v=example', 'Getting started video');

-- ==================== MIGRATION FROM OLD SCHEMA ====================
-- If you have existing data in library_backups table, use this to migrate

-- CREATE OR REPLACE FUNCTION migrate_from_library_backups()
-- RETURNS VOID AS $$
-- DECLARE
--   backup_data JSONB;
--   folder_record JSONB;
--   content_record JSONB;
--   new_folder_id UUID;
-- BEGIN
--   -- Get the latest backup
--   SELECT data INTO backup_data FROM library_backups ORDER BY updated_at DESC LIMIT 1;
--   
--   -- Migrate folders
--   FOR folder_record IN SELECT * FROM jsonb_array_elements(backup_data->'folders')
--   LOOP
--     INSERT INTO folders (id, title, slug, description, created_at)
--     VALUES (
--       (folder_record->>'id')::UUID,
--       folder_record->>'name',
--       generate_slug(folder_record->>'name'),
--       folder_record->>'description',
--       (folder_record->>'created')::TIMESTAMP
--     )
--     ON CONFLICT (id) DO NOTHING;
--   END LOOP;
--   
--   -- Migrate content
--   FOR content_record IN SELECT * FROM jsonb_array_elements(backup_data->'content')
--   LOOP
--     INSERT INTO content (id, folder_id, title, type, url, thumbnail_url, description, order_index, created_at)
--     VALUES (
--       (content_record->>'id')::UUID,
--       (content_record->>'folderId')::UUID,
--       content_record->>'title',
--       content_record->>'type',
--       content_record->>'url',
--       content_record->>'thumbnail',
--       content_record->>'description',
--       (content_record->>'order')::INTEGER,
--       (content_record->>'created')::TIMESTAMP
--     )
--     ON CONFLICT (id) DO NOTHING;
--   END LOOP;
-- END;
-- $$ LANGUAGE plpgsql;

-- To run migration: SELECT migrate_from_library_backups();

-- ==================== VIEWS FOR EASY QUERYING ====================

-- View: Folders with content count
CREATE OR REPLACE VIEW folders_with_stats AS
SELECT 
  f.*,
  COUNT(c.id) as actual_item_count,
  MAX(c.updated_at) as last_content_update
FROM folders f
LEFT JOIN content c ON f.id = c.folder_id
GROUP BY f.id;

-- View: Content with folder info
CREATE OR REPLACE VIEW content_with_folder AS
SELECT 
  c.*,
  f.title as folder_title,
  f.slug as folder_slug
FROM content c
JOIN folders f ON c.folder_id = f.id;

-- View: Popular content
CREATE OR REPLACE VIEW popular_content AS
SELECT 
  c.*,
  f.title as folder_title,
  f.slug as folder_slug
FROM content c
JOIN folders f ON c.folder_id = f.id
ORDER BY c.view_count DESC, c.last_viewed_at DESC
LIMIT 50;

-- ==================== DONE ====================
-- Schema created successfully!
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Update admin.html to use new schema
-- 3. Update library.html to read from new tables
