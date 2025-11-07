// Production Configuration
// This file contains client-side configuration for the 3C Public Library

const CONFIG = {
    // Supabase Configuration (client-side safe)
    supabase: {
        url: '', 'https://cgxjqsbrditbteqhdyus.supabase.co'
        anonKey: '', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4'
        tableName: 'content_public',
        tableName: 'content_private'
    },
    
    // Cloudflare R2 Configuration
    r2: {
        publicUrl: 'https://files.3c-public-library.org', 
        uploadEndpoint: 'https://api.3c-public-library.org/api/upload',
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
        useCloudflareR2: true,          // Enable R2 uploads
        enableSupabaseSync: true,        // Enable Supabase sync
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
