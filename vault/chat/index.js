/**
 * Drop In — 3C Aurion's Vault chat Worker
 * Handles: public chat (start/send/read), admin (list/reply/delete/restore),
 * Telegram notifications, and the daily purge of soft-deleted threads.
 *
 * Bindings required (Settings → Bindings):
 *   CHAT_KV          — KV namespace
 *
 * Variables required (Settings → Variables, encrypted):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   ADMIN_KEY          — any long random string you choose. The admin
 *                        page sends this back on every admin request.
 *                        Treat it like a password — do not share it,
 *                        do not commit it anywhere.
 *
 * Cron Trigger required: 0 14 * * *  (daily purge of old deleted threads)
 *
 * Built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success Cooking Lab 🧪👨‍🍳
 */

const PERSONAS = ['aurion', 'caelum', 'anica'];
const DELETE_GRACE_DAYS = 7;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
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

                return json({ error: 'Not found' }, 404);
            }

            return json({ error: 'Not found' }, 404);
        } catch (error) {
            console.error('Worker error:', error);
            return json({ error: error.message }, 500);
        }
    },

    // ── Daily cleanup: permanently remove anything soft-deleted more than
    //    DELETE_GRACE_DAYS ago. This is the actual "safety net" — Cloudflare
    //    itself does not keep any backup of deleted KV data, so this grace
    //    window is entirely our own doing, not something Cloudflare provides.
    async scheduled(event, env, ctx) {
        const cutoff = Date.now() - DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000;
        const list = await env.CHAT_KV.list({ prefix: 'thread:' });
        let purged = 0;
        for (const key of list.keys) {
            const raw = await env.CHAT_KV.get(key.name);
            if (!raw) continue;
            const t = JSON.parse(raw);
            if (t.deleted && t.deletedAt && t.deletedAt < cutoff) {
                await env.CHAT_KV.delete(key.name);
                purged++;
            }
        }
        console.log(`Daily purge complete — removed ${purged} thread(s).`);
    },
};
