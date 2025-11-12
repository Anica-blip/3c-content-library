/**
 * Enhanced Supabase Client for 3C Public Library
 * Handles all database operations with proper relational structure
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Initialize Supabase client
     */
    async init(url, anonKey) {
        try {
            this.client = supabase.createClient(url, anonKey);
            this.isConnected = true;
            console.log('✅ Supabase client initialized');
            return true;
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Test connection
     */
    async testConnection() {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }
        
        try {
            const { data, error } = await this.client
                .from('folders')
                .select('count')
                .limit(1);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }

    // ==================== FOLDER OPERATIONS ====================

    /**
     * Get all folders with stats
     */
    async getFolders() {
        const { data, error } = await this.client
            .from('folders_with_stats')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    /**
     * Get single folder by ID or slug
     */
    async getFolder(idOrSlug) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        
        const { data, error } = await this.client
            .from('folders')
            .select('*')
            .eq(isUUID ? 'id' : 'slug', idOrSlug)
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Create new folder
     */
    async createFolder(title, description = '', tableName = '', isPublic = true, parentId = null) {
        // Generate slug from title
        const { data: slugData, error: slugError } = await this.client
            .rpc('generate_slug', { title_text: title });
        
        if (slugError) throw slugError;
        
        const { data, error } = await this.client
            .from('folders')
            .insert([{
                title: title,
                slug: slugData,
                table_name: tableName,
                description: description,
                is_public: isPublic,
                parent_id: parentId
            }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Update folder
     */
    async updateFolder(id, updates) {
        // If title is updated, regenerate slug
        if (updates.title) {
            const { data: slugData, error: slugError } = await this.client
                .rpc('generate_slug', { title_text: updates.title });
            
            if (!slugError) {
                updates.slug = slugData;
            }
        }

        const { data, error } = await this.client
            .from('folders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Delete folder
     */
    async deleteFolder(id) {
        const { error } = await this.client
            .from('folders')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    }

    // ==================== CONTENT OPERATIONS ====================

    /**
     * Get content table name based on folder
     */
    async getContentTable(folderId) {
        const folder = await this.getFolder(folderId);
        return folder.is_public ? 'content_public' : 'content_private';
    }

    /**
     * Get all content for a folder
     */
    async getContentByFolder(folderId) {
        const tableName = await this.getContentTable(folderId);
        
        const { data, error } = await this.client
            .from(tableName)
            .select('*')
            .eq('folder_id', folderId)
            .order('display_order', { ascending: true });
        
        if (error) throw error;
        return data || [];
    }

    /**
     * Get single content by ID (tries both tables)
     */
    async getContent(id) {
        // Try public first
        let { data, error } = await this.client
            .from('content_public')
            .select('*, folders(*)')
            .eq('id', id)
            .single();
        
        if (!error && data) return data;
        
        // Try private
        ({ data, error } = await this.client
            .from('content_private')
            .select('*, folders(*)')
            .eq('id', id)
            .single());
        
        if (error) throw error;
        return data;
    }

    /**
     * Create new content
     */
    async createContent(contentData) {
        const tableName = await this.getContentTable(contentData.folder_id);
        const folder = await this.getFolder(contentData.folder_id);
        
        // Generate unique slug for content using table_name
        const { data: slugData, error: slugError } = await this.client
            .rpc('generate_content_slug', { 
                content_title: contentData.title,
                folder_uuid: contentData.folder_id,
                table_short_name: folder.table_name
            });
        
        if (slugError) throw slugError;
        
        // Get max display_order for this folder
        const { data: maxOrder } = await this.client
            .from(tableName)
            .select('display_order')
            .eq('folder_id', contentData.folder_id)
            .order('display_order', { ascending: false })
            .limit(1)
            .single();
        
        const displayOrder = maxOrder ? maxOrder.display_order + 1 : 0;

        const { data, error } = await this.client
            .from(tableName)
            .insert([{
                ...contentData,
                slug: slugData,
                table_name: folder.table_name,
                display_order: displayOrder
            }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Update content
     */
    async updateContent(id, updates, folderId) {
        const tableName = await this.getContentTable(folderId || updates.folder_id);
        
        const { data, error } = await this.client
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Delete content (tries both tables)
     */
    async deleteContent(id, folderId) {
        const tableName = await this.getContentTable(folderId);
        
        const { error } = await this.client
            .from(tableName)
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    }

    /**
     * Reorder content within folder
     */
    async reorderContent(contentId, newOrderIndex, folderId) {
        const tableName = await this.getContentTable(folderId);
        
        const { data, error } = await this.client
            .from(tableName)
            .update({ display_order: newOrderIndex })
            .eq('id', contentId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    /**
     * Move content up in order
     */
    async moveContentUp(contentId) {
        const content = await this.getContent(contentId);
        if (content.display_order === 0) return content;
        
        const tableName = await this.getContentTable(content.folder_id);
        
        // Get content above
        const { data: contentAbove } = await this.client
            .from(tableName)
            .select('*')
            .eq('folder_id', content.folder_id)
            .eq('display_order', content.display_order - 1)
            .single();
        
        if (contentAbove) {
            // Swap order indexes
            await this.updateContent(contentId, { display_order: content.display_order - 1 }, content.folder_id);
            await this.updateContent(contentAbove.id, { display_order: content.display_order }, content.folder_id);
        }
        
        return await this.getContent(contentId);
    }

    /**
     * Move content down in order
     */
    async moveContentDown(contentId) {
        const content = await this.getContent(contentId);
        
        const tableName = await this.getContentTable(content.folder_id);
        
        // Get content below
        const { data: contentBelow } = await this.client
            .from(tableName)
            .select('*')
            .eq('folder_id', content.folder_id)
            .eq('display_order', content.display_order + 1)
            .single();
        
        if (contentBelow) {
            // Swap order indexes
            await this.updateContent(contentId, { display_order: content.display_order + 1 }, content.folder_id);
            await this.updateContent(contentBelow.id, { display_order: content.display_order }, content.folder_id);
        }
        
        return await this.getContent(contentId);
    }

    // ==================== ANALYTICS OPERATIONS ====================

    /**
     * Increment view count
     */
    async incrementViewCount(contentId) {
        const { error } = await this.client
            .rpc('increment_view_count', { content_uuid: contentId });
        
        if (error) console.error('Failed to increment view count:', error);
    }

    /**
     * Update last page for PDF
     */
    async updateLastPage(contentId, pageNum) {
        const { error } = await this.client
            .rpc('update_last_page', { content_uuid: contentId, page_num: pageNum });
        
        if (error) console.error('Failed to update last page:', error);
    }

    /**
     * Log user interaction
     */
    async logInteraction(contentId, interactionType, metadata = {}) {
        const { error } = await this.client
            .from('user_interactions')
            .insert([{
                content_id: contentId,
                interaction_type: interactionType,
                last_page: metadata.lastPage || null,
                duration: metadata.duration || null,
                user_agent: navigator.userAgent,
                ip_address: null // Will be set by Supabase
            }]);
        
        if (error) console.error('Failed to log interaction:', error);
    }

    /**
     * Get popular content
     */
    async getPopularContent(limit = 10) {
        const { data, error } = await this.client
            .from('popular_content')
            .select('*')
            .limit(limit);
        
        if (error) throw error;
        return data || [];
    }

    /**
     * Get content stats
     */
    async getContentStats(contentId) {
        const { data: content } = await this.getContent(contentId);
        
        const { data: interactions, error } = await this.client
            .from('user_interactions')
            .select('*')
            .eq('content_id', contentId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return {
            content,
            totalViews: content.view_count,
            lastViewed: content.last_viewed_at,
            interactions: interactions || []
        };
    }

    // ==================== SEARCH OPERATIONS ====================

    /**
     * Search content across all folders
     */
    async searchContent(query) {
        const { data, error } = await this.client
            .from('content_with_folder')
            .select('*')
            .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            .order('view_count', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    /**
     * Get content by type
     */
    async getContentByType(type) {
        const { data, error } = await this.client
            .from('content_with_folder')
            .select('*')
            .eq('type', type)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Bulk create content
     */
    async bulkCreateContent(contentArray, folderId) {
        const tableName = await this.getContentTable(folderId);
        
        const { data, error } = await this.client
            .from(tableName)
            .insert(contentArray)
            .select();
        
        if (error) throw error;
        return data;
    }

    /**
     * Export all data (for backup)
     */
    async exportAllData() {
        const folders = await this.getFolders();
        const allContent = [];
        
        for (const folder of folders) {
            const content = await this.getContentByFolder(folder.id);
            allContent.push(...content);
        }
        
        return {
            folders,
            content: allContent,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Get database statistics
     */
    async getStats() {
        const { data: folderCount } = await this.client
            .from('folders')
            .select('count');
        
        const { data: publicCount } = await this.client
            .from('content_public')
            .select('count');
        
        const { data: privateCount } = await this.client
            .from('content_private')
            .select('count');
        
        const { data: publicViews } = await this.client
            .from('content_public')
            .select('view_count');
        
        const { data: privateViews } = await this.client
            .from('content_private')
            .select('view_count');
        
        const totalPublicContent = publicCount?.[0]?.count || 0;
        const totalPrivateContent = privateCount?.[0]?.count || 0;
        const publicViewsSum = publicViews?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;
        const privateViewsSum = privateViews?.reduce((sum, item) => sum + (item.view_count || 0), 0) || 0;
        
        return {
            totalFolders: folderCount?.[0]?.count || 0,
            totalContent: totalPublicContent + totalPrivateContent,
            totalViews: publicViewsSum + privateViewsSum
        };
    }
}

// Create global instance
const supabaseClient = new SupabaseClient();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseClient, supabaseClient };
}
