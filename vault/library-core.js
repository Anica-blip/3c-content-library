/**
 * Aurion's Vault — Core JavaScript
 * Cloned from library-core.js and adapted for vault tables:
 *   vault_folders, vault_content, vault_folder_passwords
 *
 * Key differences from library-core.js:
 *   - Uses vaultClient (vault-supabase-client.js) throughout
 *   - Vault content types: quiz, card-game, spin-wheel, landing-page → open in iframe modal
 *   - Flipbook/presentation → relative path ../viewers/
 *   - Password checks against vault_folder_passwords via vaultClient
 *   - No logInteraction (vault_content has no user_interactions table)
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
    console.log('🦅 Aurion\'s Vault initializing...');

    // Load dark mode preference
    darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const folderId  = urlParams.get('folder');
    const contentId = urlParams.get('content');

    // Initialize vault Supabase client
    await initVaultSupabase();

    // Check if user is logged in (for owner bypass)
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
        document.getElementById('folderList').innerHTML = '<p class="loading">Error loading folders</p>';
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
        document.getElementById('contentTitle').textContent = 'All Content';
        displayContent(allContent);
        console.log('📄 Vault: Loaded', allContent.length, 'content items');
    } catch (error) {
        console.error('Error loading vault content:', error);
        document.getElementById('contentGrid').innerHTML = '<p class="loading">Error loading content</p>';
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
                    setTimeout(() => {
                        promptForFolderPassword(folder);
                    }, 100);
                    return;
                }
            } else {
                console.log('👑 Owner access — bypassing password for:', folder.title);
            }
        }

        currentFolder = folder;
        const content = await vaultClient.getContentByFolder(folder.id);

        document.getElementById('contentTitle').textContent = folder.title;
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

        // Hide folder navigation
        document.getElementById('folderNav').style.display = 'none';

        document.getElementById('contentTitle').textContent = content.title;
        displayContent([content]);

        // Auto-open the content
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

    // Show all public root folders
    const publicRootFolders = folders.filter(f => {
        const isRoot   = !f.parent_id && f.folder_type === 'root';
        const isPublic = f.is_public !== false;
        return isRoot && isPublic;
    }).sort((a, b) => a.title.localeCompare(b.title));

    console.log('📊 Vault public folders:', publicRootFolders.length, publicRootFolders.map(f => f.title));

    // Recursive item count helper
    function getTotalItemCount(folderId) {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return 0;
        let count = folder.actual_item_count || 0;
        const subfolders = folders.filter(f => f.parent_id === folderId);
        for (const subfolder of subfolders) {
            count += getTotalItemCount(subfolder.id);
        }
        return count;
    }

    if (publicRootFolders.length === 0) {
        container.innerHTML = '<p class="loading" style="grid-column: 1/-1; text-align: center; color: #999;">No public folders available</p>';
        return;
    }

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
                <div class="folder-icon">🦅</div>
                <div class="folder-title">${escapeHtml(folder.title)}</div>
                <div class="folder-details">${countLabel}</div>
                <div class="folder-slug">${displayURL}</div>
                ${viewContentButton}
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function displayContent(content) {
    const container = document.getElementById('contentGrid');
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

    // Open based on type
    switch (content.type) {

        // ── Vault interactive tools — open in iframe modal ──
        case 'quiz':
        case 'card-game':
        case 'spin-wheel':
        case 'landing-page':
        case 'link':
            if (content.url) {
                openLaunchModal(content.url, content.title);
            } else if (content.external_url) {
                openLaunchModal(content.external_url, content.title);
            }
            break;

        // ── Viewers — relative path from vault/ subfolder ──
        case 'flipbook':
            if (content.url) {
                window.open(`../flipbook-viewer.html?manifest=${encodeURIComponent(content.url)}`, '_blank', 'width=1200,height=800');
            } else if (content.id) {
                window.open(`../flipbook-viewer.html?content=${content.id}`, '_blank', 'width=1200,height=800');
            }
            break;

        case 'presentation':
            if (content.url) {
                window.open(`../presentation-viewer.html?manifest=${encodeURIComponent(content.url)}`, '_blank', 'width=1200,height=800');
            } else if (content.id) {
                window.open(`../presentation-viewer.html?content=${content.id}`, '_blank', 'width=1200,height=800');
            }
            break;

        // ── Standard media ──
        case 'pdf':
            openPdfViewer(content);
            break;

        case 'video':
            openMediaPlayer(content, 'video');
            break;

        case 'audio':
            openMediaPlayer(content, 'audio');
            break;

        case 'image':
            openMediaPlayer(content, 'image');
            break;

        default:
            if (content.url) {
                openLaunchModal(content.url, content.title);
            }
    }
}

// ==================== LAUNCH MODAL (iframe) ====================
/**
 * Opens vault tools (quizzes, games, etc.) in an iframe modal
 * Modal is chief — content loads inside, user stays in the vault
 */
function openLaunchModal(url, title = '') {
    const modal   = document.getElementById('launchModal');
    const frame   = document.getElementById('launchFrame');
    const titleEl = document.getElementById('launchModalTitle');

    if (!modal || !frame) {
        console.error('Launch modal elements not found');
        window.open(url, '_blank');
        return;
    }

    titleEl.textContent = title || 'Aurion\'s Vault';
    frame.src = url;
    modal.classList.add('active');
    console.log('🚀 Vault launch modal opened:', url);
}

function closeLaunchModal() {
    const modal = document.getElementById('launchModal');
    const frame = document.getElementById('launchFrame');

    if (modal) modal.classList.remove('active');
    if (frame) {
        frame.src = 'about:blank';
        setTimeout(() => { frame.src = ''; }, 100);
    }
}

// ==================== PDF VIEWER ====================
function openPdfViewer(content) {
    const modal     = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    const title     = document.getElementById('mediaTitle');

    title.textContent = content.title;
    container.innerHTML = `<iframe src="${content.url}" style="width:100%; height:75vh; border:none; border-radius:8px;"></iframe>`;
    modal.classList.add('active');
}

// ==================== MEDIA PLAYER ====================
function openMediaPlayer(content, type) {
    const modal     = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    const title     = document.getElementById('mediaTitle');

    title.textContent = content.title;

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

// ==================== VIEW TOGGLE ====================
function setView(mode) {
    viewMode = mode;

    document.getElementById('gridBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('listBtn').classList.toggle('active', mode === 'list');

    const container = document.getElementById('contentGrid');
    container.className = 'content-grid' + (mode === 'list' ? ' list-view' : '');
}

// ==================== DARK MODE ====================
function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
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
                        img.style.opacity = '0';
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

    const modal      = document.getElementById('passwordPromptModal');
    const folderName = document.getElementById('passwordPromptFolderName');
    const inputEl    = document.getElementById('passwordPromptInput');
    const errorEl    = document.getElementById('passwordError');

    folderName.textContent = `Enter password to access: ${folder.title}`;
    inputEl.value = '';
    errorEl.style.display = 'none';

    modal.style.display = 'flex';
    inputEl.focus();

    inputEl.onkeypress = (e) => {
        if (e.key === 'Enter') submitFolderPassword();
    };
}

async function submitFolderPassword() {
    if (!pendingPrivateFolder) return;

    const inputEl = document.getElementById('passwordPromptInput');
    const errorEl = document.getElementById('passwordError');
    const password = inputEl.value.trim();

    if (!password) {
        errorEl.textContent = 'Please enter a password';
        errorEl.style.display = 'block';
        return;
    }

    try {
        // Query vault_folder_passwords via vaultClient
        const { data: passwords, error } = await vaultClient.client
            .from('vault_folder_passwords')
            .select('*')
            .eq('folder_id', pendingPrivateFolder.id)
            .eq('is_active', true);

        if (error) throw error;

        if (!passwords || passwords.length === 0) {
            errorEl.textContent = 'No active passwords for this folder';
            errorEl.style.display = 'block';
            return;
        }

        let passwordValid = false;
        for (const pwd of passwords) {
            if (pwd.expires_at && new Date(pwd.expires_at) < new Date()) continue;
            const isValid = await PasswordUtils.verifyPassword(password, pwd.password_hash);
            if (isValid) {
                passwordValid = true;
                break;
            }
        }

        if (passwordValid) {
            PasswordUtils.grantAccess(pendingPrivateFolder.id);
            closePasswordPrompt();
            window.location.href = `?folder=${pendingPrivateFolder.slug}`;
        } else {
            errorEl.textContent = '❌ Invalid password';
            errorEl.style.display = 'block';
            inputEl.value = '';
            inputEl.focus();
        }

    } catch (error) {
        console.error('Error validating vault password:', error);
        errorEl.textContent = 'Error validating password';
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

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeIcon(type) {
    const icons = {
        quiz:           '🧠',
        'card-game':    '🃏',
        'spin-wheel':   '🎡',
        'landing-page': '🚀',
        pdf:            '📄',
        flipbook:       '📖',
        presentation:   '📊',
        video:          '🎥',
        image:          '🖼️',
        audio:          '🎵',
        link:           '🔗'
    };
    return icons[type] || '📎';
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match  = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Close launch modal when clicking outside
document.addEventListener('click', (e) => {
    const launchModal = document.getElementById('launchModal');
    if (e.target === launchModal) closeLaunchModal();

    const linkModal = document.getElementById('linkModal');
    if (e.target === linkModal) closeLinkModal();
});

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
        document.onmouseup   = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top       = (element.offsetTop  - pos2) + 'px';
        element.style.left      = (element.offsetLeft - pos1) + 'px';
        element.style.transform = 'none';
    }

    function closeDragElement() {
        document.onmouseup   = null;
        document.onmousemove = null;
    }
}
