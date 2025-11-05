/**
 * Cloudflare R2 Storage Module
 * Handles file uploads to Cloudflare R2 bucket
 */

class R2Storage {
    constructor(config) {
        this.config = config || CONFIG.r2;
        this.uploadEndpoint = this.config.uploadEndpoint;
        this.publicUrl = this.config.publicUrl;
        this.maxFileSize = this.config.maxFileSize;
    }

    /**
     * Upload file to R2 via backend API
     * @param {File} file - The file to upload
     * @param {string} folder - Optional folder path in R2
     * @returns {Promise<Object>} Upload result with URL
     */
    async uploadFile(file, folder = 'content') {
        // Validate file size
        if (file.size > this.maxFileSize) {
            throw new Error(`File size exceeds maximum of ${this.maxFileSize / (1024 * 1024)}MB`);
        }

        // Validate file type
        const fileType = this.getFileType(file.type);
        if (!fileType) {
            throw new Error(`File type ${file.type} is not supported`);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split('.').pop();
        const filename = `${folder}/${timestamp}-${randomStr}.${extension}`;

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', filename);
        formData.append('contentType', file.type);

        try {
            // Upload to backend API (which handles R2 upload)
            const response = await fetch(this.uploadEndpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            const result = await response.json();
            
            return {
                success: true,
                url: `${this.publicUrl}/${filename}`,
                filename: filename,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('R2 upload error:', error);
            throw error;
        }
    }

    /**
     * Upload thumbnail image
     * @param {File} file - Thumbnail image file
     * @returns {Promise<Object>} Upload result
     */
    async uploadThumbnail(file) {
        return this.uploadFile(file, 'thumbnails');
    }

    /**
     * Upload content file (PDF, video, etc.)
     * @param {File} file - Content file
     * @returns {Promise<Object>} Upload result
     */
    async uploadContent(file) {
        const fileType = this.getFileType(file.type);
        return this.uploadFile(file, `content/${fileType}`);
    }

    /**
     * Get file type category from MIME type
     * @param {string} mimeType - File MIME type
     * @returns {string|null} File type category
     */
    getFileType(mimeType) {
        const types = this.config.allowedTypes || CONFIG.r2.allowedTypes;
        
        for (const [type, mimes] of Object.entries(types)) {
            if (mimes.includes(mimeType)) {
                return type;
            }
        }
        return null;
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Delete file from R2 (requires backend API)
     * @param {string} filename - File path in R2
     * @returns {Promise<Object>} Delete result
     */
    async deleteFile(filename) {
        try {
            const response = await fetch(`${this.uploadEndpoint}/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            });

            if (!response.ok) {
                throw new Error('Delete failed');
            }

            return await response.json();
        } catch (error) {
            console.error('R2 delete error:', error);
            throw error;
        }
    }

    /**
     * Check if R2 storage is available
     * @returns {Promise<boolean>} Availability status
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.uploadEndpoint}/health`, {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.error('R2 health check failed:', error);
            return false;
        }
    }
}

// Create global instance
const r2Storage = new R2Storage();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { R2Storage, r2Storage };
}
