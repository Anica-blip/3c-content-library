// Production Configuration
// This file contains client-side configuration for the 3C Public Library

const CONFIG = {
    // Supabase Configuration (client-side safe)
    supabase: {
        url: '', // Set in admin dashboard
        anonKey: '', // Set in admin dashboard
        tableName: 'library_backups'
    },
    
    // Cloudflare R2 Configuration
    r2: {
        publicUrl: 'https://files.3c-public-library.org', // Your R2 public domain
        uploadEndpoint: '/api/upload', // Backend endpoint for uploads
        maxFileSize: 100 * 1024 * 1024, // 100MB max file size
        allowedTypes: {
            pdf: ['application/pdf'],
            video: ['video/mp4', 'video/webm', 'video/ogg'],
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
            audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
        }
    },
    
    // Application Settings
    app: {
        name: '3C Public Library',
        domain: '3c-public-library.org',
        version: '2.0.0',
        environment: 'production'
    },
    
    // Feature Flags
    features: {
        useCloudflareR2: true, // Use R2 instead of base64
        enableSupabaseSync: true,
        enableGitHubBackup: false, // Future feature
        maxLocalStorageSize: 5 * 1024 * 1024 // 5MB fallback for thumbnails
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
