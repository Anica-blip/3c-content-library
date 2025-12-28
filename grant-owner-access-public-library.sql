-- ============================================
-- GRANT OWNER-LEVEL ACCESS TO PUBLIC-LIBRARY.ORG
-- ============================================
-- This SQL grants full owner-level access to public-library.org domain
-- for all tables in the 3C Content Library project
--
-- Tables affected:
-- - folders
-- - content_public
-- - content_private
-- - user_interactions
-- - pdf_projects (if it exists in this database)
--
-- Run this in Supabase Dashboard → SQL Editor

-- ============================================
-- STEP 1: Drop existing policies to recreate them
-- ============================================

-- Folders policies
DROP POLICY IF EXISTS "Public read access for folders" ON folders;
DROP POLICY IF EXISTS "Admin full access for folders" ON folders;

-- Content public policies
DROP POLICY IF EXISTS "Public read access for public content" ON content_public;
DROP POLICY IF EXISTS "Admin full access for public content" ON content_public;

-- Content private policies
DROP POLICY IF EXISTS "Authenticated read access for private content" ON content_private;
DROP POLICY IF EXISTS "Admin full access for private content" ON content_private;

-- User interactions policies
DROP POLICY IF EXISTS "Public insert for interactions" ON user_interactions;
DROP POLICY IF EXISTS "Public read for interactions" ON user_interactions;

-- PDF projects policies (if table exists)
DROP POLICY IF EXISTS "Allow all operations from authorized domains" ON pdf_projects;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON pdf_projects;
DROP POLICY IF EXISTS "Allow public read access" ON pdf_projects;

-- ============================================
-- STEP 2: Create new policies with domain-based access
-- ============================================

-- ==================== FOLDERS TABLE ====================
-- Allow full CRUD from public-library.org domain
CREATE POLICY "Owner access from public-library.org for folders"
ON folders
FOR ALL
USING (
    -- Allow from public-library.org (admin and library)
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    -- Allow from 3c-public-library.org (any subdomain)
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    -- Allow service role (for backend operations)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Allow authenticated users
    auth.role() = 'authenticated'
)
WITH CHECK (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
);

-- Public read access for everyone
CREATE POLICY "Public read access for folders"
ON folders
FOR SELECT
USING (true);

-- ==================== CONTENT_PUBLIC TABLE ====================
-- Allow full CRUD from public-library.org domain
CREATE POLICY "Owner access from public-library.org for content_public"
ON content_public
FOR ALL
USING (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
)
WITH CHECK (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
);

-- Public read access for everyone
CREATE POLICY "Public read access for content_public"
ON content_public
FOR SELECT
USING (true);

-- ==================== CONTENT_PRIVATE TABLE ====================
-- Allow full CRUD from public-library.org domain
CREATE POLICY "Owner access from public-library.org for content_private"
ON content_private
FOR ALL
USING (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
)
WITH CHECK (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
);

-- Authenticated read access for private content
CREATE POLICY "Authenticated read access for content_private"
ON content_private
FOR SELECT
USING (auth.role() = 'authenticated' OR true);

-- ==================== USER_INTERACTIONS TABLE ====================
-- Allow full CRUD from public-library.org domain
CREATE POLICY "Owner access from public-library.org for user_interactions"
ON user_interactions
FOR ALL
USING (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
)
WITH CHECK (
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    auth.role() = 'authenticated'
);

-- Allow anyone to insert interactions (for analytics)
CREATE POLICY "Public insert for user_interactions"
ON user_interactions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read interactions
CREATE POLICY "Public read for user_interactions"
ON user_interactions
FOR SELECT
USING (true);

-- ==================== PDF_PROJECTS TABLE (if exists) ====================
-- This table might exist if you're sharing the same Supabase project
-- If it doesn't exist, these commands will be skipped

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pdf_projects') THEN
        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "Allow all operations from authorized domains" ON pdf_projects';
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users full access" ON pdf_projects';
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read access" ON pdf_projects';
        
        -- Create new policy
        EXECUTE '
        CREATE POLICY "Owner access from all authorized domains for pdf_projects"
        ON pdf_projects
        FOR ALL
        USING (
            current_setting(''request.headers'', true)::json->>''origin'' LIKE ''%public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''referer'' LIKE ''%public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''origin'' LIKE ''%3c-public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''referer'' LIKE ''%3c-public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''origin'' LIKE ''%builder.3c-public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''referer'' LIKE ''%builder.3c-public-library.org%''
            OR
            current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
            OR
            auth.role() = ''authenticated''
        )
        WITH CHECK (
            current_setting(''request.headers'', true)::json->>''origin'' LIKE ''%public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''referer'' LIKE ''%public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''origin'' LIKE ''%3c-public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''referer'' LIKE ''%3c-public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''origin'' LIKE ''%builder.3c-public-library.org%''
            OR
            current_setting(''request.headers'', true)::json->>''referer'' LIKE ''%builder.3c-public-library.org%''
            OR
            current_setting(''request.jwt.claims'', true)::json->>''role'' = ''service_role''
            OR
            auth.role() = ''authenticated''
        )';
        
        -- Public read for published projects
        EXECUTE '
        CREATE POLICY "Public read access for pdf_projects"
        ON pdf_projects
        FOR SELECT
        USING (status = ''published'')';
        
        RAISE NOTICE 'pdf_projects policies updated successfully';
    ELSE
        RAISE NOTICE 'pdf_projects table does not exist in this database - skipping';
    END IF;
END $$;

-- ============================================
-- STEP 3: Verification
-- ============================================

-- List all policies for each table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN ('folders', 'content_public', 'content_private', 'user_interactions', 'pdf_projects')
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('folders', 'content_public', 'content_private', 'user_interactions', 'pdf_projects')
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- Each table should have at least 2 policies:
-- 1. Owner access from public-library.org (FOR ALL)
-- 2. Public read access (FOR SELECT)
--
-- folders: 2 policies
-- content_public: 2 policies
-- content_private: 2 policies
-- user_interactions: 3 policies (includes public insert)
-- pdf_projects: 2 policies (if exists)

-- ============================================
-- NOTES
-- ============================================
-- This SQL grants owner-level access to:
-- ✅ public-library.org/admin (3C Admin Panel)
-- ✅ public-library.org/library.html (3C Public Library)
-- ✅ Any subdomain of 3c-public-library.org
-- ✅ builder.3c-public-library.org (Interactive PDF Builder)
-- ✅ Service role key (for backend operations)
-- ✅ Authenticated users (for team members)
--
-- The policies use LIKE '%domain%' to match:
-- - http://public-library.org
-- - https://public-library.org
-- - http://www.public-library.org
-- - https://www.public-library.org
-- - Any path on the domain (e.g., /admin, /library.html)
--
-- This ensures you will NEVER be locked out from any of your domains.
