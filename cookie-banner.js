/**
 * 3C Public Library — Cookie Consent Banner
 * ==========================================
 * Drop one <script src="cookie-banner.js"></script> tag on every page.
 * No dependencies. No frameworks. Works standalone.
 *
 * Storage key : '3c_cookie_consent'
 * Values      : 'accepted' | 'declined'
 *
 * Exposes window.CookieConsent for programmatic use:
 *   CookieConsent.getStatus()   → 'accepted' | 'declined' | null
 *   CookieConsent.hasConsented()→ true if accepted
 *   CookieConsent.reset()       → clears consent and reloads banner
 *   CookieConsent.openSettings()→ re-opens the banner/settings modal
 */

(function () {
    'use strict';

    const STORAGE_KEY = '3c_cookie_consent';
    const POLICY_URL  = '/privacy.html';
    const COOKIE_URL  = '/privacy.html#cookies';

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function getStatus() {
        try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }

    function setStatus(value) {
        try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
    }

    function hasConsented() {
        return getStatus() === 'accepted';
    }

    function reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        showBanner();
    }

    // ─── Inject styles ────────────────────────────────────────────────────────

    function injectStyles() {
        if (document.getElementById('3c-cookie-styles')) return;
        const style = document.createElement('style');
        style.id = '3c-cookie-styles';
        style.textContent = `
            /* ── Cookie Banner ── */
            #_3c-cookie-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 99999;
                background: linear-gradient(135deg, #1a0d35 0%, #2d1b69 60%, #1a0d35 100%);
                border-top: 1px solid rgba(155, 89, 182, 0.5);
                box-shadow: 0 -4px 32px rgba(88, 28, 135, 0.4);
                padding: 18px 24px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                animation: _3c-slide-up 0.35s ease;
            }

            @keyframes _3c-slide-up {
                from { transform: translateY(100%); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }

            #_3c-cookie-banner._3c-hide {
                animation: _3c-slide-down 0.3s ease forwards;
            }

            @keyframes _3c-slide-down {
                from { transform: translateY(0);    opacity: 1; }
                to   { transform: translateY(100%); opacity: 0; }
            }

            ._3c-cookie-row {
                display: flex;
                align-items: flex-start;
                gap: 16px;
                flex-wrap: wrap;
            }

            ._3c-cookie-icon {
                font-size: 28px;
                flex-shrink: 0;
                line-height: 1;
                margin-top: 2px;
            }

            ._3c-cookie-text {
                flex: 1;
                min-width: 200px;
            }

            ._3c-cookie-text strong {
                display: block;
                font-size: 15px;
                font-weight: 700;
                color: #c084fc;
                margin-bottom: 5px;
                text-shadow: 0 0 12px rgba(192, 132, 252, 0.4);
            }

            ._3c-cookie-text p {
                font-size: 13px;
                color: #d0c8e8;
                line-height: 1.55;
                margin: 0;
            }

            ._3c-cookie-text a {
                color: #9b59b6;
                text-decoration: underline;
                font-weight: 600;
            }

            ._3c-cookie-text a:hover {
                color: #c084fc;
            }

            ._3c-cookie-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                align-items: center;
                justify-content: flex-end;
                flex-shrink: 0;
            }

            ._3c-btn {
                border: none;
                border-radius: 8px;
                padding: 10px 22px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
                letter-spacing: 0.3px;
                white-space: nowrap;
            }

            ._3c-btn-accept {
                background: linear-gradient(135deg, #9b59b6, #8e44ad);
                color: #ffffff;
                box-shadow: 0 2px 10px rgba(155, 89, 182, 0.4);
            }

            ._3c-btn-accept:hover {
                background: linear-gradient(135deg, #8e44ad, #663399);
                box-shadow: 0 4px 14px rgba(155, 89, 182, 0.55);
                transform: translateY(-1px);
            }

            ._3c-btn-decline {
                background: transparent;
                color: #9b9b9b;
                border: 1px solid rgba(155, 89, 182, 0.3);
            }

            ._3c-btn-decline:hover {
                background: rgba(155, 89, 182, 0.1);
                color: #d0c8e8;
                border-color: rgba(155, 89, 182, 0.5);
            }

            /* ── Settings modal (re-open) ── */
            #_3c-cookie-settings-modal {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 99998;
                background: rgba(10, 14, 39, 0.88);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            }

            #_3c-cookie-settings-modal.active {
                display: flex;
            }

            ._3c-settings-box {
                background: linear-gradient(135deg, #1a0d35 0%, #2d1b69 100%);
                border: 1px solid rgba(155, 89, 182, 0.5);
                border-radius: 16px;
                padding: 32px 28px;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 8px 48px rgba(88, 28, 135, 0.5);
                position: relative;
            }

            ._3c-settings-box h3 {
                color: #c084fc;
                font-size: 18px;
                font-weight: 700;
                margin: 0 0 12px 0;
                text-shadow: 0 0 12px rgba(192, 132, 252, 0.4);
            }

            ._3c-settings-box p {
                font-size: 13px;
                color: #d0c8e8;
                line-height: 1.6;
                margin: 0 0 20px 0;
            }

            ._3c-settings-box a {
                color: #9b59b6;
                text-decoration: underline;
                font-weight: 600;
            }

            ._3c-settings-current {
                background: rgba(155, 89, 182, 0.12);
                border: 1px solid rgba(155, 89, 182, 0.3);
                border-radius: 8px;
                padding: 10px 14px;
                font-size: 12px;
                color: #b0a0c8;
                margin-bottom: 20px;
            }

            ._3c-settings-current span {
                font-weight: 700;
                color: #c084fc;
            }

            ._3c-settings-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            ._3c-close-settings {
                position: absolute;
                top: 14px;
                right: 16px;
                background: none;
                border: none;
                color: #9b59b6;
                font-size: 20px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 6px;
                transition: all 0.2s;
            }

            ._3c-close-settings:hover {
                background: rgba(155, 89, 182, 0.15);
                color: #c084fc;
            }

            /* ── Footer link injected by this script ── */
            ._3c-cookie-footer-link {
                color: #9b59b6 !important;
                font-size: 12px;
                cursor: pointer;
                text-decoration: underline;
                font-weight: 600;
                background: none;
                border: none;
                padding: 0;
                font-family: inherit;
            }

            ._3c-cookie-footer-link:hover {
                color: #c084fc !important;
            }

            /* Responsive */
            @media (max-width: 600px) {
                #_3c-cookie-banner { padding: 14px 16px; }
                ._3c-cookie-actions { justify-content: stretch; width: 100%; }
                ._3c-btn { flex: 1; text-align: center; }
                ._3c-cookie-row { flex-direction: column; gap: 10px; }
            }
        `;
        document.head.appendChild(style);
    }

    // ─── Banner DOM ───────────────────────────────────────────────────────────

    function buildBanner() {
        const banner = document.createElement('div');
        banner.id = '_3c-cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="_3c-cookie-row">
                <div class="_3c-cookie-icon">🍪</div>
                <div class="_3c-cookie-text">
                    <strong>We use cookies on the 3C Public Library</strong>
                    <p>
                        This site uses essential cookies to function and optional cookies to
                        improve your experience. We collect only what's necessary.
                        Read our <a href="${POLICY_URL}" target="_blank" rel="noopener">Privacy Policy</a>
                        and <a href="${COOKIE_URL}" target="_blank" rel="noopener">Cookie Policy</a>
                        to learn more. You can change your preferences at any time.
                    </p>
                </div>
                <div class="_3c-cookie-actions">
                    <button class="_3c-btn _3c-btn-decline" id="_3c-decline-btn">Essential only</button>
                    <button class="_3c-btn _3c-btn-accept" id="_3c-accept-btn">Accept cookies</button>
                </div>
            </div>
        `;
        return banner;
    }

    // ─── Settings modal DOM ───────────────────────────────────────────────────

    function buildSettingsModal() {
        const modal = document.createElement('div');
        modal.id = '_3c-cookie-settings-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Cookie settings');
        modal.innerHTML = `
            <div class="_3c-settings-box">
                <button class="_3c-close-settings" id="_3c-close-settings-btn" title="Close">✕</button>
                <h3>🍪 Cookie Settings</h3>
                <p>
                    We use cookies to keep the library running and to understand how
                    it is used. Essential cookies are always active. Optional cookies
                    help us improve the experience — you can decline them below.
                    See our <a href="${POLICY_URL}" target="_blank" rel="noopener">Privacy Policy</a>
                    for full details.
                </p>
                <div class="_3c-settings-current">
                    Current preference: <span id="_3c-current-status">—</span>
                </div>
                <div class="_3c-settings-actions">
                    <button class="_3c-btn _3c-btn-decline" id="_3c-settings-decline-btn">Essential only</button>
                    <button class="_3c-btn _3c-btn-accept"  id="_3c-settings-accept-btn">Accept cookies</button>
                </div>
            </div>
        `;
        return modal;
    }

    // ─── Show / hide ──────────────────────────────────────────────────────────

    function dismissBanner(status) {
        setStatus(status);
        const banner = document.getElementById('_3c-cookie-banner');
        if (!banner) return;
        banner.classList.add('_3c-hide');
        setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 320);
        console.log('🍪 3C Cookie consent:', status);
    }

    function showBanner() {
        // Don't show if already present
        if (document.getElementById('_3c-cookie-banner')) return;
        const banner = buildBanner();
        document.body.appendChild(banner);

        document.getElementById('_3c-accept-btn').addEventListener('click', function () {
            dismissBanner('accepted');
        });
        document.getElementById('_3c-decline-btn').addEventListener('click', function () {
            dismissBanner('declined');
        });
    }

    function openSettings() {
        let modal = document.getElementById('_3c-cookie-settings-modal');
        if (!modal) {
            modal = buildSettingsModal();
            document.body.appendChild(modal);

            // Wire close button
            document.getElementById('_3c-close-settings-btn').addEventListener('click', function () {
                modal.classList.remove('active');
            });
            // Click outside to close
            modal.addEventListener('click', function (e) {
                if (e.target === modal) modal.classList.remove('active');
            });
            // Accept / decline inside settings
            document.getElementById('_3c-settings-accept-btn').addEventListener('click', function () {
                setStatus('accepted');
                updateSettingsStatus();
                modal.classList.remove('active');
                // Remove banner if it's still showing
                const banner = document.getElementById('_3c-cookie-banner');
                if (banner) dismissBanner('accepted');
                console.log('🍪 3C Cookie consent updated: accepted');
            });
            document.getElementById('_3c-settings-decline-btn').addEventListener('click', function () {
                setStatus('declined');
                updateSettingsStatus();
                modal.classList.remove('active');
                const banner = document.getElementById('_3c-cookie-banner');
                if (banner) dismissBanner('declined');
                console.log('🍪 3C Cookie consent updated: declined');
            });
        }

        updateSettingsStatus();
        modal.classList.add('active');
    }

    function updateSettingsStatus() {
        const el = document.getElementById('_3c-current-status');
        if (!el) return;
        const s = getStatus();
        if      (s === 'accepted') el.textContent = '✅ Cookies accepted';
        else if (s === 'declined') el.textContent = '🚫 Essential only';
        else                       el.textContent = 'Not yet set';
    }

    // ─── Auto-inject footer link ───────────────────────────────────────────────
    // Looks for an existing <footer> — if found, appends the settings link there.
    // If no footer exists, injects a minimal one at the bottom of <body>.

    function injectFooterLink() {
        // Don't inject twice
        if (document.getElementById('_3c-cookie-footer-anchor')) return;

        const link = document.createElement('button');
        link.id = '_3c-cookie-footer-anchor';
        link.className = '_3c-cookie-footer-link';
        link.textContent = 'Cookie Settings';
        link.setAttribute('aria-label', 'Open cookie settings');
        link.addEventListener('click', openSettings);

        // Try to find an existing footer
        const footer = document.querySelector('footer, [data-cookie-footer]');
        if (footer) {
            footer.appendChild(link);
            return;
        }

        // No footer found — create a minimal one
        const footerEl = document.createElement('footer');
        footerEl.style.cssText = `
            text-align: center;
            padding: 16px 20px;
            background: rgba(10, 14, 39, 0.8);
            border-top: 1px solid rgba(155, 89, 182, 0.2);
            margin-top: 40px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            gap: 20px;
        `;

        // Privacy link
        const privLink = document.createElement('a');
        privLink.href = '/privacy.html';
        privLink.textContent = 'Privacy Policy';
        privLink.style.cssText = 'color: #9b59b6; font-size: 12px; font-weight: 600; text-decoration: underline;';
        privLink.target = '_blank';

        // Terms link
        const termsLink = document.createElement('a');
        termsLink.href = '/terms.html';
        termsLink.textContent = 'Terms of Use';
        termsLink.style.cssText = 'color: #9b59b6; font-size: 12px; font-weight: 600; text-decoration: underline;';
        termsLink.target = '_blank';

        // Copyright
        const copy = document.createElement('span');
        copy.style.cssText = 'color: #555; font-size: 11px;';
        copy.textContent = `© ${new Date().getFullYear()} 3C Thread To Success. All rights reserved.`;

        footerEl.appendChild(privLink);
        footerEl.appendChild(termsLink);
        footerEl.appendChild(link);
        footerEl.appendChild(copy);

        document.body.appendChild(footerEl);
    }

    // ─── Boot ─────────────────────────────────────────────────────────────────

    function boot() {
        injectStyles();
        injectFooterLink();

        const status = getStatus();
        if (!status) {
            // No decision yet — show banner
            showBanner();
        }
        // If already decided — banner stays hidden, footer link available for changes
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // ─── Public API ───────────────────────────────────────────────────────────
    window.CookieConsent = {
        getStatus:    getStatus,
        hasConsented: hasConsented,
        reset:        reset,
        openSettings: openSettings
    };

})();
