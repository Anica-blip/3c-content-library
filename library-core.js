/**
 * 3C Public Library - Core JavaScript
 * Read-only viewer with enhanced features
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
    console.log('🚀 Library initializing...');
    
    // Load dark mode preference
    darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const folderId = urlParams.get('folder');
    const contentId = urlParams.get('content');
    
    // Initialize Supabase
    await initSupabase();
    
    // Check if user is logged in (for owner bypass)
    await checkCurrentUser();
    
    // Load data
    await loadFolders();
    
    if (contentId) {
        // Direct content link - show only this item
        await loadSingleContent(contentId);
    } else if (folderId) {
        // Folder link - show folder content
        await loadFolderContent(folderId);
    } else {
        // Show all content
        await loadAllContent();
    }
});

// ==================== SUPABASE INITIALIZATION ====================
async function initSupabase() {
    if (!CONFIG || !CONFIG.supabase || !CONFIG.supabase.url) {
        console.error('Supabase configuration not found');
        return;
    }
    
    try {
        await supabaseClient.init(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        console.log('✅ Supabase connected');
    } catch (error) {
        console.error('❌ Supabase connection failed:', error);
    }
}

// ==================== DATA LOADING ====================
async function loadFolders() {
    try {
        folders = await supabaseClient.getFolders();
        displayFolders();
        console.log('📁 Loaded', folders.length, 'folders');
    } catch (error) {
        console.error('Error loading folders:', error);
        document.getElementById('folderList').innerHTML = '<p class="loading">Error loading folders</p>';
    }
}

async function loadAllContent() {
    try {
        allContent = [];
        for (const folder of folders) {
            // CRITICAL: Skip private folders unless user has access
            if (isFolderPrivate(folder)) {
                // Owner bypass
                if (!isOwner()) {
                    // Check if user has unlocked this folder
                    if (!checkPrivateFolderAccess(folder)) {
                        console.log('🔒 Skipping private folder:', folder.title);
                        continue; // Skip this folder
                    }
                }
            }
            
            const content = await supabaseClient.getContentByFolder(folder.id);
            allContent.push(...content);
        }
        
        currentFolder = null;
        document.getElementById('contentTitle').textContent = 'All Content';
        displayContent(allContent);
        console.log('📄 Loaded', allContent.length, 'content items');
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('contentGrid').innerHTML = '<p class="loading">Error loading content</p>';
    }
}

async function loadFolderContent(folderId) {
    try {
        const folder = folders.find(f => f.id === folderId || f.slug === folderId);
        if (!folder) {
            console.error('Folder not found:', folderId);
            return;
        }
        
        // CRITICAL: Check if folder is private and user has access
        if (isFolderPrivate(folder)) {
            // Check if user is owner/admin (bypass password)
            if (!isOwner()) {
                // Check if user has unlocked this folder
                if (!checkPrivateFolderAccess(folder)) {
                    console.warn('🔒 Access denied to private folder:', folder.title);
                    // Redirect to home and show password prompt
                    window.location.href = window.location.pathname;
                    setTimeout(() => {
                        promptForFolderPassword(folder);
                    }, 100);
                    return;
                }
            } else {
                console.log('👑 Owner access - bypassing password for:', folder.title);
            }
        }
        
        currentFolder = folder;
        const content = await supabaseClient.getContentByFolder(folder.id);
        
        document.getElementById('contentTitle').textContent = folder.title;
        displayContent(content);
        
        // Highlight folder in nav
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.toggle('active', item.dataset.folderId === folder.id);
        });
        
        console.log('📁 Loaded folder:', folder.title, '(' + content.length + ' items)');
    } catch (error) {
        console.error('Error loading folder content:', error);
    }
}

async function loadSingleContent(contentId) {
    try {
        const content = await supabaseClient.getContent(contentId);
        
        // Hide folder navigation
        document.getElementById('folderNav').style.display = 'none';
        
        document.getElementById('contentTitle').textContent = content.title;
        displayContent([content]);
        
        // Auto-open the content
        setTimeout(() => openContent(content), 500);
        
        console.log('📄 Loaded single content:', content.title);
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// ==================== UI DISPLAY ====================
function displayFolders() {
    const container = document.getElementById('foldersGrid');
    
    if (!container) {
        console.error('Folders container not found');
        return;
    }
    
    if (folders.length === 0) {
        container.innerHTML = '<p class="loading" style="grid-column: 1/-1; text-align: center; color: #999;">No folders available</p>';
        return;
    }
    
    // Only show PUBLIC root folders (is_public !== false) and exclude 'Testing' folder
    const publicRootFolders = folders.filter(f => {
        const isRoot = !f.parent_id && f.folder_type === 'root';
        const isPublic = f.is_public !== false; // true or null = public
        const notTesting = f.title !== 'Testing' && f.slug !== 'intermediary_level.03'; // Exclude Testing folder
        return isRoot && isPublic && notTesting;
    }).sort((a, b) => {
        const t = s => s.toLowerCase();
        const PIN1 = '3c bulletin board';
        const PIN2 = 'beginners';
        const aIsFirst  = t(a.title) === PIN1;
        const bIsFirst  = t(b.title) === PIN1;
        const aIsSecond = t(a.title) === PIN2;
        const bIsSecond = t(b.title) === PIN2;
        if (aIsFirst)  return -1;
        if (bIsFirst)  return 1;
        if (aIsSecond) return -1;
        if (bIsSecond) return 1;
        return a.title.localeCompare(b.title);
    });
    
    console.log('📊 Public folders:', publicRootFolders.length, publicRootFolders.map(f => f.title));
    
    // Helper function to count all items recursively (including subfolders)
    function getTotalItemCount(folderId) {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return 0;
        
        // Get direct items in this folder
        let count = folder.actual_item_count || 0;
        
        // Add items from all subfolders recursively
        const subfolders = folders.filter(f => f.parent_id === folderId);
        for (const subfolder of subfolders) {
            count += getTotalItemCount(subfolder.id);
        }
        
        return count;
    }
    
    // Render PUBLIC folders only
    if (publicRootFolders.length === 0) {
        container.innerHTML = '<p class="loading" style="grid-column: 1/-1; text-align: center; color: #999;">No public folders available</p>';
    } else {
        const html = publicRootFolders.map(folder => {
            const subfolders = folders.filter(f => f.parent_id === folder.id);
            const subfoldersCount = subfolders.length;
            const displayURL = folder.table_name;
            
            // Use actual_item_count from database view (direct items only)
            const directItemCount = folder.actual_item_count || 0;
            
            let countLabel = subfoldersCount > 0 
                ? `${subfoldersCount} subfolder${subfoldersCount !== 1 ? 's' : ''}, ${directItemCount} item${directItemCount !== 1 ? 's' : ''}`
                : `${directItemCount} item${directItemCount !== 1 ? 's' : ''}`;
            
            const viewContentButton = directItemCount > 0
                ? `<button onclick="event.stopPropagation(); window.location.href='?folder=${folder.slug}';" style="margin-top: 8px; padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">📄 View Content</button>`
                : '';
            
            const isPinnedFirst = folder.title.toLowerCase() === '3c bulletin board';
            const titleStyle = isPinnedFirst
                ? ' style="color:#8b5cf6; text-shadow:0 0 8px rgba(139,91,246,0.6);"'
                : '';

            return `
                <div class="folder-card-item" onclick="handleFolderClick('${folder.slug}')">
                    <div class="folder-icon">📁</div>
                    <div class="folder-title"${titleStyle}>${escapeHtml(folder.title)}</div>
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
    
    // Observe newly added lazy-loaded thumbnails
    setTimeout(() => observeLazyThumbnails(), 0);
}

// ==================== FOLDER SELECTION ====================
async function selectFolder(folderId) {
    await loadFolderContent(folderId);
}

// ==================== CONTENT OPENING ====================
async function openContent(contentData) {
    // Parse if string
    const content = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
    
    currentContentId = content.id;
    
    // Increment view count
    await supabaseClient.incrementViewCount(content.id);
    
    // Log interaction
    await supabaseClient.logInteraction(content.id, 'view');
    
    // Open based on type
    switch (content.type) {
        case 'pdf':
            openPdfViewer(content);
            break;
        case 'flipbook':
            openFlipbookViewer(content);
            break;
        case 'presentation':
            openPresentationViewer(content);
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
        case 'link':
            if (content.url) {
                window.open(content.url, '_blank');
            } else if (content.external_url) {
                window.open(content.external_url, '_blank');
            }
            break;
        case 'virtual-slideshow':
        case 'quiz':
        case 'card-game':
        case 'spin-wheel':
        case 'landing-page':
            if (content.url) {
                window.open(content.url, '_blank');
            }
            break;
        default:
            if (content.url) {
                window.open(content.url, '_blank');
            }
    }
    
    // If has external_url, show option to open it
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
    const modal = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    const title = document.getElementById('mediaTitle');
    
    title.textContent = content.title;
    
    let html = '';
    const url = content.url;
    
    switch (type) {
        case 'video':
            // Check if YouTube
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
    const modal = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    
    modal.classList.remove('active');
    container.innerHTML = '';
}

// ==================== FLIPBOOK VIEWER ====================
function openFlipbookViewer(content) {
    // Priority 1: Use Cloudflare R2 manifest URL if available (fast, public)
    if (content.url) {
        const flipbookUrl = `flipbook-viewer.html?manifest=${encodeURIComponent(content.url)}`;
        window.open(flipbookUrl, '_blank', 'width=1200,height=800');
    }
    // Priority 2: Fallback to content ID (loads from Supabase)
    else if (content.id) {
        const flipbookUrl = `flipbook-viewer.html?content=${content.id}`;
        window.open(flipbookUrl, '_blank', 'width=1200,height=800');
    }
    else {
        alert('Flipbook data not available');
}

// ==================== PRESENTATION VIEWER ====================
function openPresentationViewer(content) {
    // Priority 1: Use Cloudflare R2 manifest URL if available (fast, public)
    if (content.url) {
        const presentationUrl = `presentation-viewer.html?manifest=${encodeURIComponent(content.url)}`;
        window.open(presentationUrl, '_blank', 'width=1200,height=800');
    }
    // Priority 2: Fallback to content ID (loads from Supabase)
    else if (content.id) {
        const presentationUrl = `presentation-viewer.html?content=${content.id}`;
        window.open(presentationUrl, '_blank', 'width=1200,height=800');
    }
    else {
        alert('Presentation data not available');
    }        
}

// ==================== LINK MODAL (DRAGGABLE) ====================
function openLinkInModal(url, title = 'External Link') {
    const modal = document.getElementById('linkModal');
    const frame = document.getElementById('linkFrame');
    const titleEl = document.getElementById('linkModalTitle');
    
    titleEl.textContent = title;
    frame.src = url;
    
    // Center modal
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '800px';
    modal.style.height = '600px';
    modal.style.display = 'flex';
    
    // Make draggable
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
        element.style.top = (element.offsetTop - pos2) + 'px';
        element.style.left = (element.offsetLeft - pos1) + 'px';
        element.style.transform = 'none';
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const linkModal = document.getElementById('linkModal');
    if (e.target === linkModal) {
        closeLinkModal();
    }
});

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

// ==================== UTILITY FUNCTIONS ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTypeIcon(type) {
    const icons = {
        pdf: '📄',
        flipbook: '📖',
        presentation: '📊',
        video: '🎥',
        image: '🖼️',
        audio: '🎵',
        gif: '🎞️',
        link: '🔗',
        quiz: '🧠',
        'card-game': '🃏',
        'spin-wheel': '🎡',
        'landing-page': '🚀',
        'virtual-slideshow': '🎞️',
        other: '📎'
    };
    return icons[type] || '📎';
}

function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ==================== PLAYBACK MEMORY ====================
function savePlaybackPosition(contentId, position) {
    const key = `playback_${contentId}`;
    localStorage.setItem(key, JSON.stringify({
        position: position,
        timestamp: Date.now()
    }));
}

function getPlaybackPosition(contentId) {
    const key = `playback_${contentId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// ==================== LAZY LOADING ====================
// Global image observer for lazy loading thumbnails
let imageObserver = null;

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        // Add fade-in effect
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
        }, {
            rootMargin: '50px' // Start loading 50px before image is visible
        });
    }
}

// Observe all lazy-loaded thumbnails
function observeLazyThumbnails() {
    if (imageObserver) {
        document.querySelectorAll('img.lazy-thumbnail[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Initialize on load
initLazyLoading();

// ==================== PRIVATE FOLDER PASSWORD MANAGEMENT ====================

let pendingPrivateFolder = null;

/**
 * Check if current user is the owner/admin
 */
function isOwner() {
    if (!currentUser || !currentUser.email) return false;
    const ownerEmail = CONFIG?.app?.ownerEmail;
    if (!ownerEmail) return false;
    return currentUser.email.toLowerCase() === ownerEmail.toLowerCase();
}

/**
 * Check current user session
 */
async function checkCurrentUser() {
    try {
        if (!supabaseClient || !supabaseClient.client) return;
        const { data: { user } } = await supabaseClient.client.auth.getUser();
        currentUser = user;
        if (user) {
            console.log('👤 Logged in as:', user.email);
            if (isOwner()) {
                console.log('👑 Owner access granted');
            }
        }
    } catch (error) {
        console.error('Error checking user:', error);
        currentUser = null;
    }
}

/**
 * Check if folder is private and requires password
 */
function isFolderPrivate(folder) {
    return folder && folder.is_public === false;
}

/**
 * Prompt for password to access private folder
 */
function promptForFolderPassword(folder) {
    pendingPrivateFolder = folder;
    
    const modal = document.getElementById('passwordPromptModal');
    const folderNameEl = document.getElementById('passwordPromptFolderName');
    const inputEl = document.getElementById('passwordPromptInput');
    const errorEl = document.getElementById('passwordError');
    
    folderNameEl.textContent = `Enter password to access: ${folder.title}`;
    inputEl.value = '';
    errorEl.style.display = 'none';
    
    modal.style.display = 'flex';
    inputEl.focus();
    
    // Allow Enter key to submit
    inputEl.onkeypress = (e) => {
        if (e.key === 'Enter') {
            submitFolderPassword();
        }
    };
}

/**
 * Submit and validate folder password
 */
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
        // Get active passwords for this folder
        const { data: passwords, error } = await supabaseClient.client
            .from('folder_passwords')
            .select('*')
            .eq('folder_id', pendingPrivateFolder.id)
            .eq('is_active', true);
        
        if (error) throw error;
        
        if (!passwords || passwords.length === 0) {
            errorEl.textContent = 'No active passwords for this folder';
            errorEl.style.display = 'block';
            return;
        }
        
        // Check password against all active passwords
        let passwordValid = false;
        for (const pwd of passwords) {
            // Check expiration
            if (pwd.expires_at && new Date(pwd.expires_at) < new Date()) {
                continue; // Skip expired passwords
            }
            
            // Verify password
            const isValid = await PasswordUtils.verifyPassword(password, pwd.password_hash);
            if (isValid) {
                passwordValid = true;
                break;
            }
        }
        
        if (passwordValid) {
            // Grant access
            PasswordUtils.grantAccess(pendingPrivateFolder.id);
            closePasswordPrompt();
            
            // Now open the folder
            window.location.href = `?folder=${pendingPrivateFolder.slug}`;
        } else {
            errorEl.textContent = '❌ Invalid password';
            errorEl.style.display = 'block';
            inputEl.value = '';
            inputEl.focus();
        }
        
    } catch (error) {
        console.error('Error validating password:', error);
        errorEl.textContent = 'Error validating password';
        errorEl.style.display = 'block';
    }
}

/**
 * Close password prompt modal
 */
function closePasswordPrompt() {
    const modal = document.getElementById('passwordPromptModal');
    modal.style.display = 'none';
    pendingPrivateFolder = null;
}

/**
 * Check if user has access to private folder
 */
function checkPrivateFolderAccess(folder) {
    if (!isFolderPrivate(folder)) {
        return true; // Public folder, always accessible
    }
    
    // Check if user has already unlocked this folder
    return PasswordUtils.hasAccess(folder.id);
}

/**
 * Handle folder click - check if private and prompt for password
 */
function handleFolderClick(folderSlug) {
    const folder = folders.find(f => f.slug === folderSlug);
    if (!folder) {
        window.location.href = `?folder=${folderSlug}`;
        return;
    }
    
    // Owner bypass
    if (isFolderPrivate(folder) && isOwner()) {
        console.log('👑 Owner bypassing password for:', folder.title);
        window.location.href = `?folder=${folderSlug}`;
        return;
    }
    
    if (isFolderPrivate(folder) && !checkPrivateFolderAccess(folder)) {
        // Private folder without access - prompt for password
        promptForFolderPassword(folder);
    } else {
        // Public folder or already has access
        window.location.href = `?folder=${folderSlug}`;
    }
}
