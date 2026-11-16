/**
 * Cloudflare Worker for 3C Library File Uploads
 * Handles file uploads to R2 from the admin panel
 *
 * Access rules (v2):
 *   - GET  /files/*            -> open to everyone (the public library reads files)
 *   - POST /api/upload         -> owner only (Supabase sign-in, Chef's account)
 *   - DELETE /api/delete       -> owner only
 *   - GET  /api/list           -> owner only
 *   - GET  /api/info/*         -> owner only
 *
 * Required Worker settings:
 *   Secret (wrangler secret put OWNER_EMAIL) : the owner's sign-in email.
 *   Variables (wrangler.toml [vars])         : SUPABASE_URL, SUPABASE_ANON_KEY (public keys),
 *                                              R2_PUBLIC_URL
 */

// Websites allowed to call the owner-only routes from a browser
const ALLOWED_ORIGINS = [
  'https://3c-public-library.org',
  'https://www.3c-public-library.org',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB, same limit as config.js

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'video/mp4', 'video/webm', 'video/ogg',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'audio/mpeg', 'audio/wav', 'audio/ogg',
  'application/json', // flipbook and presentation manifests
];

// Files are read by the public library and by the 3C tools: always open for GET
const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Owner-only routes: only the library's own website may call them from a browser
function adminCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Owner check. Returns null when the caller is the owner,
 * otherwise returns the error Response to send back.
 * The sign-in token is checked with Supabase itself, then the email is compared
 * with OWNER_EMAIL (the same email the database rules use).
 */
async function requireOwner(request, env, corsHeaders) {
  if (!env.OWNER_EMAIL || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Server not configured' }, 503, corsHeaders);
  }

  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return jsonResponse({ error: 'Sign in required' }, 401, corsHeaders);
  }

  let res;
  try {
    res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${match[1]}` },
    });
  } catch (e) {
    return jsonResponse({ error: 'Could not verify sign-in' }, 503, corsHeaders);
  }
  if (!res.ok) {
    return jsonResponse({ error: 'Invalid or expired sign-in' }, 401, corsHeaders);
  }

  const user = await res.json();
  const email = (user && user.email ? String(user.email) : '').toLowerCase();
  if (!email || email !== String(env.OWNER_EMAIL).trim().toLowerCase()) {
    return jsonResponse({ error: 'Not allowed' }, 403, corsHeaders);
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // File serving stays open; everything else is owner-only
    const isFileRoute = path.startsWith('/files/');
    const corsHeaders = isFileRoute ? publicCorsHeaders : adminCorsHeaders(request);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Serve files from R2 with CORS headers (public)
      if (isFileRoute && request.method === 'GET') {
        return await handleFileServe(request, env, corsHeaders);
      }

      const isUpload = (path === '/upload' || path === '/api/upload') && request.method === 'POST';
      const isDelete = (path === '/delete' || path === '/api/delete') && request.method === 'DELETE';
      const isList = (path === '/list' || path === '/api/list') && request.method === 'GET';
      const isInfo = (path.startsWith('/info/') || path.startsWith('/api/info/')) && request.method === 'GET';

      if (isUpload || isDelete || isList || isInfo) {
        const denied = await requireOwner(request, env, corsHeaders);
        if (denied) return denied;

        if (isUpload) return await handleUpload(request, env, corsHeaders);
        if (isDelete) return await handleDelete(request, env, corsHeaders);
        if (isList) return await handleList(request, env, corsHeaders);
        return await handleInfo(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  },
};

/**
 * Handle file upload
 */
async function handleUpload(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'uploads');
    const type = String(formData.get('type') || 'content'); // 'content' or 'thumbnail'

    if (!file || typeof file === 'string') {
      return jsonResponse({ error: 'No file provided' }, 400, corsHeaders);
    }

    // Safe folder and type names (no path tricks)
    if (!/^[A-Za-z0-9 _.\-\/]+$/.test(folder) || folder.includes('..') || folder.startsWith('/') || folder.includes('//')) {
      return jsonResponse({ error: 'Invalid folder name' }, 400, corsHeaders);
    }
    if (!/^[A-Za-z0-9_-]+$/.test(type)) {
      return jsonResponse({ error: 'Invalid upload type' }, 400, corsHeaders);
    }

    // Size and file type limits
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse({ error: 'File is larger than 100MB' }, 413, corsHeaders);
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonResponse({ error: `File type ${file.type || 'unknown'} is not supported` }, 415, corsHeaders);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const rawExtension = (file.name.split('.').pop() || '').toLowerCase();
    const extension = /^[a-z0-9]{1,8}$/.test(rawExtension) ? rawExtension : 'bin';
    const filename = `${folder}/${type}-${timestamp}-${randomStr}.${extension}`;

    // Upload to R2
    await env.R2_BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        type: type,
      },
    });

    // Get public URL
    const publicUrl = `${env.R2_PUBLIC_URL}/${filename}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: filename,
        size: file.size,
        type: file.type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle file deletion
 */
async function handleDelete(request, env, corsHeaders) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return new Response(JSON.stringify({ error: 'No filename provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await env.R2_BUCKET.delete(filename);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File deleted successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle list files
 */
async function handleList(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100') || 100, 1000);

    const listed = await env.R2_BUCKET.list({
      prefix: prefix,
      limit: limit,
    });

    const files = listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        files: files,
        truncated: listed.truncated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle get file info
 */
async function handleInfo(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const filename = url.pathname.replace('/info/', '').replace('/api/info/', '');

    const object = await env.R2_BUCKET.head(filename);

    if (!object) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handle file serving from R2 with CORS headers
 */
async function handleFileServe(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    // Remove '/files/' prefix to get the actual R2 key
    const filename = url.pathname.replace('/files/', '');

    if (!filename) {
      return new Response('File path required', {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Get file from R2
    const object = await env.R2_BUCKET.get(filename);

    if (!object) {
      return new Response('File not found', {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Get content type from object metadata
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

    // Create response headers with CORS
    const headers = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Length': object.size,
      'Cache-Control': 'public, max-age=31536000',
    };

    // Add Content-Disposition for PDFs to allow inline viewing
    if (contentType === 'application/pdf') {
      headers['Content-Disposition'] = 'inline';
    }

    // Return the file
    return new Response(object.body, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('File serve error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
