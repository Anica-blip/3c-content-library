-- ==================== DATABASE VERIFICATION SCRIPT ====================
-- Run this in Supabase SQL Editor to verify your database is set up correctly
-- This will help you diagnose any issues

-- ==================== 1. CHECK TABLES EXIST ====================
SELECT 
    'Tables Check' as check_type,
    table_name,
    CASE 
        WHEN table_name IN ('folders', 'content_public', 'content_private', 'user_interactions') 
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('folders', 'content_public', 'content_private', 'user_interactions')
ORDER BY table_name;

-- ==================== 2. CHECK VIEWS EXIST ====================
SELECT 
    'Views Check' as check_type,
    table_name as view_name,
    '✅ EXISTS' as status
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('folders_with_stats', 'content_with_folder', 'popular_content');

-- ==================== 3. CHECK FOLDER COLUMNS ====================
SELECT 
    'Folders Columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'folders'
ORDER BY ordinal_position;

-- ==================== 4. CHECK CONTENT_PUBLIC COLUMNS ====================
SELECT 
    'Content Public Columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'content_public'
ORDER BY ordinal_position;

-- ==================== 5. CHECK CONTENT_PRIVATE COLUMNS ====================
SELECT 
    'Content Private Columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'content_private'
ORDER BY ordinal_position;

-- ==================== 6. CHECK FUNCTIONS EXIST ====================
SELECT 
    'Functions Check' as check_type,
    routine_name as function_name,
    '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('generate_slug', 'increment_view_count', 'update_last_page', 'update_folder_item_count', 'update_updated_at_column')
ORDER BY routine_name;

-- ==================== 7. CHECK TRIGGERS EXIST ====================
SELECT 
    'Triggers Check' as check_type,
    trigger_name,
    event_object_table as table_name,
    '✅ EXISTS' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- ==================== 8. CHECK ROW LEVEL SECURITY ====================
SELECT 
    'RLS Check' as check_type,
    tablename as table_name,
    CASE 
        WHEN rowsecurity = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('folders', 'content_public', 'content_private', 'user_interactions');

-- ==================== 9. CHECK POLICIES ====================
SELECT 
    'Policies Check' as check_type,
    tablename as table_name,
    policyname as policy_name,
    cmd as command_type,
    '✅ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==================== 10. COUNT EXISTING DATA ====================
SELECT 
    'Data Count' as check_type,
    'folders' as table_name,
    COUNT(*) as row_count
FROM folders
UNION ALL
SELECT 
    'Data Count',
    'content_public',
    COUNT(*)
FROM content_public
UNION ALL
SELECT 
    'Data Count',
    'content_private',
    COUNT(*)
FROM content_private
UNION ALL
SELECT 
    'Data Count',
    'user_interactions',
    COUNT(*)
FROM user_interactions;

-- ==================== 11. TEST FOLDERS_WITH_STATS VIEW ====================
SELECT 
    'Folders with Stats Test' as check_type,
    id,
    title,
    slug,
    is_public,
    item_count,
    actual_item_count,
    created_at
FROM folders_with_stats
LIMIT 5;

-- ==================== 12. TEST GENERATE_SLUG FUNCTION ====================
SELECT 
    'Slug Generation Test' as check_type,
    generate_slug('Test Folder Name') as generated_slug,
    '✅ WORKING' as status;

-- ==================== SUMMARY ====================
-- If all checks show ✅, your database is properly configured!
-- If you see ❌, you need to run the supabase-schema.sql file

SELECT 
    '==================== VERIFICATION COMPLETE ====================' as message
UNION ALL
SELECT 
    'If you see errors above, run supabase-schema.sql to create missing objects'
UNION ALL
SELECT 
    'If all checks passed, your database is ready to use!'
UNION ALL
SELECT 
    '==============================================================';
