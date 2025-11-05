/**
 * Cloudflare Worker API for R2 Storage
 * Deploy this as a Cloudflare Worker to handle file uploads
 * 
 * Setup Instructions:
 * 1. Create a Cloudflare Worker in your dashboard
 * 2. Bind your R2 bucket to this worker (name it 'R2_BUCKET')
 * 3. Copy this code to the worker
 * 4. Deploy
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Health check endpoint
        if (url.pathname === '/api/upload/health') {
            return new Response(JSON.stringify({ status: 'ok' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Upload endpoint
        if (url.pathname === '/api/upload' && request.method === 'POST') {
            try {
                const formData = await request.formData();
                const file = formData.get('file');
                const filename = formData.get('filename');
                const contentType = formData.get('contentType');

                if (!file) {
                    return new Response(JSON.stringify({ error: 'No file provided' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // Upload to R2
                await env.R2_BUCKET.put(filename, file, {
                    httpMetadata: {
                        contentType: contentType
                    }
                });

                return new Response(JSON.stringify({
                    success: true,
                    filename: filename,
                    size: file.size
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    error: error.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // Delete endpoint
        if (url.pathname === '/api/upload/delete' && request.method === 'POST') {
            try {
                const { filename } = await request.json();

                if (!filename) {
                    return new Response(JSON.stringify({ error: 'No filename provided' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                await env.R2_BUCKET.delete(filename);

                return new Response(JSON.stringify({
                    success: true,
                    filename: filename
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    error: error.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        // List files endpoint (optional, for debugging)
        if (url.pathname === '/api/upload/list' && request.method === 'GET') {
            try {
                const listed = await env.R2_BUCKET.list({ limit: 100 });
                
                return new Response(JSON.stringify({
                    objects: listed.objects.map(obj => ({
                        key: obj.key,
                        size: obj.size,
                        uploaded: obj.uploaded
                    }))
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                return new Response(JSON.stringify({
                    error: error.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
};
