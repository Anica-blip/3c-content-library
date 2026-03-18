/**
 * Vault Supabase Client — 3C Aurion's Vault
 * Cloned from supabase-client.js and adapted for vault tables:
 *   vault_folders, vault_content, vault_folder_passwords
 *
 * Built by Claude Sonnet 4.6 × Chef Anica — 3C Thread To Success
 */

class VaultSupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    // ==================== INITIALIZATION ====================

    async init(url, anonKey) {
        try {
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded.');
            }
            this.client = supabase.createClient(url, anonKey, {
                auth: {
                    storageKey: 'sb-vault-auth-token',
                    persistSession: true,
                    autoRefreshToken: true
                }
            });
            this.isConnected = true;
            console.log('✅ Vault Supabase client initialized');
            return true;
        } catch (error) {
            console.error('❌ Vault Supabase initialization failed:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async testConnection() {
        if (!this.client) throw new Error('Vault client not initialized');
        try {
            const { data, error } = await this.client
                .from('vault_folders')
                .select('count')
                .limit(1);
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Vault connection test failed:', error);
            throw error;
        }
    }

    // ==================== FOLDER OPERATIONS ====================

    /**
     * Get all vault folders with stats
     * Uses vault_folders_with_stats view — mirrors folders_with_stats
     */
    async getFolders() {
        const { data, error } = await this.client
            .from('vault_folders_with_stats')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get single vault folder by ID or slug
     */
    async getFolder(idOrSlug) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

        const { data, error } = await this.client
            .from('vault_folders')
            .select('*')
            .eq(isUUID ? 'id' : 'slug', idOrSlug)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create new vault folder
     * Generates slug locally — no dependency on existing Postgres RPC functions
     */
    async createFolder(title, description = '', tableName = '', isPublic = true, parentId = null, folderType = 'root', customUrl = null) {
        try {
            console.log('📁 Creating vault folder:', { title, tableName, isPublic, parentId, folderType });

            // Generate slug locally
            const slug = customUrl
                ? customUrl.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                : title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

            // Ensure slug is unique by appending timestamp if needed
            const uniqueSlug = `${slug}_${Date.now()}`.slice(0, 80);
            const finalSlug = customUrl || uniqueSlug;

            const folderData = {
                title:       title,
                slug:        finalSlug,
                custom_url:  customUrl,
                table_name:  tableName,
                description: description,
                is_public:   isPublic,
                parent_id:   parentId,
                folder_type: folderType
            };

            console.log('📤 Inserting vault folder:', folderData);

            const { data, error } = await this.client
                .from('vault_folders')
                .insert([folderData])
                .select()
                .single();

            if (error) {
                console.error('❌ Vault folder insert error:', error);
                throw new Error(`Vault folder insert failed: ${error.message || JSON.stringify(error)}`);
            }

            console.log('✅ Vault folder created:', data);
            return data;
        } catch (error) {
            console.error('❌ createVaultFolder error:', error);
            throw error;
        }
    }

    /**
     * Update vault folder
     */
    async updateFolder(id, updates) {
        const { data, error } = await this.client
            .from('vault_folders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete vault folder
     */
    async deleteFolder(id) {
        const { error } = await this.client
            .from('vault_folders')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    // ==================== CONTENT OPERATIONS ====================

    /**
     * All vault content lives in single vault_content table
     * No public/private split — visibility controlled by folder
     */

    /**
     * Get all content for a vault folder
     */
    async getContentByFolder(folderId) {
        const { data, error } = await this.client
            .from('vault_content')
            .select('id, folder_id, title, type, url, external_url, thumbnail_url, description, file_size, custom_url, slug, table_name, display_order, view_count, last_viewed_at, created_at, updated_at')
            .eq('folder_id', folderId)
            .order('display_order', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get single vault content item by ID
     */
    async getContent(id) {
        const { data, error } = await this.client
            .from('vault_content')
            .select('id, folder_id, title, type, url, external_url, thumbnail_url, description, file_size, custom_url, slug, table_name, display_order, view_count, last_viewed_at, created_at, updated_at, vault_folders(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create new vault content item
     * Generates slug locally — no dependency on existing Postgres RPC functions
     */
    async createContent(contentData) {
        try {
            const folder = await this.getFolder(contentData.folder_id);

            // Generate slug locally
            const baseSlug = contentData.custom_url
                ? contentData.custom_url.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                : contentData.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

            const slug = contentData.custom_url || `${baseSlug}_${Date.now()}`.slice(0, 80);

            // Get max display_order for this folder
            const { data: maxOrder } = await this.client
                .from('vault_content')
                .select('display_order')
                .eq('folder_id', contentData.folder_id)
                .order('display_order', { ascending: false })
                .limit(1)
                .single();

            const displayOrder = maxOrder ? maxOrder.display_order + 1 : 0;

            const { data, error } = await this.client
                .from('vault_content')
                .insert([{
                    ...contentData,
                    slug:          slug,
                    custom_url:    contentData.custom_url || null,
                    table_name:    folder.table_name,
                    display_order: displayOrder
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ createVaultContent error:', error);
            throw error;
        }
    }

    /**
     * Update vault content item
     */
    async updateContent(id, updates) {
        const { data, error } = await this.client
            .from('vault_content')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete vault content item
     */
    async deleteContent(id) {
        const { error } = await this.client
            .from('vault_content')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    /**
     * Search vault content
     */
    async searchContent(query) {
        const { data, error } = await this.client
            .from('vault_content')
            .select('*, vault_folders(*)')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .order('view_count', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get vault content by type
     */
    async getContentByType(type) {
        const { data, error } = await this.client
            .from('vault_content')
            .select('*, vault_folders(*)')
            .eq('type', type)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Increment view count for vault content
     */
    async incrementViewCount(contentId) {
        // Direct update — no RPC dependency
        const { data: current } = await this.client
            .from('vault_content')
            .select('view_count')
            .eq('id', contentId)
            .single();

        if (current) {
            await this.client
                .from('vault_content')
                .update({
                    view_count:     (current.view_count || 0) + 1,
                    last_viewed_at: new Date().toISOString()
                })
                .eq('id', contentId);
        }
    }

    // ==================== PASSWORD OPERATIONS ====================

    /**
     * Get passwords for a vault folder
     */
    async getFolderPasswords(folderId) {
        const { data, error } = await this.client
            .from('vault_folder_passwords')
            .select('*')
            .eq('folder_id', folderId)
            .eq('is_active', true);

        if (error) throw error;
        return data || [];
    }

    /**
     * Verify vault folder password
     */
    async verifyFolderPassword(folderId, passwordAttempt) {
        const { data, error } = await this.client
            .from('vault_folder_passwords')
            .select('password_hash')
            .eq('folder_id', folderId)
            .eq('is_active', true);

        if (error) throw error;
        if (!data || data.length === 0) return false;

        // Check against stored hashes
        return data.some(row => row.password_hash === passwordAttempt);
    }

    /**
     * Get database stats for vault
     */
    async getStats() {
        const { data: folderCount } = await this.client
            .from('vault_folders')
            .select('count');

        const { data: contentCount } = await this.client
            .from('vault_content')
            .select('count');

        return {
            totalFolders: folderCount?.[0]?.count || 0,
            totalContent: contentCount?.[0]?.count || 0
        };
    }
}

// Create global instance
const vaultClient = new VaultSupabaseClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VaultSupabaseClient, vaultClient };
}
