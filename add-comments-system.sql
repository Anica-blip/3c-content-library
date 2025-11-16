-- Add Comments System for Content
-- This allows users to leave comments on public documents

-- ==================== COMMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL, -- ID from content_public or content_private
    content_table TEXT NOT NULL, -- 'public' or 'private' to identify source
    author_name TEXT NOT NULL, -- Name of commenter
    author_email TEXT, -- Optional email (for notifications)
    comment_text TEXT NOT NULL, -- The actual comment
    is_approved BOOLEAN DEFAULT false, -- Admin approval required
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT comments_content_table_check CHECK (content_table IN ('public', 'private'))
);

-- Indexes for performance
CREATE INDEX idx_comments_content ON comments(content_id, content_table);
CREATE INDEX idx_comments_approved ON comments(is_approved);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_comments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_timestamp
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_timestamp();

-- ==================== ROW LEVEL SECURITY ====================
-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Public can read approved comments
CREATE POLICY "Anyone can read approved comments"
    ON comments FOR SELECT
    USING (is_approved = true);

-- Anyone can insert comments (they'll need approval)
CREATE POLICY "Anyone can insert comments"
    ON comments FOR INSERT
    WITH CHECK (true);

-- Only authenticated users can update/delete (for admin panel)
CREATE POLICY "Authenticated users can update comments"
    ON comments FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete comments"
    ON comments FOR DELETE
    USING (auth.role() = 'authenticated');

-- ==================== HELPER VIEWS ====================
-- View to get comment counts per content
CREATE OR REPLACE VIEW content_comment_counts AS
SELECT 
    content_id,
    content_table,
    COUNT(*) as total_comments,
    COUNT(*) FILTER (WHERE is_approved = true) as approved_comments
FROM comments
GROUP BY content_id, content_table;

-- ==================== TEST DATA (Optional) ====================
-- Uncomment to add test comments
/*
INSERT INTO comments (content_id, content_table, author_name, comment_text, is_approved)
VALUES 
    ((SELECT id FROM content_public LIMIT 1), 'public', 'Test User', 'This is a great document!', true),
    ((SELECT id FROM content_public LIMIT 1), 'public', 'Another User', 'Very helpful, thank you!', true);
*/

-- ==================== VERIFICATION ====================
-- Check that the table was created
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'comments';
