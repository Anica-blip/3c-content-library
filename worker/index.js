/**
 * Drop In — 3C Aurion's Vault chat + reviews + Build Kit + Share Preview Worker
 * Handles: public chat, admin chat moderation, public reviews, admin review
 * moderation, public Build Kit links, admin Build Kit management, social
 * share previews (/share/...) for both the Public Library and Aurion Vault,
 * Telegram notifications, and the daily purge of soft-deleted/rejected items.
 *
 * Bindings required (Settings → Bindings):
 *   CHAT_KV          — KV namespace (chat threads)
 *   REVIEWS_KV       — KV namespace (reviews)
 *   BUILDKIT_KV      — KV namespace (Build Kit links)
 *   SHARE_CACHE_KV   — KV namespace (cached share-preview responses, 1hr TTL)
 *
 * Variables required (Settings → Variables, encrypted):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   ADMIN_KEY          — any long random string you choose. The admin
 *                        page sends this back on every admin request.
 *                        Treat it like a password — do not share it,
 *                        do not commit it anywhere.
 *
 * Cron Trigger required: 0 14 * * *  (daily purge — deleted chats AND
 *                                     rejected reviews, both after 7 days)
 *
 * Cloudflare Route required (Settings → Domains & Routes, on the
 * dropin-chat Worker): 3c-public-library.org/share/*
 * This is a narrow, dedicated path — every other URL on the real site
 * never touches this Worker at all, keeping the live site's own traffic
 * completely isolated from this feature.
 *
 * Built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success Cooking Lab 🧪👨‍🍳
 */

const PERSONAS = ['aurion', 'caelum', 'anica'];
const RATED_FOR_OPTIONS = ['library', 'vault', 'both'];
const BUILDKIT_SECTIONS = ['subscribe', 'referrals', 'tools', 'credits', 'brand_tools'];
const DELETE_GRACE_DAYS = 7;

// ── Share preview config ──
const SITE_URL = 'https://3c-public-library.org';
const SUPABASE_URL = 'https://cgxjqsbrditbteqhdyus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4';
const FALLBACK_DESCRIPTION = 'Think it. Do it. Own it.';
const FALLBACK_IMAGE = 'https://files.3c-public-library.org/3C%20Thread%20To%20Success%20logo.png';
const SHARE_CACHE_TTL = 3600; // 1 hour

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function randomToken(len = 24) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function requireAdmin(request, env) {
    const key = request.headers.get('X-Admin-Key');
    return key && env.ADMIN_KEY && key === env.ADMIN_KEY;
}

async function sendTelegram(env, text) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
    try {
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: env.TELEGRAM_CHAT_ID,
                text,
                parse_mode: 'HTML',
            }),
        });
    } catch (e) {
        console.error('Telegram notify failed:', e);
    }
}

function computeStatus(thread) {
    if (thread.messages.length === 0) return 'active';
    const last = thread.messages[thread.messages.length - 1];
    return last.sender === 'visitor' ? 'pending' : 'replied';
}

async function getThread(env, id) {
    const raw = await env.CHAT_KV.get(`thread:${id}`);
    return raw ? JSON.parse(raw) : null;
}

async function saveThread(env, thread) {
    thread.updatedAt = Date.now();
    await env.CHAT_KV.put(`thread:${thread.id}`, JSON.stringify(thread));
}

// ==================== SHARE PREVIEW HELPERS ====================

// Sharing platforms all honestly identify themselves in their User-Agent —
// this is how every "unfurl a link" bot works, nothing sneaky about it.
const BOT_USER_AGENT_PATTERNS = [
    'telegrambot', 'whatsapp', 'facebookexternalhit', 'facebot',
    'twitterbot', 'linkedinbot', 'slackbot', 'discordbot', 'skypeuripreview',
    'pinterest', 'redditbot', 'vkshare', 'w3c_validator', 'embedly',
    'quora link preview', 'outlook', 'iframely', 'google-structured-data',
];

function isBotRequest(userAgent) {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return BOT_USER_AGENT_PATTERNS.some(pattern => ua.includes(pattern));
}

function escapeHtmlServer(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// One shared helper for every Supabase REST read this feature needs —
// same URL + anon key pattern the pages themselves already use client-side.
async function supabaseGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });
    if (!res.ok) return [];
    return res.json();
}

// Same as supabaseGet, but throws on a non-ok response instead of
// silently returning an empty array — needed anywhere the caller must
// distinguish "genuinely no match" from "the query itself was invalid"
// (e.g. requesting a column that doesn't exist on a given table).
async function supabaseGetStrict(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });
    if (!res.ok) throw new Error(`Supabase query failed: ${res.status}`);
    return res.json();
}

async function findFolder(table, slugOrName) {
    const encoded = encodeURIComponent(slugOrName);
    const rows = await supabaseGet(
        `${table}?select=id,title,display_style,custom_url,slug,table_name&or=(custom_url.eq.${encoded},slug.eq.${encoded},table_name.eq.${encoded})&limit=1`
    );
    return rows[0] || null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findItem(table, folderId, slugOrId) {
    const encoded = encodeURIComponent(slugOrId);
    // Only compare against id (a UUID column) when the value actually
    // looks like a UUID — comparing a UUID column against an ordinary
    // slug string causes Supabase to reject the ENTIRE query outright,
    // not just skip that one condition. This was silently breaking
    // every single item lookup, real data or not.
    const idClause = UUID_PATTERN.test(slugOrId) ? `,id.eq.${encoded}` : '';

    // Try including path in the match — but path doesn't exist on
    // every table yet, so if Supabase rejects the query for that
    // reason, fall back to the original match without it rather than
    // failing the whole lookup.
    try {
        const rows = await supabaseGetStrict(
            `${table}?select=id,title,type,url,thumbnail_url,description,custom_url,slug,path,project_json,external_url&folder_id=eq.${folderId}&or=(custom_url.eq.${encoded},slug.eq.${encoded}${idClause},path.eq.${encoded})&limit=1`
        );
        return rows[0] || null;
    } catch (e) {
        // path column doesn't exist on this table (or some other
        // transient issue) — fall back to the safe, original match.
        const rows = await supabaseGet(
            `${table}?select=id,title,type,url,thumbnail_url,description,custom_url,slug&folder_id=eq.${folderId}&or=(custom_url.eq.${encoded},slug.eq.${encoded}${idClause})&limit=1`
        );
        return rows[0] || null;
    }
}

function buildSharePageHtml({ title, description, image, realUrl }) {
    const safeTitle = escapeHtmlServer(title);
    const rawDescription = (description && description.trim()) ? description.trim() : FALLBACK_DESCRIPTION;
    const safeDescription = escapeHtmlServer(rawDescription.slice(0, 155));
    const safeImage = image || FALLBACK_IMAGE;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${safeTitle} — 3C Thread To Success</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImage}">
<meta property="og:url" content="${realUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImage}">
<meta http-equiv="refresh" content="0; url=${realUrl}">
</head>
<body>
<p>Redirecting to <a href="${realUrl}">${safeTitle}</a>…</p>
</body>
</html>`;
}

// Handles GET /share/library/:folderSlug/:itemSlug and
// GET /share/vault/:folderSlug/:itemSlug
async function handleShareRequest(request, env, ctx, side, folderSlug, itemSlug) {
    const userAgent = request.headers.get('User-Agent') || '';
    const bot = isBotRequest(userAgent);

    const isLibrary = side === 'library';
    const folderTable = isLibrary ? 'folders' : 'vault_folders';
    const defaultTable = isLibrary ? 'content_public' : 'vault_content';
    const seriesTable = isLibrary ? 'content_public_series' : 'content_series';
    const realPage = isLibrary ? 'library.html' : 'vault/vault.html';

    const cacheKey = `share:${side}:${folderSlug}:${itemSlug}`;

    // Only bots benefit from a cached preview — real visitors always
    // get a fresh, instant redirect regardless of cache state.
    if (bot) {
        const cached = await env.SHARE_CACHE_KV.get(cacheKey);
        if (cached) {
            return new Response(cached, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
        }
    }

    const folder = await findFolder(folderTable, folderSlug);
    if (!folder) {
        return Response.redirect(`${SITE_URL}/${realPage}`, 302);
    }

    // Check BOTH content tables for the item, rather than trusting
    // folder.display_style to correctly pick the one right table —
    // that's a fragile dependency if that field is ever out of sync,
    // missing, or the folder was reclassified after content was added.
    // Try the table display_style suggests first (fewer wasted calls
    // in the common case), then fall back to the other table.
    const preferredTable = folder.display_style === 'collection' ? seriesTable : defaultTable;
    const otherTable = folder.display_style === 'collection' ? defaultTable : seriesTable;

    let item = await findItem(preferredTable, folder.id, itemSlug);
    let foundInSeriesTable = preferredTable === seriesTable;

    if (!item) {
        item = await findItem(otherTable, folder.id, itemSlug);
        foundInSeriesTable = otherTable === seriesTable;
    }

    const folderRealSlug = folder.custom_url || folder.slug || folder.table_name;

    if (!item) {
        // Item not found in either table — still send a real visitor
        // somewhere useful (the folder itself) rather than a dead end.
        return Response.redirect(`${SITE_URL}/${realPage}?folder=${encodeURIComponent(folderRealSlug)}`, 302);
    }

    // Which table the item actually came from decides the correct
    // redirect format — not folder.display_style, since that's exactly
    // the value that turned out not to be reliable enough to trust alone.
    const isCollection = foundInSeriesTable;

    const itemRealSlug = item.custom_url || item.slug || item.id;
    const realUrl = isCollection
        ? `${SITE_URL}/${realPage}?folder=${encodeURIComponent(folderRealSlug)}&highlight=${encodeURIComponent(itemRealSlug)}`
        : (isLibrary
            ? `${SITE_URL}/${realPage}?folder=${encodeURIComponent(folderRealSlug)}&content=${encodeURIComponent(itemRealSlug)}`
            : `${SITE_URL}/${realPage}?folder=${encodeURIComponent(folderRealSlug)}`);

    if (!bot) {
        return Response.redirect(realUrl, 302);
    }

    const html = buildSharePageHtml({
        title: item.title,
        description: item.description,
        image: item.thumbnail_url,
        realUrl,
    });

    ctx.waitUntil(env.SHARE_CACHE_KV.put(cacheKey, html, { expirationTtl: SHARE_CACHE_TTL }));

    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // ── SHARE PREVIEW: /share/library/:folder/:item or /share/vault/:folder/:item ──
        // Checked before anything else — this is the one narrow path this
        // Worker was given a Route for on the real domain. Every other URL
        // on the live site never reaches this Worker at all.
        const shareMatch = path.match(/^\/share\/(library|vault)\/([^/]+)\/([^/]+)\/?$/);
        if (shareMatch) {
            try {
                return await handleShareRequest(request, env, ctx, shareMatch[1], shareMatch[2], shareMatch[3]);
            } catch (error) {
                console.error('Share preview error:', error);
                const isLibrary = shareMatch[1] === 'library';
                return Response.redirect(`${SITE_URL}/${isLibrary ? 'library.html' : 'vault/vault.html'}`, 302);
            }
        }

        // ── TEMPORARY DIAGNOSTIC — remove once the share bug is confirmed
        // fixed. Same lookup as /share/ but returns raw JSON instead of
        // redirecting, so the actual folder/item data can be inspected
        // directly rather than relayed back and forth through screenshots. ──
        const debugMatch = path.match(/^\/share-debug\/(library|vault)\/([^/]+)\/([^/]+)\/?$/);
        if (debugMatch) {
            try {
                const [, side, folderSlug, itemSlug] = debugMatch;
                const isLibrary = side === 'library';
                const folderTable = isLibrary ? 'folders' : 'vault_folders';
                const defaultTable = isLibrary ? 'content_public' : 'vault_content';
                const seriesTable = isLibrary ? 'content_public_series' : 'content_series';

                const folder = await findFolder(folderTable, folderSlug);
                const itemInDefault = folder ? await findItem(defaultTable, folder.id, itemSlug) : null;
                const itemInSeries = folder ? await findItem(seriesTable, folder.id, itemSlug) : null;

                // Raw, unfiltered — everything actually stored under this
                // folder_id in both tables, no slug-matching involved at
                // all. This shows us the real data directly rather than
                // through a filter that might itself be the problem.
                const allInDefault = folder ? await supabaseGet(`${defaultTable}?select=id,title,custom_url,slug,folder_id&folder_id=eq.${folder.id}`) : [];
                const allInSeries = folder ? await supabaseGet(`${seriesTable}?select=id,title,custom_url,slug,folder_id&folder_id=eq.${folder.id}`) : [];

                return json({
                    searched: { side, folderSlug, itemSlug },
                    folder_found: folder,
                    item_found_in_default_table: itemInDefault,
                    item_found_in_series_table: itemInSeries,
                    everything_actually_in_this_folder_default_table: allInDefault,
                    everything_actually_in_this_folder_series_table: allInSeries,
                });
            } catch (error) {
                return json({ error: error.message }, 500);
            }
        }

        try {
            // ── PUBLIC: get contact email for the "prefer email" option ──
            if (path === '/api/config' && method === 'GET') {
                const email = (await env.CHAT_KV.get('config:contact_email')) || '';
                return json({ contactEmail: email });
            }

            // ── PUBLIC: start a new conversation ──
            if (path === '/api/chat/start' && method === 'POST') {
                const body = await request.json();
                const { persona, message } = body;

                if (!PERSONAS.includes(persona)) {
                    return json({ error: 'Invalid persona' }, 400);
                }
                if (!message || !message.trim()) {
                    return json({ error: 'Message is required' }, 400);
                }

                const id = randomToken();
                const thread = {
                    id,
                    persona,
                    status: 'active',
                    read: false,
                    deleted: false,
                    deletedAt: null,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    messages: [
                        { sender: 'visitor', text: message.trim(), timestamp: Date.now() },
                    ],
                };
                thread.status = computeStatus(thread);
                await saveThread(env, thread);

                ctx.waitUntil(sendTelegram(env,
                    `💬 <b>New Drop In message</b>\nFor: ${persona}\n\n${message.trim().slice(0, 300)}`
                ));

                return json({ threadId: id });
            }

            // ── PUBLIC: read a thread (visitor needs the exact token) ──
            const readMatch = path.match(/^\/api\/chat\/([a-zA-Z0-9]+)$/);
            if (readMatch && method === 'GET') {
                const thread = await getThread(env, readMatch[1]);
                if (!thread || thread.deleted) {
                    return json({ error: 'Not found' }, 404);
                }
                return json({ thread });
            }

            // ── PUBLIC: visitor sends another message in an existing thread ──
            const msgMatch = path.match(/^\/api\/chat\/([a-zA-Z0-9]+)\/message$/);
            if (msgMatch && method === 'POST') {
                const thread = await getThread(env, msgMatch[1]);
                if (!thread || thread.deleted) {
                    return json({ error: 'Not found' }, 404);
                }
                const body = await request.json();
                if (!body.message || !body.message.trim()) {
                    return json({ error: 'Message is required' }, 400);
                }
                thread.messages.push({
                    sender: 'visitor',
                    text: body.message.trim(),
                    timestamp: Date.now(),
                });
                thread.status = computeStatus(thread);
                thread.read = false;
                await saveThread(env, thread);

                ctx.waitUntil(sendTelegram(env,
                    `💬 <b>Follow-up in Drop In</b>\nFor: ${thread.persona}\n\n${body.message.trim().slice(0, 300)}`
                ));

                return json({ ok: true, thread });
            }

            // ── PUBLIC: submit a review ──
            if (path === '/api/reviews/submit' && method === 'POST') {
                const body = await request.json();
                const { emojis, ratedFor, note, identity, stars } = body;

                if (!RATED_FOR_OPTIONS.includes(ratedFor)) {
                    return json({ error: 'Invalid ratedFor value' }, 400);
                }
                const hasEmojis = Array.isArray(emojis) && emojis.length > 0;
                const hasNote = typeof note === 'string' && note.trim().length > 0;
                if (!hasEmojis && !hasNote) {
                    return json({ error: 'A review needs at least an emoji or a note' }, 400);
                }

                const id = randomToken();
                const review = {
                    id,
                    emojis: hasEmojis ? emojis : [],
                    ratedFor,
                    note: hasNote ? note.trim().slice(0, 1000) : '',
                    identity: (identity === 'visitor' || identity === 'member') ? identity : null,
                    stars: (Number.isInteger(stars) && stars >= 1 && stars <= 5) ? stars : null,
                    status: 'pending',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    rejectedAt: null,
                };
                await env.REVIEWS_KV.put(`review:${id}`, JSON.stringify(review));

                ctx.waitUntil(sendTelegram(env,
                    `⭐ <b>New review</b>\nFor: ${ratedFor}\n\n${(review.emojis.join(' ') || '') + (review.note ? '\n' + review.note.slice(0, 200) : '')}`
                ));

                return json({ ok: true, id });
            }

            // ── PUBLIC: approved reviews for the live slider ──
            if (path === '/api/reviews/approved' && method === 'GET') {
                const forFilter = url.searchParams.get('for'); // 'library' | 'vault' | null (all)
                const list = await env.REVIEWS_KV.list({ prefix: 'review:' });
                const reviews = [];
                for (const key of list.keys) {
                    const raw = await env.REVIEWS_KV.get(key.name);
                    if (!raw) continue;
                    const r = JSON.parse(raw);
                    if (r.status !== 'approved') continue;
                    if (forFilter && r.ratedFor !== forFilter && r.ratedFor !== 'both') continue;
                    reviews.push(r);
                }
                reviews.sort((a, b) => b.createdAt - a.createdAt);
                return json({ reviews });
            }

            // ── PUBLIC: fetch all Build Kit entries, grouped by section ──
            if (path === '/api/buildkit/entries' && method === 'GET') {
                const list = await env.BUILDKIT_KV.list({ prefix: 'entry:' });
                const entries = [];
                for (const key of list.keys) {
                    const raw = await env.BUILDKIT_KV.get(key.name);
                    if (raw) entries.push(JSON.parse(raw));
                }
                entries.sort((a, b) => a.order - b.order);
                return json({ entries });
            }

            // ── ADMIN: everything below requires the admin key ──
            if (path.startsWith('/api/admin/')) {
                if (!requireAdmin(request, env)) {
                    return json({ error: 'Unauthorized' }, 401);
                }

                // List all threads (not deleted)
                if (path === '/api/admin/chats' && method === 'GET') {
                    const list = await env.CHAT_KV.list({ prefix: 'thread:' });
                    const threads = [];
                    for (const key of list.keys) {
                        const raw = await env.CHAT_KV.get(key.name);
                        if (!raw) continue;
                        const t = JSON.parse(raw);
                        if (!t.deleted) threads.push(t);
                    }
                    threads.sort((a, b) => b.updatedAt - a.updatedAt);
                    return json({ threads });
                }

                // List recently deleted (within grace window, for restore)
                if (path === '/api/admin/deleted' && method === 'GET') {
                    const list = await env.CHAT_KV.list({ prefix: 'thread:' });
                    const threads = [];
                    for (const key of list.keys) {
                        const raw = await env.CHAT_KV.get(key.name);
                        if (!raw) continue;
                        const t = JSON.parse(raw);
                        if (t.deleted) threads.push(t);
                    }
                    threads.sort((a, b) => b.deletedAt - a.deletedAt);
                    return json({ threads });
                }

                // Get a single thread (admin view)
                const adminReadMatch = path.match(/^\/api\/admin\/chats\/([a-zA-Z0-9]+)$/);
                if (adminReadMatch && method === 'GET') {
                    const thread = await getThread(env, adminReadMatch[1]);
                    if (!thread) return json({ error: 'Not found' }, 404);
                    return json({ thread });
                }

                // Mark a thread as read (called when admin opens it)
                const markReadMatch = path.match(/^\/api\/admin\/chats\/([a-zA-Z0-9]+)\/read$/);
                if (markReadMatch && method === 'POST') {
                    const thread = await getThread(env, markReadMatch[1]);
                    if (!thread) return json({ error: 'Not found' }, 404);
                    if (!thread.read) {
                        thread.read = true;
                        await saveThread(env, thread);
                    }
                    return json({ ok: true, thread });
                }

                // Reply to a thread
                const replyMatch = path.match(/^\/api\/admin\/chats\/([a-zA-Z0-9]+)\/reply$/);
                if (replyMatch && method === 'POST') {
                    const thread = await getThread(env, replyMatch[1]);
                    if (!thread) return json({ error: 'Not found' }, 404);
                    const body = await request.json();
                    if (!body.message || !body.message.trim()) {
                        return json({ error: 'Message is required' }, 400);
                    }
                    thread.messages.push({
                        sender: thread.persona,
                        text: body.message.trim(),
                        timestamp: Date.now(),
                    });
                    thread.status = computeStatus(thread);
                    thread.read = true;
                    await saveThread(env, thread);
                    return json({ ok: true, thread });
                }

                // Soft delete (moves to Recently Deleted, not gone yet)
                const deleteMatch = path.match(/^\/api\/admin\/chats\/([a-zA-Z0-9]+)\/delete$/);
                if (deleteMatch && method === 'POST') {
                    const thread = await getThread(env, deleteMatch[1]);
                    if (!thread) return json({ error: 'Not found' }, 404);
                    thread.deleted = true;
                    thread.deletedAt = Date.now();
                    await saveThread(env, thread);
                    return json({ ok: true });
                }

                // Restore from Recently Deleted
                const restoreMatch = path.match(/^\/api\/admin\/chats\/([a-zA-Z0-9]+)\/restore$/);
                if (restoreMatch && method === 'POST') {
                    const thread = await getThread(env, restoreMatch[1]);
                    if (!thread) return json({ error: 'Not found' }, 404);
                    thread.deleted = false;
                    thread.deletedAt = null;
                    await saveThread(env, thread);
                    return json({ ok: true });
                }

                // Permanently delete right now (skip the grace window)
                const purgeMatch = path.match(/^\/api\/admin\/chats\/([a-zA-Z0-9]+)\/purge$/);
                if (purgeMatch && method === 'POST') {
                    await env.CHAT_KV.delete(`thread:${purgeMatch[1]}`);
                    return json({ ok: true });
                }

                // Set the contact email shown on the public page
                if (path === '/api/admin/config' && method === 'POST') {
                    const body = await request.json();
                    await env.CHAT_KV.put('config:contact_email', body.contactEmail || '');
                    return json({ ok: true });
                }

                // List all reviews (pending, approved, rejected — the
                // page filters by status itself for the three tiles)
                if (path === '/api/admin/reviews' && method === 'GET') {
                    const list = await env.REVIEWS_KV.list({ prefix: 'review:' });
                    const reviews = [];
                    for (const key of list.keys) {
                        const raw = await env.REVIEWS_KV.get(key.name);
                        if (raw) reviews.push(JSON.parse(raw));
                    }
                    reviews.sort((a, b) => b.createdAt - a.createdAt);
                    return json({ reviews });
                }

                // Approve a review — makes it visible on the public slider.
                // Also used to un-reject one (moving it straight back to approved).
                const approveMatch = path.match(/^\/api\/admin\/reviews\/([a-zA-Z0-9]+)\/approve$/);
                if (approveMatch && method === 'POST') {
                    const raw = await env.REVIEWS_KV.get(`review:${approveMatch[1]}`);
                    if (!raw) return json({ error: 'Not found' }, 404);
                    const review = JSON.parse(raw);
                    review.status = 'approved';
                    review.rejectedAt = null;
                    review.updatedAt = Date.now();
                    await env.REVIEWS_KV.put(`review:${review.id}`, JSON.stringify(review));
                    return json({ ok: true });
                }

                // Reject a review — hidden from the public slider, sits in
                // the Rejected tile for DELETE_GRACE_DAYS before auto-purge
                const rejectMatch = path.match(/^\/api\/admin\/reviews\/([a-zA-Z0-9]+)\/reject$/);
                if (rejectMatch && method === 'POST') {
                    const raw = await env.REVIEWS_KV.get(`review:${rejectMatch[1]}`);
                    if (!raw) return json({ error: 'Not found' }, 404);
                    const review = JSON.parse(raw);
                    review.status = 'rejected';
                    review.rejectedAt = Date.now();
                    review.updatedAt = Date.now();
                    await env.REVIEWS_KV.put(`review:${review.id}`, JSON.stringify(review));
                    return json({ ok: true });
                }

                // Permanently delete a review right now, skipping the grace window
                const reviewPurgeMatch = path.match(/^\/api\/admin\/reviews\/([a-zA-Z0-9]+)\/purge$/);
                if (reviewPurgeMatch && method === 'POST') {
                    await env.REVIEWS_KV.delete(`review:${reviewPurgeMatch[1]}`);
                    return json({ ok: true });
                }

                // List all Build Kit entries (admin sees everything, same
                // data the public endpoint returns — nothing hidden here)
                if (path === '/api/admin/buildkit' && method === 'GET') {
                    const list = await env.BUILDKIT_KV.list({ prefix: 'entry:' });
                    const entries = [];
                    for (const key of list.keys) {
                        const raw = await env.BUILDKIT_KV.get(key.name);
                        if (raw) entries.push(JSON.parse(raw));
                    }
                    entries.sort((a, b) => a.order - b.order);
                    return json({ entries });
                }

                // Create a new Build Kit entry
                if (path === '/api/admin/buildkit' && method === 'POST') {
                    const body = await request.json();
                    const { section, title, url } = body;
                    if (!BUILDKIT_SECTIONS.includes(section)) {
                        return json({ error: 'Invalid section' }, 400);
                    }
                    if (!title || !title.trim()) {
                        return json({ error: 'Title is required' }, 400);
                    }
                    // URL is optional — a title-only entry is a valid,
                    // honest way to mention something (e.g. an internal
                    // tool behind a login) without offering a broken link

                    // New entries go to the end of their section
                    const list = await env.BUILDKIT_KV.list({ prefix: 'entry:' });
                    let maxOrder = -1;
                    for (const key of list.keys) {
                        const raw = await env.BUILDKIT_KV.get(key.name);
                        if (!raw) continue;
                        const e = JSON.parse(raw);
                        if (e.section === section && e.order > maxOrder) maxOrder = e.order;
                    }

                    const id = randomToken();
                    const entry = {
                        id, section, title: title.trim(), url: (url || '').trim(),
                        order: maxOrder + 1,
                        createdAt: Date.now(), updatedAt: Date.now(),
                    };
                    await env.BUILDKIT_KV.put(`entry:${id}`, JSON.stringify(entry));
                    return json({ ok: true, entry });
                }

                // Update an existing entry (title, url, or section)
                const buildkitUpdateMatch = path.match(/^\/api\/admin\/buildkit\/([a-zA-Z0-9]+)$/);
                if (buildkitUpdateMatch && method === 'PUT') {
                    const raw = await env.BUILDKIT_KV.get(`entry:${buildkitUpdateMatch[1]}`);
                    if (!raw) return json({ error: 'Not found' }, 404);
                    const entry = JSON.parse(raw);
                    const body = await request.json();
                    if (body.title !== undefined) entry.title = body.title.trim();
                    if (body.url !== undefined) entry.url = body.url.trim();
                    if (body.section !== undefined && BUILDKIT_SECTIONS.includes(body.section)) entry.section = body.section;
                    entry.updatedAt = Date.now();
                    await env.BUILDKIT_KV.put(`entry:${entry.id}`, JSON.stringify(entry));
                    return json({ ok: true, entry });
                }

                // Delete an entry — Build Kit links are low-stakes and
                // easily re-added, so this deletes immediately rather
                // than using the 7-day grace window built for chats/reviews
                const buildkitDeleteMatch = path.match(/^\/api\/admin\/buildkit\/([a-zA-Z0-9]+)$/);
                if (buildkitDeleteMatch && method === 'DELETE') {
                    await env.BUILDKIT_KV.delete(`entry:${buildkitDeleteMatch[1]}`);
                    return json({ ok: true });
                }

                // Swap two entries' order values — used for the simple
                // up/down reordering buttons rather than full drag-and-drop
                if (path === '/api/admin/buildkit/swap' && method === 'POST') {
                    const body = await request.json();
                    const [rawA, rawB] = await Promise.all([
                        env.BUILDKIT_KV.get(`entry:${body.idA}`),
                        env.BUILDKIT_KV.get(`entry:${body.idB}`),
                    ]);
                    if (!rawA || !rawB) return json({ error: 'Not found' }, 404);
                    const entryA = JSON.parse(rawA);
                    const entryB = JSON.parse(rawB);
                    const tempOrder = entryA.order;
                    entryA.order = entryB.order;
                    entryB.order = tempOrder;
                    await Promise.all([
                        env.BUILDKIT_KV.put(`entry:${entryA.id}`, JSON.stringify(entryA)),
                        env.BUILDKIT_KV.put(`entry:${entryB.id}`, JSON.stringify(entryB)),
                    ]);
                    return json({ ok: true });
                }

                return json({ error: 'Not found' }, 404);
            }

            return json({ error: 'Not found' }, 404);
        } catch (error) {
            console.error('Worker error:', error);
            return json({ error: error.message }, 500);
        }
    },

    // ── Daily cleanup: permanently remove anything soft-deleted more than
    //    DELETE_GRACE_DAYS ago — chat threads AND rejected reviews. This is
    //    the actual "safety net" — Cloudflare itself does not keep any
    //    backup of deleted KV data, so this grace window is entirely our
    //    own doing, not something Cloudflare provides.
    async scheduled(event, env, ctx) {
        const cutoff = Date.now() - DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000;

        const threadList = await env.CHAT_KV.list({ prefix: 'thread:' });
        let purgedThreads = 0;
        for (const key of threadList.keys) {
            const raw = await env.CHAT_KV.get(key.name);
            if (!raw) continue;
            const t = JSON.parse(raw);
            if (t.deleted && t.deletedAt && t.deletedAt < cutoff) {
                await env.CHAT_KV.delete(key.name);
                purgedThreads++;
            }
        }

        const reviewList = await env.REVIEWS_KV.list({ prefix: 'review:' });
        let purgedReviews = 0;
        for (const key of reviewList.keys) {
            const raw = await env.REVIEWS_KV.get(key.name);
            if (!raw) continue;
            const r = JSON.parse(raw);
            if (r.status === 'rejected' && r.rejectedAt && r.rejectedAt < cutoff) {
                await env.REVIEWS_KV.delete(key.name);
                purgedReviews++;
            }
        }

        console.log(`Daily purge complete — removed ${purgedThreads} thread(s), ${purgedReviews} review(s).`);
    },
};
