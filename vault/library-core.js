/**
 * Aurion's Vault — Core JavaScript
 * True clone of root library-core.js — adapted for vault tables only.
 *
 * Changes from root library-core.js:
 *   1. Uses vaultClient (vault-supabase-client.js) instead of supabaseClient
 *   2. initVaultSupabase() instead of initSupabase()
 *   3. Password queries → vault_folder_passwords instead of folder_passwords
 *   4. updateVaultNav() called on init to show/hide toolbar buttons
 *   5. Flipbook/presentation paths prefixed with ../ (subfolder aware)
 *   6. getTypeIcon() extended with vault content types
 *   7. openContent() extended with vault types → window.open (no iframe modal)
 *   8. No logInteraction() call (vault_content has no user_interactions table)
 *   9. displayContent/displayViewer shows/hides foldersSection and contentViewer
 *
 * Built by Claude Sonnet 4.6 × Chef Anica — 3C Thread To Success
 */

// ==================== GLOBAL STATE ====================
let currentFolder = null;
let currentContentId = null;
let folders = [];
let allContent = [];
let viewMode = 'grid';
let darkMode = false;
let currentUser = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🥷 Aurion\'s Vault initializing...');

    // Load dark mode preference
    darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) document.body.classList.add('dark-mode');

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const folderId  = urlParams.get('folder');
    const contentId = urlParams.get('content');

    // Update toolbar navigation based on context
    updateVaultNav(folderId || contentId);

    // Initialize vault Supabase client
    await initVaultSupabase();

    // Check if user is logged in (owner bypass)
    await checkCurrentUser();

    // Load vault folders
    await loadFolders();

    if (contentId) {
        await loadSingleContent(contentId);
    } else if (folderId) {
        await loadFolderContent(folderId);
    } else {
        await loadAllContent();
    }
});

// ==================== VAULT NAVIGATION ====================
/**
 * Toolbar button logic:
 *   Root (no params): folderIconBtn hidden, publicLibBtn visible
 *   Inside folder or content: folderIconBtn visible, publicLibBtn visible
 */
function updateVaultNav(isInsideFolder) {
    const folderBtn = document.getElementById('folderIconBtn');
    const publicBtn = document.getElementById('publicLibBtn');

    if (folderBtn) {
        folderBtn.style.display = isInsideFolder ? 'flex' : 'none';
    }
    if (publicBtn) {
        publicBtn.style.display = 'flex'; // Always visible
    }
}

// ==================== SUPABASE INITIALIZATION ====================
async function initVaultSupabase() {
    if (!CONFIG || !CONFIG.supabase || !CONFIG.supabase.url) {
        console.error('Supabase configuration not found');
        return;
    }
    try {
        await vaultClient.init(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        console.log('✅ Vault Supabase connected');
    } catch (error) {
        console.error('❌ Vault Supabase connection failed:', error);
    }
}

// ==================== DATA LOADING ====================
async function loadFolders() {
    try {
        folders = await vaultClient.getFolders();
        displayFolders();
        console.log('📁 Vault: Loaded', folders.length, 'folders');
    } catch (error) {
        console.error('Error loading vault folders:', error);
        const el = document.getElementById('folderList');
        if (el) el.innerHTML = '<p class="loading">Error loading folders</p>';
    }
}

async function loadAllContent() {
    try {
        allContent = [];
        for (const folder of folders) {
            if (isFolderPrivate(folder)) {
                if (!isOwner()) {
                    if (!checkPrivateFolderAccess(folder)) {
                        console.log('🔒 Skipping private vault folder:', folder.title);
                        continue;
                    }
                }
            }
            const content = await vaultClient.getContentByFolder(folder.id);
            allContent.push(...content);
        }

        currentFolder = null;
        const titleEl = document.getElementById('contentTitle');
        if (titleEl) titleEl.textContent = 'All Content';
        displayContent(allContent);
        console.log('📄 Vault: Loaded', allContent.length, 'content items');
    } catch (error) {
        console.error('Error loading vault content:', error);
        const el = document.getElementById('contentGrid');
        if (el) el.innerHTML = '<p class="loading">Error loading content</p>';
    }
}

async function loadFolderContent(folderId) {
    try {
        const folder = folders.find(f => f.id === folderId || f.slug === folderId);
        if (!folder) {
            console.error('Vault folder not found:', folderId);
            return;
        }

        if (isFolderPrivate(folder)) {
            if (!isOwner()) {
                if (!checkPrivateFolderAccess(folder)) {
                    console.warn('🔒 Access denied to private vault folder:', folder.title);
                    window.location.href = window.location.pathname;
                    setTimeout(() => { promptForFolderPassword(folder); }, 100);
                    return;
                }
            } else {
                console.log('👑 Owner access — bypassing password for:', folder.title);
            }
        }

        currentFolder = folder;
        const content = await vaultClient.getContentByFolder(folder.id);

        const titleEl = document.getElementById('contentTitle');
        if (titleEl) titleEl.textContent = folder.title;
        displayContent(content);

        // Highlight folder in nav
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.folderId === folder.id);
        });

        console.log('📁 Vault: Loaded folder:', folder.title, '(' + content.length + ' items)');
    } catch (error) {
        console.error('Error loading vault folder content:', error);
    }
}

async function loadSingleContent(contentId) {
    try {
        const content = await vaultClient.getContent(contentId);

        // Hide folder nav
        const folderNav = document.getElementById('folderNav');
        if (folderNav) folderNav.style.display = 'none';

        const titleEl = document.getElementById('contentTitle');
        if (titleEl) titleEl.textContent = content.title;
        displayContent([content]);

        // Auto-open
        setTimeout(() => openContent(content), 500);

        console.log('📄 Vault: Loaded single content:', content.title);
    } catch (error) {
        console.error('Error loading vault content:', error);
    }
}

// ==================== UI DISPLAY ====================
function displayFolders() {
    const container = document.getElementById('foldersGrid');

    if (!container) {
        console.error('Vault folders container not found');
        return;
    }

    if (folders.length === 0) {
        container.innerHTML = '<p class="loading" style="grid-column: 1/-1; text-align: center; color: #999;">No folders available</p>';
        return;
    }

    // Show public root folders only
    const publicRootFolders = folders.filter(f => {
        const isRoot   = !f.parent_id && f.folder_type === 'root';
        const isPublic = f.is_public !== false;
        return isRoot && isPublic;
    }).sort((a, b) => a.title.localeCompare(b.title));

    console.log('📊 Vault public folders:', publicRootFolders.length, publicRootFolders.map(f => f.title));

    function getTotalItemCount(folderId) {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return 0;
        let count = folder.actual_item_count || 0;
        const subfolders = folders.filter(f => f.parent_id === folderId);
        for (const subfolder of subfolders) { count += getTotalItemCount(subfolder.id); }
        return count;
    }

    if (publicRootFolders.length === 0) {
        container.innerHTML = '<p class="loading" style="grid-column: 1/-1; text-align: center; color: #999;">No public vault collections available</p>';
    } else {
        const html = publicRootFolders.map(folder => {
            const subfolders      = folders.filter(f => f.parent_id === folder.id);
            const subfoldersCount = subfolders.length;
            const displayURL      = folder.table_name;
            const directItemCount = folder.actual_item_count || 0;

            let countLabel = subfoldersCount > 0
                ? `${subfoldersCount} subfolder${subfoldersCount !== 1 ? 's' : ''}, ${directItemCount} item${directItemCount !== 1 ? 's' : ''}`
                : `${directItemCount} item${directItemCount !== 1 ? 's' : ''}`;

            const viewContentButton = directItemCount > 0
                ? `<button onclick="event.stopPropagation(); window.location.href='?folder=${folder.slug}';" style="margin-top: 8px; padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">📄 View Content</button>`
                : '';

            return `
                <div class="folder-card-item" onclick="handleFolderClick('${folder.slug}')">
                    <div class="folder-icon" style="font-size:40px;">📁</div>
                    <div class="folder-title">${escapeHtml(folder.title)}</div>
                    <div class="folder-details">${countLabel}</div>
                    <div class="folder-slug">${displayURL}</div>
                    ${viewContentButton}
                </div>
            `;
        }).join('');
        container.innerHTML = html;
    }
}

function displayContent(content) {
    // Show content viewer, hide folders section
    const foldersSection = document.getElementById('foldersSection');
    const contentViewer  = document.getElementById('contentViewer');
    if (foldersSection) foldersSection.style.display = 'none';
    if (contentViewer)  contentViewer.style.display  = 'block';

    const container = document.getElementById('contentGrid');
    if (!container) return;

    container.className = 'content-grid' + (viewMode === 'list' ? ' list-view' : '');

    if (content.length === 0) {
        container.innerHTML = '<p class="loading">No content available</p>';
        return;
    }

    const html = content.map(item => {
        const thumbnailHtml = item.thumbnail_url
            ? `<img data-src="${item.thumbnail_url}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="content-thumbnail lazy-thumbnail" alt="${escapeHtml(item.title)}" loading="lazy">`
            : `<div class="content-thumbnail">${getTypeIcon(item.type)}</div>`;

        return `
            <div class="content-card" onclick="openContent(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                ${thumbnailHtml}
                <div class="content-info">
                    <span class="content-type-badge badge-${item.type}">${item.type}</span>
                    <div class="content-title">${escapeHtml(item.title)}</div>
                    ${item.description ? `<div class="content-description">${escapeHtml(item.description)}</div>` : ''}
                    <div class="content-meta">
                        <span>👁️ ${item.view_count || 0} views</span>
                        ${item.external_url ? '<span>🔗 Has link</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    setTimeout(() => observeLazyThumbnails(), 0);
}

// ==================== FOLDER SELECTION ====================
async function selectFolder(folderId) {
    await loadFolderContent(folderId);
}

// ==================== CONTENT OPENING ====================
async function openContent(contentData) {
    const content = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;

    currentContentId = content.id;

    // Increment view count
    await vaultClient.incrementViewCount(content.id);

    // Show right viewer on mobile + display content info
    showMobileViewer();
    displayInViewer(content);

    // Open based on type
    switch (content.type) {

        case 'pdf':
            openPdfViewer(content);
            break;

        case 'flipbook':
            if (content.url) {
                window.open(`../flipbook-viewer.html?manifest=${encodeURIComponent(content.url)}`, '_blank', 'width=1200,height=800');
            } else if (content.id) {
                window.open(`../flipbook-viewer.html?content=${content.id}`, '_blank', 'width=1200,height=800');
            } else {
                alert('Flipbook data not available');
            }
            break;

        case 'presentation':
            if (content.url) {
                window.open(`../presentation-viewer.html?manifest=${encodeURIComponent(content.url)}`, '_blank', 'width=1200,height=800');
            } else if (content.id) {
                window.open(`../presentation-viewer.html?content=${content.id}`, '_blank', 'width=1200,height=800');
            } else {
                alert('Presentation data not available');
            }
            break;

        case 'video':
            openMediaPlayer(content, 'video');
            break;

        case 'audio':
            openMediaPlayer(content, 'audio');
            break;

        case 'image':
        case 'gif':
            openMediaPlayer(content, 'image');
            break;

        // Vault interactive tools — navigate same page so back button returns to vault
        case 'quiz':
        case 'card-game':
        case 'spin-wheel':
        case 'landing-page':
        case 'link':
            if (content.url) {
                window.location.href = content.url;
            } else if (content.external_url) {
                window.location.href = content.external_url;
            }
            break;

        default:
            if (content.url) {
                window.open(content.url, '_blank');
            }
    }

    // If has external_url, offer to open it
    if (content.external_url && content.type !== 'link') {
        setTimeout(() => {
            if (confirm('This content has an external reference link. Open it?')) {
                openLinkInModal(content.external_url, 'Reference: ' + content.title);
            }
        }, 1000);
    }
}

// ==================== MEDIA PLAYER ====================
function openMediaPlayer(content, type) {
    const modal     = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    const titleEl   = document.getElementById('mediaTitle');

    titleEl.textContent = content.title;
    const url = content.url;
    let html = '';

    switch (type) {
        case 'video':
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const videoId = extractYouTubeId(url);
                html = `<iframe width="800" height="450" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
            } else {
                html = `<video controls style="max-width: 100%; max-height: 70vh;">
                    <source src="${url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
            }
            break;
        case 'audio':
            html = `<audio controls style="width: 100%;">
                <source src="${url}" type="audio/mpeg">
                Your browser does not support the audio tag.
            </audio>`;
            break;
        case 'image':
            html = `<img src="${url}" style="max-width: 100%; max-height: 70vh;" alt="${escapeHtml(content.title)}">`;
            break;
    }

    container.innerHTML = html;
    modal.classList.add('active');
}

function closeMediaPlayer() {
    const modal     = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    modal.classList.remove('active');
    container.innerHTML = '';
}

// ==================== FLIPBOOK VIEWER ====================
function openFlipbookViewer(content) {
    // Priority 1: Use Cloudflare R2 manifest URL (fast, public)
    if (content.url) {
        window.open(`../flipbook-viewer.html?manifest=${encodeURIComponent(content.url)}`, '_blank', 'width=1200,height=800');
    }
    // Priority 2: Fallback to content ID
    else if (content.id) {
        window.open(`../flipbook-viewer.html?content=${content.id}`, '_blank', 'width=1200,height=800');
    }
    else {
        alert('Flipbook data not available');
    }
}

// ==================== PRESENTATION VIEWER ====================
function openPresentationViewer(content) {
    // Priority 1: Use Cloudflare R2 manifest URL (fast, public)
    if (content.url) {
        window.open(`../presentation-viewer.html?manifest=${encodeURIComponent(content.url)}`, '_blank', 'width=1200,height=800');
    }
    // Priority 2: Fallback to content ID
    else if (content.id) {
        window.open(`../presentation-viewer.html?content=${content.id}`, '_blank', 'width=1200,height=800');
    }
    else {
        alert('Presentation data not available');
    }
}

// ==================== LINK MODAL (DRAGGABLE) ====================
function openLinkInModal(url, title = 'External Link') {
    const modal   = document.getElementById('linkModal');
    const frame   = document.getElementById('linkFrame');
    const titleEl = document.getElementById('linkModalTitle');

    titleEl.textContent = title;
    frame.src = url;

    modal.style.left      = '50%';
    modal.style.top       = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width     = '800px';
    modal.style.height    = '600px';
    modal.style.display   = 'flex';

    makeDraggable(modal);
}

function closeLinkModal() {
    const modal = document.getElementById('linkModal');
    const frame = document.getElementById('linkFrame');
    modal.style.display = 'none';
    frame.src = '';
}

function makeDraggable(element) {
    const header = element.querySelector('.link-modal-header');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top       = (element.offsetTop - pos2) + 'px';
        element.style.left      = (element.offsetLeft - pos1) + 'px';
        element.style.transform = 'none';
    }

    function closeDragElement() {
        document.onmouseup   = null;
        document.onmousemove = null;
    }
}

document.addEventListener('click', (e) => {
    const linkModal = document.getElementById('linkModal');
    if (e.target === linkModal) closeLinkModal();
});

// ==================== VIEW TOGGLE ====================
function setView(mode) {
    viewMode = mode;

    const gridBtn = document.getElementById('gridBtn');
    const listBtn = document.getElementById('listBtn');
    if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
    if (listBtn) listBtn.classList.toggle('active', mode === 'list');

    const container = document.getElementById('contentGrid');
    if (container) container.className = 'content-grid' + (mode === 'list' ? ' list-view' : '');
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
}

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeIcon(type) {
    const icons = {
        pdf:            '📄',
        flipbook:       '📖',
        presentation:   '📊',
        video:          '🎥',
        image:          '🖼️',
        audio:          '🎵',
        gif:            '🎞️',
        link:           '🔗',
        quiz:           '🧠',
        'card-game':    '🃏',
        'spin-wheel':   '🎡',
        'landing-page': '🚀'
    };
    return icons[type] || '📎';
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match  = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ==================== PLAYBACK MEMORY ====================
function savePlaybackPosition(contentId, position) {
    localStorage.setItem(`playback_${contentId}`, JSON.stringify({ position, timestamp: Date.now() }));
}

function getPlaybackPosition(contentId) {
    const data = localStorage.getItem(`playback_${contentId}`);
    return data ? JSON.parse(data) : null;
}

// ==================== LAZY LOADING ====================
let imageObserver = null;

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.style.opacity    = '0';
                        img.style.transition = 'opacity 0.3s ease-in';
                        img.src = img.dataset.src;
                        img.onload = () => {
                            img.style.opacity = '1';
                            img.classList.remove('lazy-thumbnail');
                        };
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, { rootMargin: '50px' });
    }
}

function observeLazyThumbnails() {
    if (imageObserver) {
        document.querySelectorAll('img.lazy-thumbnail[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

initLazyLoading();

// ==================== PRIVATE FOLDER PASSWORD MANAGEMENT ====================
let pendingPrivateFolder = null;

function isOwner() {
    if (!currentUser || !currentUser.email) return false;
    const ownerEmail = CONFIG?.app?.ownerEmail;
    if (!ownerEmail) return false;
    return currentUser.email.toLowerCase() === ownerEmail.toLowerCase();
}

async function checkCurrentUser() {
    try {
        if (!vaultClient || !vaultClient.client) return;
        const { data: { user } } = await vaultClient.client.auth.getUser();
        currentUser = user;
        if (user) {
            console.log('👤 Vault: Logged in as:', user.email);
            if (isOwner()) console.log('👑 Owner access granted');
        }
    } catch (error) {
        console.error('Error checking vault user:', error);
        currentUser = null;
    }
}

function isFolderPrivate(folder) {
    return folder && folder.is_public === false;
}

function promptForFolderPassword(folder) {
    pendingPrivateFolder = folder;

    const modal       = document.getElementById('passwordPromptModal');
    const folderNameEl = document.getElementById('passwordPromptFolderName');
    const inputEl     = document.getElementById('passwordPromptInput');
    const errorEl     = document.getElementById('passwordError');

    folderNameEl.textContent = `Enter password to access: ${folder.title}`;
    inputEl.value = '';
    errorEl.style.display = 'none';

    modal.style.display = 'flex';
    inputEl.focus();

    inputEl.onkeypress = (e) => { if (e.key === 'Enter') submitFolderPassword(); };
}

async function submitFolderPassword() {
    if (!pendingPrivateFolder) return;

    const inputEl  = document.getElementById('passwordPromptInput');
    const errorEl  = document.getElementById('passwordError');
    const password = inputEl.value.trim();

    if (!password) {
        errorEl.textContent  = 'Please enter a password';
        errorEl.style.display = 'block';
        return;
    }

    try {
        // Query vault_folder_passwords — not folder_passwords
        const { data: passwords, error } = await vaultClient.client
            .from('vault_folder_passwords')
            .select('*')
            .eq('folder_id', pendingPrivateFolder.id)
            .eq('is_active', true);

        if (error) throw error;

        if (!passwords || passwords.length === 0) {
            errorEl.textContent  = 'No active passwords for this collection';
            errorEl.style.display = 'block';
            return;
        }

        let passwordValid = false;
        for (const pwd of passwords) {
            if (pwd.expires_at && new Date(pwd.expires_at) < new Date()) continue;
            const isValid = await PasswordUtils.verifyPassword(password, pwd.password_hash);
            if (isValid) { passwordValid = true; break; }
        }

        if (passwordValid) {
            PasswordUtils.grantAccess(pendingPrivateFolder.id);
            closePasswordPrompt();
            window.location.href = `?folder=${pendingPrivateFolder.slug}`;
        } else {
            errorEl.textContent  = '❌ Invalid password';
            errorEl.style.display = 'block';
            inputEl.value = '';
            inputEl.focus();
        }

    } catch (error) {
        console.error('Error validating vault password:', error);
        errorEl.textContent  = 'Error validating password';
        errorEl.style.display = 'block';
    }
}

function closePasswordPrompt() {
    const modal = document.getElementById('passwordPromptModal');
    modal.style.display = 'none';
    pendingPrivateFolder = null;
}

function checkPrivateFolderAccess(folder) {
    if (!isFolderPrivate(folder)) return true;
    return PasswordUtils.hasAccess(folder.id);
}

function handleFolderClick(folderSlug) {
    const folder = folders.find(f => f.slug === folderSlug);
    if (!folder) {
        window.location.href = `?folder=${folderSlug}`;
        return;
    }

    if (isFolderPrivate(folder) && isOwner()) {
        console.log('👑 Owner bypassing password for:', folder.title);
        window.location.href = `?folder=${folderSlug}`;
        return;
    }

    if (isFolderPrivate(folder) && !checkPrivateFolderAccess(folder)) {
        promptForFolderPassword(folder);
    } else {
        window.location.href = `?folder=${folderSlug}`;
    }
}

// ==================== MOBILE VIEWER ====================
/**
 * Show right viewer panel on mobile and display mobile back button
 */
function showMobileViewer() {
    const rightViewer   = document.getElementById('rightViewer');
    const mobileBackBtn = document.getElementById('mobileBackBtn');
    if (rightViewer)   rightViewer.classList.add('active');
    if (mobileBackBtn) mobileBackBtn.style.display = 'block';
}

// ==================== CONTENT VIEWER DISPLAY ====================
/**
 * Display selected content in the right viewer panel
 * Shows title, description, type badge and triggers comments load
 */
function displayInViewer(content) {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;

    const icon = getTypeIcon(content.type);

    viewer.innerHTML = `
        <h2 style="color:#ffffff; font-weight:600; text-shadow:0 0 8px rgba(255,255,255,0.5); margin-bottom:10px;">
            ${icon} ${escapeHtml(content.title)}
        </h2>
        ${content.description ? `<p class="viewer-desc">${escapeHtml(content.description)}</p>` : ''}
        <div style="margin-bottom:16px;">
            <span class="content-type-badge">${content.type.toUpperCase()}</span>
            <span style="font-size:11px; color:var(--text-tertiary); margin-left:8px;">👁️ ${content.view_count || 0} views</span>
        </div>
        <div id="viewerActions"></div>
    `;

    // Load comments below viewer
    loadComments(content.id);

    // Show comments section
    const commentsSection = document.getElementById('commentsSection');
    if (commentsSection) commentsSection.style.display = 'block';
}

// ==================== COMMENTS ====================
/**
 * Load comments for a vault content item from vault_comments table
 */
async function loadComments(contentId) {
    const commentsList = document.getElementById('commentsList');
    const commentCount = document.getElementById('commentCount');
    if (!commentsList) return;

    commentsList.innerHTML = '<div class="no-comments">Loading comments...</div>';

    try {
        const { data: comments, error } = await vaultClient.client
            .from('vault_comments')
            .select('*')
            .eq('content_id', contentId)
            .eq('is_approved', true)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const count = comments ? comments.length : 0;
        if (commentCount) commentCount.textContent = count;

        if (count === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${escapeHtml(comment.author_name)}</span>
                    <span class="comment-date">${formatDate(comment.created_at)}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment_text)}</div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Error loading vault comments:', error);
        commentsList.innerHTML = '<div class="no-comments">Error loading comments.</div>';
    }
}

/**
 * Submit a new comment to vault_comments table
 */
async function submitComment() {
    const authorName  = document.getElementById('commentAuthorName').value.trim();
    const authorEmail = document.getElementById('commentAuthorEmail').value.trim();
    const commentText = document.getElementById('commentText').value.trim();
    const submitBtn   = document.getElementById('submitCommentBtn');

    if (!authorName || !commentText) {
        alert('Please fill in your name and comment.');
        return;
    }

    if (!currentContentId) {
        alert('No content selected for commenting.');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        const { error } = await vaultClient.client
            .from('vault_comments')
            .insert([{
                content_id:   currentContentId,
                author_name:  authorName,
                author_email: authorEmail || null,
                comment_text: commentText,
                is_approved:  true
            }]);

        if (error) throw error;

        // Show success
        const successMsg = document.getElementById('commentSuccessMsg');
        if (successMsg) {
            successMsg.style.display = 'block';
            setTimeout(() => { successMsg.style.display = 'none'; }, 5000);
        }

        // Clear form
        document.getElementById('commentAuthorName').value = '';
        document.getElementById('commentAuthorEmail').value = '';
        document.getElementById('commentText').value = '';

        // Reload comments
        await loadComments(currentContentId);

        console.log('✅ Vault comment submitted');

    } catch (error) {
        console.error('❌ Error submitting vault comment:', error);
        alert('Error submitting comment: ' + (error.message || error.toString()));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
    }
}

/**
 * Format date for comment display
 */
function formatDate(dateString) {
    const date    = new Date(dateString);
    const now     = new Date();
    const diffMs  = now - date;
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins  < 1)  return 'Just now';
    if (diffMins  < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays  < 7)  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
