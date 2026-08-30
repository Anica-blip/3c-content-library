/**
 * auth-guard.js — 3C Public Library / Aurion Vault Admin Auth Guard v1.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Protects admin.html only. Reuses the same "Anica-blip Tools Auth" GitHub
 * OAuth app and the same Supabase project (Aurion 3C Mascot) already used
 * by other 3C tools — no new sign-in system, no second password.
 *
 * HOW IT'S WIRED IN (admin.html):
 * These two lines sit at the very top of <head> — before ALL other scripts:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="auth-guard.js"></script>
 *
 * Nothing else on this domain (library.html, vault.html, etc.) loads this
 * file — those pages stay public, read-only, unaffected.
 * ─────────────────────────────────────────────────────────────────────────────
 * Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica
 * 3C Thread To Success™ Cooking Lab 🧪👨‍🍳
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────
const AUTH_CONFIG = {
  supabaseUrl: 'https://cgxjqsbrditbteqhdyus.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4',   // ← Supabase → Settings → API → anon public
  loginPage:   'https://3c-public-library.org/login.html'
};
// ─────────────────────────────────────────────────────────────────────────────

// Immediately hide page to prevent flash of protected content
document.documentElement.style.visibility = 'hidden';

(async function guardPage() {
  try {
    const client = supabase.createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseKey);
    const { data: { session } } = await client.auth.getSession();

    // No session — send to login
    if (!session) { redirectToLogin(); return; }

    // ✅ Session exists — reveal the page
    document.documentElement.style.visibility = 'visible';

  } catch (err) {
    console.error('[auth-guard] Error:', err);
    redirectToLogin();
  }

  function redirectToLogin(reason) {
    const next = encodeURIComponent(window.location.href);
    const sep  = AUTH_CONFIG.loginPage.includes('?') ? '&' : '?';
    window.location.replace(
      `${AUTH_CONFIG.loginPage}${sep}next=${next}${reason ? '&reason=' + reason : ''}`
    );
  }
})();
