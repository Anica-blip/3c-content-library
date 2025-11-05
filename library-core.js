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
    const container = document.getElementById('folderList');
    
    if (folders.length === 0) {
        container.innerHTML = '<p class="loading">No folders available</p>';
        return;
    }
    
    const html = folders.map(folder => `
        <div class="folder-item" data-folder-id="${folder.id}" onclick="selectFolder('${folder.id}')">
            <div class="folder-item-title">${escapeHtml(folder.title)}</div>
            <div class="folder-item-count">${folder.item_count || 0} items</div>
        </div>
    `).join('');
    
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
            ? `<img src="${item.thumbnail_url}" class="content-thumbnail" alt="${escapeHtml(item.title)}">`
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
        video: '🎥',
        image: '🖼️',
        audio: '🎵',
        link: '🔗'
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
// Implement intersection observer for lazy loading images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}
