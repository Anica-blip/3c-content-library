/**
 * Aurion's Vault - Core JavaScript
 * CLONE of library.html inline JS.
 * Vault-only substitutions:
 *   supabaseClient -> vaultClient
 *   content_public -> vault_content
 *   folder_passwords -> vault_folder_passwords
 *   flipbook-viewer.html -> ../flipbook-viewer.html
 *   presentation-viewer.html -> ../presentation-viewer.html
 *   getComments/addComment -> vault_comments direct queries
 *   getTypeIcon extended with vault types
 *   displayAllFolders alphabetical (no pinned order)
 *   init block adds initVaultSupabase + updateVaultNav
 *   openPDFModal activates vault pdfModal + pdf-viewer-enhanced.js
 *
 * 2026-08-08: return icon now climbs to the root folder and opens its
 * sidebar (?openFolder=) instead of hideContentViewer()'s old desktop
 * redirect to vault.html — that function is removed. Share/copy buttons
 * re-skinned to the SVG icon set. Desktop share fallback now copies the
 * actual worker link built in nativeShareContent()/nativeShareSeriesItem()
 * instead of silently switching to a different, plain link.
 */

// ==================== GLOBAL STATE ====================
let library        = { folders: [], content: [] };
let currentFolder  = null;
let currentContent = null;
let currentUser    = null;
let pendingPrivateFolder = null;
let contentCache   = {};
let libraryCache   = null;
let cacheTimestamp = null;
const CACHE_DURATION = 2 * 60 * 1000;

// ==================== INIT ====================
(async () => {
    try {
        await initVaultSupabase();
        await checkCurrentUser();
        const urlParams = new URLSearchParams(window.location.search);
        updateVaultNav(!!(urlParams.get('folder') || urlParams.get('content') || urlParams.get('url')));
        await loadData();
        await displayContent();
    } catch (error) {
        console.error('Failed to load vault:', error);
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.innerHTML = '<div style="text-align:center;color:var(--text-primary);"><div style="font-size:48px;margin-bottom:20px;">&#9888;</div><div style="font-size:18px;font-weight:600;margin-bottom:10px;">Failed to load Aurion\'s Vault</div><div style="font-size:14px;color:var(--text-secondary);">Please refresh the page to try again</div></div>';
        return;
    } finally {
        setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.remove(), 300); }
        }, 100);
    }
})();

// ==================== VAULT NAV ====================
function updateVaultNav(isInsideFolder) {
    const folderBtn = document.getElementById('folderIconBtn');
    const publicBtn = document.getElementById('publicLibBtn');
    if (folderBtn) folderBtn.style.display = isInsideFolder ? 'flex' : 'none';
    if (publicBtn) publicBtn.style.display  = 'flex';
}

// ==================== VAULT SUPABASE INIT ====================
async function initVaultSupabase() {
    if (!CONFIG || !CONFIG.supabase || !CONFIG.supabase.url) { console.error('Supabase configuration not found'); return; }
    try { await vaultClient.init(CONFIG.supabase.url, CONFIG.supabase.anonKey); console.log('Vault Supabase connected'); }
    catch (error) { console.error('Vault Supabase connection failed:', error); }
}

// ==================== LOAD DATA ====================
async function loadData() {
    console.log('Loading vault data from Supabase...');
    const now = Date.now();
    if (libraryCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) { console.log('Using cached data'); library = libraryCache; return; }
    try {
        if (!vaultClient.isConnected) { await vaultClient.init(CONFIG.supabase.url, CONFIG.supabase.anonKey); }
        const folders = await vaultClient.getFolders();
        library.folders = folders.map(f => ({
            id: f.id, title: f.title, name: f.title, slug: f.custom_url || f.slug,
            customUrl: f.custom_url, tableName: f.table_name, description: f.description,
            folderType: f.folder_type, parentId: f.parent_id, depth: f.depth || 0,
            path: f.path, actualItemCount: f.actual_item_count || 0, isPublic: f.is_public,
            displayStyle: f.display_style || 'default'
        }));
        library.content = [];
        libraryCache = library; cacheTimestamp = now;
        console.log('Vault loaded and cached:', library);
        console.log('Folders:', library.folders.length, 'Content:', library.content.length);
    } catch (error) { console.error('Error loading vault data:', error); library = { folders: [], content: [] }; }
}

// ==================== URL PARAMS ====================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return { folder: params.get('folder'), content: params.get('content'), url: params.get('url'), view: params.get('view'), highlight: params.get('highlight'), openFolder: params.get('openFolder') };
}

// ==================== FIND HELPERS ====================
function findFolderBySlug(slug) {
    return library.folders.find(f => f.slug === slug || f.id === slug || f.tableName === slug);
}
function findContentBySlug(slug, folderId) {
    if (folderId) return library.content.find(c => (c.slug === slug || c.id === slug || c.customUrl === slug) && c.folderId === folderId);
    return library.content.find(c => c.slug === slug || c.id === slug || c.customUrl === slug);
}

// ==================== TYPE ICON ====================
function getTypeIcon(type) {
    const icons = { pdf: '📄', video: '🎥', image: '🖼️', audio: '🎵', flipbook: '📖', presentation: '📊', gif: '🎞️', link: '🔗', quiz: '🧠', 'card-game': '🃏', 'spin-wheel': '🎡', 'landing-page': '🚀', 'virtual-slideshow': '🎞️', other: '📎' };
    return icons[type] || icons.other;
}

// ==================== DISPLAY CONTENT ====================
async function displayContent() {
    const params = getUrlParams();
    const folderSlug = params.folder, contentSlug = params.content, contentUrl = params.url, viewMode = params.view;

    console.log('displayContent called with params:', { folderSlug, contentSlug, contentUrl, viewMode });
    console.log('Library state:', { folders: library.folders.length, content: library.content.length });

    const folderIconBtn = document.getElementById('folderIconBtn');
    if (folderIconBtn) {
        folderIconBtn.style.visibility = (folderSlug || contentSlug || contentUrl) ? 'visible' : 'hidden';
    }

    // NEW FORMAT: ?folder=X&url=Y&view=pdf-only (any *-only viewMode = standalone, no sidebar)
    if (viewMode && viewMode.endsWith('-only') && folderSlug && contentUrl) {
        document.querySelector('.folders-section').style.display = 'none';
        document.getElementById('contentViewer').style.display = 'block';
        console.log('Loading content with new URL format:', { folderSlug, contentUrl });
        const folder = library.folders.find(f => f.tableName === folderSlug || f.slug === folderSlug);
        if (!folder) {
            console.error('Folder not found:', folderSlug);
            document.getElementById('viewer').innerHTML = '<div style="padding:40px;text-align:center;"><h2>Folder not found</h2><p>The folder "' + folderSlug + '" does not exist.</p></div>';
            return;
        }
        try {
            const { data, error } = await vaultClient.client.from('vault_content')
                .select('id, folder_id, title, type, url, external_url, thumbnail_url, description, custom_url, slug, display_order, view_count')
                .eq('folder_id', folder.id).or('custom_url.eq.' + contentUrl + ',slug.eq.' + contentUrl).single();
            if (error) throw error;
            if (data) {
                const content = { id: data.id, folderId: data.folder_id, title: data.title, type: data.type, url: data.url, slug: data.custom_url || data.slug, customUrl: data.custom_url, thumbnail: data.thumbnail_url, description: data.description, externalUrl: data.external_url };
                currentFolder = folder; showViewer(content, true); return;
            } else {
                console.error('Content not found:', contentUrl);
                document.getElementById('viewer').innerHTML = '<div style="padding:40px;text-align:center;"><h2>Content not found</h2><p>The content "' + contentUrl + '" does not exist in folder "' + folderSlug + '".</p></div>';
                return;
            }
        } catch (err) {
            console.error('Error loading content:', err);
            document.getElementById('viewer').innerHTML = '<div style="padding:40px;text-align:center;"><h2>Error loading content</h2><p>' + err.message + '</p></div>';
            return;
        }
    }

    // OLD FORMAT: ?content=X&view=pdf-only (any *-only viewMode = standalone)
    if (viewMode && viewMode.endsWith('-only') && contentSlug) {
        document.querySelector('.folders-section').style.display = 'none';
        document.getElementById('contentViewer').style.display = 'block';
        let content = findContentBySlug(contentSlug);
        if (!content) {
            const loadContent = async () => {
                try {
                    const { data, error } = await vaultClient.client.from('vault_content')
                        .select('id, folder_id, title, type, url, external_url, thumbnail_url, description, custom_url, slug, display_order, view_count')
                        .or('id.eq.' + contentSlug + ',slug.eq.' + contentSlug + ',custom_url.eq.' + contentSlug).single();
                    if (!error && data) {
                        content = { id: data.id, title: data.title, slug: data.custom_url || data.slug, customUrl: data.custom_url, type: data.type, folderId: data.folder_id, url: data.url, thumbnail: data.thumbnail_url, description: data.description, externalUrl: data.external_url };
                        showViewer(content, true);
                    }
                } catch (err) { console.error('Error loading content:', err); }
            };
            loadContent(); return;
        }
        if (content) { showViewer(content, true); return; }
    }

    // No folder selected — show all folders
    if (!folderSlug) {
        console.log('No folder slug, showing all folders');
        displayAllFolders();
        // Came here via the content viewer's return icon — auto-open
        // the sidebar for the folder they were just viewing.
        if (params.openFolder) openFolderSidebar(params.openFolder);
        return;
    }

    // Hide folders section, show content viewer with left/right layout
    document.querySelector('.folders-section').style.display = 'none';
    document.getElementById('contentViewer').style.display = 'block';
    document.getElementById('folderSidebar').style.display = 'none';

    currentFolder = findFolderBySlug(folderSlug);
    if (!currentFolder) { document.getElementById('viewer').innerHTML = '<div class="no-content"><h2>Folder Not Found</h2><p>This folder may have been deleted.</p></div>'; return; }

    // Collection/Series folders use the grid landing page instead of
    // the default sidebar + viewer layout
    console.log('🔍 Folder display style check:', currentFolder.title, '→ displayStyle =', JSON.stringify(currentFolder.displayStyle));
    if (currentFolder.displayStyle === 'collection') {
        console.log('🎬 Routing to displayCollectionGrid()');
        await displayCollectionGrid(currentFolder, params.highlight);
        return;
    } else {
        console.log('📋 Routing to default sidebar layout (displayStyle was not "collection")');
    }

    if (!contentCache[currentFolder.id]) {
        try {
            const content = await vaultClient.getContentByFolder(currentFolder.id);
            const mappedContent = content.map(c => ({ id: c.id, folderId: c.folder_id, title: c.title, type: c.type, url: c.url, slug: c.custom_url || c.slug, customUrl: c.custom_url, thumbnail: c.thumbnail_url, description: c.description, externalUrl: c.external_url, order: c.display_order }));
            contentCache[currentFolder.id] = mappedContent;
            library.content = [...library.content, ...mappedContent];
        } catch (error) { console.error('Error loading folder content:', error); }
    }

    let folderContent = library.content.filter(c => c.folderId === currentFolder.id);
    folderContent.sort((a, b) => (a.order || 0) - (b.order || 0));
    const subfolders = library.folders.filter(f => f.parentId === currentFolder.id).sort((a, b) => a.title.localeCompare(b.title));

    // If contentSlug exists, show ONLY content viewer (no left sidebar)
    if (contentSlug) {
        const viewer = document.getElementById('viewer');
        viewer.innerHTML = '<div id="viewerContent" class="right-viewer" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; display: block; width: 100%; max-width: 100%;"><div class="no-content"><h2>Loading content...</h2></div></div>';
        const content = findContentBySlug(contentSlug, currentFolder.id);
        if (content) { showViewer(content, false); } else { document.getElementById('viewerContent').innerHTML = '<div class="no-content"><h2>Error loading content</h2><p>JSON object requested, multiple (or no) rows returned</p></div>'; }
        return;
    }

    // Create left/right layout
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = `
        <div class="layout" style="display: grid; grid-template-columns: 350px 1fr; gap: 20px;">
            <div class="sidebar" id="leftSidebar" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; width: 100%; max-width: 100%;">
                <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 15px;">${currentFolder.title}</h2>
                <div id="subfoldersContainer"></div>
                <div class="content-grid" id="contentList"></div>
            </div>
            <div id="viewerContent" class="right-viewer" style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; display: none; width: 100%; max-width: 100%;">
                <div class="no-content"><h2>Welcome to Aurion's Universe</h2><p>Select content from the sidebar to view</p></div>
            </div>
        </div>
        <div class="comments-section" id="commentsSection" style="display: none;"></div>
    `;

    if (folderContent.length === 0 && subfolders.length === 0) { document.getElementById('contentList').innerHTML = '<p style="color: #999;">No subfolders or content</p>'; return; }

    let subfoldersHtml = '';
    if (subfolders.length > 0) {
        subfoldersHtml += '<div style="margin-bottom: 20px;">';
        subfolders.forEach(subfolder => {
            const itemCount = subfolder.actualItemCount || 0;
            subfoldersHtml += `<div class="subfolder-card" onclick="window.location.href='?folder=${subfolder.slug}'" style="background: rgba(155, 89, 182, 0.1); border: 1px solid rgba(155, 89, 182, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(155, 89, 182, 0.2)'; this.style.borderColor='rgba(155, 89, 182, 0.5)'" onmouseout="this.style.background='rgba(155, 89, 182, 0.1)'; this.style.borderColor='rgba(155, 89, 182, 0.3)'"><div style="display: flex; align-items: center; gap: 10px;"><div style="font-size: 24px;">📂</div><div style="flex: 1;"><div style="font-weight: 600; color: #ffffff; font-size: 14px;">${subfolder.title}</div><div style="font-size: 11px; color: #808080;">${itemCount} item${itemCount !== 1 ? 's' : ''}</div></div><div style="color: #9b59b6; font-size: 18px;">→</div></div></div>`;
        });
        subfoldersHtml += '</div>';
    }
    document.getElementById('subfoldersContainer').innerHTML = subfoldersHtml;

    let contentHtml = '';
    if (folderContent.length > 0) {
        contentHtml = folderContent.map(item => {
            let thumbnailAttr = '', thumbnailContent = '';
            if (item.thumbnail) { thumbnailAttr = `data-bg="${item.thumbnail}"`; } else { thumbnailContent = `<div class="type-icon">${getTypeIcon(item.type)}</div>`; }
            return `<div class="content-card ${item.slug === contentSlug || item.id === contentSlug ? 'active' : ''}" onclick="viewContent('${item.id}')" style="display: flex; flex-direction: column; height: auto; margin-bottom: 25px;"><div class="content-thumbnail" ${thumbnailAttr} style="flex-shrink: 0; aspect-ratio: 1; border-radius: 8px 8px 0 0; margin-bottom: 0;">${thumbnailContent}</div><div class="content-info" style="padding: 12px 10px; text-align: left; min-height: 60px; margin-top: 0;"><div class="content-title" style="font-size: 12px; color: #ffffff; line-height: 1.4; font-weight: 500; word-wrap: break-word; margin: 0;">${item.title}</div></div></div>`;
        }).join('');
    }
    document.getElementById('contentList').innerHTML = contentHtml;
    observeThumbnails();
}

// ==================== DISPLAY ALL FOLDERS ====================
function displayAllFolders() {
    console.log('displayAllFolders called, folders:', library.folders);
    document.getElementById('contentViewer').style.display = 'none';
    document.querySelector('.folders-section').style.display = 'block';
    const commentsSection = document.getElementById('commentsSection');
    if (commentsSection) commentsSection.style.display = 'none';
    if (library.folders.length === 0) { console.log('No folders to display'); return; }
    console.log('Displaying only root folders');

    const rootFolders = library.folders.filter(f => !f.parentId && f.depth === 0).sort((a, b) => {
        // Pin pop_in first, aurion_gems second, everything else alphabetical
        const pinOrder = { pop_in: 0, aurion_gems: 1 };
        const aPin = pinOrder[a.tableName];
        const bPin = pinOrder[b.tableName];
        if (aPin !== undefined && bPin !== undefined) return aPin - bPin;
        if (aPin !== undefined) return -1;
        if (bPin !== undefined) return 1;
        return a.title.localeCompare(b.title);
    });

    let html = '';
    rootFolders.forEach(folder => {
        const subfolders = library.folders.filter(f => f.parentId === folder.id);
        const subfoldersCount = subfolders.length;
        const contentCount = folder.actualItemCount || 0;
        let countLabel = subfoldersCount > 0 ? (subfoldersCount + ' subfolder' + (subfoldersCount !== 1 ? 's' : '') + ', ' + contentCount + ' item' + (contentCount !== 1 ? 's' : '')) : (contentCount + ' item' + (contentCount !== 1 ? 's' : ''));

        // Start Here button only on Aurion Gems
        const startHereBtn = folder.tableName === 'aurion_gems'
            ? '<button onclick="event.stopPropagation(); openFolderSidebar(\'' + folder.id + '\');" style="margin-top: 8px; padding: 6px 14px; background: linear-gradient(135deg, #7c3aed, #9b59b6); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 2px 8px rgba(124,58,237,0.35); transition: all 0.2s;" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">🚀 Start Here</button>'
            : '';

        // Pop In gets a neon purple title — visually distinct from library content
        const titleStyle = folder.tableName === 'pop_in'
            ? ' style="color:#c084fc; text-shadow:0 0 10px rgba(192,132,252,0.6);"'
            : '';

        html += '<div class="folder-card-item" onclick="openFolderSidebar(\'' + folder.id + '\')"><div class="folder-icon"><svg width="64" height="54" viewBox="0 0 64 54" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18 L4 11 Q4 9 6 9 L24 9 Q27 9 29 13 L31 18 Z" fill="#7c3aed"/><rect x="2" y="18" width="60" height="32" rx="6" fill="rgba(30, 10, 60, 0.85)"/><rect x="2" y="18" width="60" height="32" rx="6" fill="none" stroke="rgba(124, 58, 237, 0.55)" stroke-width="1.5"/><rect x="2" y="18" width="60" height="8" rx="0" fill="rgba(124, 58, 237, 0.08)"/></svg></div><div class="folder-title"' + titleStyle + '>' + folder.title + '</div><div class="folder-details">' + countLabel + '</div><div class="folder-slug">' + folder.tableName + '</div>' + startHereBtn + '</div>';
    });
    document.getElementById('foldersGrid').innerHTML = html;
}

// ==================== COLLECTION / SERIES GRID ====================
// Alternate folder landing page: all content shown as a wrapping
// grid of thumbnail + title cards, instead of the sidebar + viewer
// layout. Content comes from content_series, not vault_content.

let seriesItemsCache = [];

async function displayCollectionGrid(folder, highlightSlug) {
    console.log('🎬 displayCollectionGrid() started for folder:', folder.title, folder.id);
    document.querySelector('.folders-section').style.display = 'none';
    document.getElementById('contentViewer').style.display = 'block';
    document.getElementById('folderSidebar').style.display = 'none';
    const commentsSection = document.getElementById('commentsSection');
    if (commentsSection) commentsSection.style.display = 'none';

    // Return icon — same root-climbing behavior as the content viewer's
    // return icon: always lands on the true root ancestor's full sidebar,
    // however deep this folder is nested.
    let rootFolder = folder;
    while (rootFolder.parentId) {
        const parent = library.folders.find(f => f.id === rootFolder.parentId);
        if (!parent) break;
        rootFolder = parent;
    }
    const returnIconHtml = `
        <button onclick="window.location.href='?openFolder=${encodeURIComponent(rootFolder.id)}'" title="Return to folder content list" style="background: rgba(155,89,182,0.15); border: 1px solid rgba(155,89,182,0.35); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.64-6.36M3 4v5h5"/></svg>
        </button>
    `;

    // Copy Link only — no native share icon, since the worker's OG-tag
    // preview route is built around individual items, not folder pages.
    const folderRef = folder.slug || folder.tableName || folder.id;
    const copyLinkIconHtml = `
        <button onclick="copyFolderLink('${String(folderRef).replace(/'/g, "\\'")}')" title="Copy Link" style="background: rgba(155,89,182,0.15); border: 1px solid rgba(155,89,182,0.35); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        </button>
    `;

    const viewer = document.getElementById('viewer');
    viewer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px;">
            <h2 style="color: #ffffff; font-size: 20px; margin: 0; flex: 1; min-width: 0;">${escapeHtml(folder.title)}</h2>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">${returnIconHtml}${copyLinkIconHtml}</div>
        </div>
        ${folder.description ? '<div style="color:#9a8fb0; font-size:13px; margin-bottom:20px;">' + escapeHtml(folder.description) + '</div>' : '<div style="margin-bottom:20px;"></div>'}
        <div class="series-grid" id="seriesGrid"></div>
        <div id="reviewSliderEmbed"></div>
    `;

    // One-time responsive rule for the series grid — desktop wraps
    // across as many columns as fit, mobile stacks single-column
    // downward, matching the rest of this site's 768px breakpoint.
    // Also defines the highlight glow for shared links.
    if (!document.getElementById('seriesGridStyle')) {
        const style = document.createElement('style');
        style.id = 'seriesGridStyle';
        style.textContent = `
            .series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px; }
            @media (max-width: 768px) {
                .series-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
                .series-grid .series-card { flex-direction: row !important; align-items: center; gap: 14px; }
                .series-grid .series-thumb { width: 130px !important; flex-shrink: 0; aspect-ratio: 1 !important; }
                .series-grid .series-title { text-align: left !important; margin-top: 0 !important; }
            }
            .series-card.series-highlighted .series-thumb {
                box-shadow: 0 0 0 3px #00d4c8, 0 0 24px rgba(0,212,200,0.55) !important;
                animation: seriesHighlightPulse 1.6s ease-in-out 3;
            }
            @keyframes seriesHighlightPulse {
                0%, 100% { box-shadow: 0 0 0 3px #00d4c8, 0 0 22px rgba(0,212,200,0.35); }
                50%      { box-shadow: 0 0 0 5px #00d4c8, 0 0 34px rgba(0,212,200,0.75); }
            }
        `;
        document.head.appendChild(style);
    }

    const grid = document.getElementById('seriesGrid');
    grid.innerHTML = '<p style="color:#999;">Loading...</p>';

    try {
        seriesItemsCache = await vaultClient.getContentSeries(folder.id);
        console.log('🎬 getContentSeries returned', seriesItemsCache.length, 'items for folder', folder.id);
    } catch (error) {
        console.error('Error loading series content:', error);
        grid.innerHTML = '<p style="color:#e74c3c;">Error loading content.</p>';
        return;
    }

    if (seriesItemsCache.length === 0) {
        grid.innerHTML = '<p style="color:#999;">No content yet.</p>';
        return;
    }

    grid.innerHTML = seriesItemsCache.map(item => {
        const thumb = item.thumbnail_url ||
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%231a0f2e" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" font-size="80"%3E' + encodeURIComponent(getTypeIcon(item.type)) + '%3C/text%3E%3C/svg%3E';
        return `
            <div class="series-card" data-item-id="${item.id}" data-custom-url="${item.custom_url || item.slug || ''}" onclick="openSeriesItem('${item.id}')" style="cursor: pointer; display: flex; flex-direction: column; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform=''">
                <div class="series-thumb" style="position: relative; aspect-ratio: 3/4; border-radius: 10px; overflow: hidden; background-image: url('${thumb}'); background-size: cover; background-position: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid rgba(155,89,182,0.2);">
                    <button onclick="event.stopPropagation(); nativeShareSeriesItem('${item.id}')" title="Share" style="position: absolute; top: 8px; right: 26px; width: 15px; height: 15px; border-radius: 50%; border: none; background: rgba(10,4,22,0.65); backdrop-filter: blur(4px); color: #ffffff; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,212,200,0.35)'" onmouseout="this.style.background='rgba(10,4,22,0.65)'">↗</button>
                    <button onclick="event.stopPropagation(); copySeriesLink('${item.id}')" title="Copy link" style="position: absolute; top: 8px; right: 8px; width: 15px; height: 15px; border-radius: 50%; border: none; background: rgba(10,4,22,0.65); backdrop-filter: blur(4px); color: #ffffff; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(123,63,228,0.55)'" onmouseout="this.style.background='rgba(10,4,22,0.65)'">🔗</button>
                </div>
                <div class="series-title" style="margin-top: 8px; font-size: 13px; color: #ffffff; text-align: center; line-height: 1.3;">${escapeHtml(item.title)}</div>
            </div>
        `;
    }).join('');

    // Shared-link highlight — find the item this link pointed at,
    // glow it, and scroll it into view, without hiding the rest of
    // the grid. Matches on custom_url first, falls back to raw id.
    if (highlightSlug) {
        const target = seriesItemsCache.find(i => i.custom_url === highlightSlug || i.slug === highlightSlug || i.id === highlightSlug);
        if (target) {
            const card = grid.querySelector(`[data-item-id="${target.id}"]`);
            if (card) {
                card.classList.add('series-highlighted');
                setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
            }
        } else {
            console.warn('Highlight target not found in this folder:', highlightSlug);
        }
    }

    // Live review banner — only on the folder titled "Drop In", whose
    // table_name is actually still 'pop_in' (display title changed,
    // technical identity kept so the pinning/purple-title logic above
    // keeps working). Sits BELOW the folder's own thumbnails, as an
    // extra floating layer — the folder content itself is untouched.
    if (folder.tableName === 'pop_in') {
        await renderReviewSliderEmbed();
    }
}

// ==================== LIVE REVIEW BANNER (Drop In folder only) ====================
// Matches each emoji to its own line — same wording as reviews.html —
// so an emoji-only review still shows a readable quote instead of
// looking bare or showing a placeholder like "No rating given".
const REVIEW_EMOJI_LINES = {
    '🥳': 'Loved it!',
    '😊': 'Really enjoyed it.',
    '🙂': 'Nice experience.',
    '🤔': 'Some ideas to improve.',
    '🌱': "I'll visit again another time.",
};
const REVIEW_LOGOS = {
    library: ['../3C Thread To Success logo.png'],
    vault: ['../Clubhouse logo.png'],
    both: ['../3C Thread To Success logo.png', '../Clubhouse logo.png'],
};

let embedReviews = [];
let embedIndex = 0;
let embedTimer = null;

async function renderReviewSliderEmbed() {
    const container = document.getElementById('reviewSliderEmbed');
    if (!container) return;

    if (!document.getElementById('reviewSliderStyle')) {
        const style = document.createElement('style');
        style.id = 'reviewSliderStyle';
        style.textContent = `
            /* Outer layer — the full-width glass strip */
            #reviewSliderEmbed:not(:empty) {
                margin-top: 52px; width: 100%; border-radius: 16px; overflow: hidden;
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.12);
                padding: 26px 20px;
            }
            #reviewSliderEmbed .rs-track { display: flex; transition: transform 0.6s ease; }
            /* Inner layer — the actual review card. The outer strip above
               stays a subtle glass panel; this card itself needs to be
               genuinely legible, not part of that translucency. */
            #reviewSliderEmbed .rs-slide { flex: 0 0 100%; display: flex; justify-content: center; }
            #reviewSliderEmbed .rs-card {
                width: 230px; height: 230px; box-sizing: border-box;
                background: rgba(245, 240, 220, 0.94);
                border: 1px solid rgba(245, 240, 220, 0.6);
                border-radius: 14px; padding: 18px 20px;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                text-align: center; gap: 6px; overflow: hidden;
                box-shadow: 0 8px 22px rgba(0,0,0,0.3);
            }
            #reviewSliderEmbed .rs-title { font-size: 10px; font-weight: 700; color: #6d28d9; }
            #reviewSliderEmbed .rs-emojis { font-size: 16px; letter-spacing: 3px; }
            #reviewSliderEmbed .rs-emojis.rs-emoji-only { font-size: 24px; letter-spacing: 5px; margin: 2px 0; }
            #reviewSliderEmbed .rs-note {
                font-size: 11px; color: #4a3a5a; line-height: 1.5; font-style: italic;
                overflow-y: auto; max-height: 78px; word-wrap: break-word;
            }
            #reviewSliderEmbed .rs-meta { font-size: 9px; color: #6a5a80; }
            #reviewSliderEmbed .rs-stars { font-size: 13px; letter-spacing: 2px; margin-top: 2px; }
            #reviewSliderEmbed .rs-star-filled { color: #d4a017; }
            #reviewSliderEmbed .rs-star-empty { color: rgba(106, 90, 128, 0.35); }
            #reviewSliderEmbed .rs-logos { display: flex; gap: 6px; align-items: center; justify-content: center; opacity: 0.7; margin-top: 2px; }
            #reviewSliderEmbed .rs-logos img { height: 16px; width: 16px; border-radius: 50%; object-fit: cover; }
            #reviewSliderEmbed .rs-dots { display: flex; gap: 5px; justify-content: center; padding-top: 16px; }
            #reviewSliderEmbed .rs-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.15); }
            #reviewSliderEmbed .rs-dot.active { background: rgba(0,212,200,0.6); }

            /* Mobile — keep the glass feel but make it genuinely readable
               on a small, bright-daylight screen: less see-through card,
               slightly less blur on the outer strip so text stays crisp. */
            @media (max-width: 480px) {
                #reviewSliderEmbed:not(:empty) { padding: 20px 14px; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
                #reviewSliderEmbed .rs-card { width: 200px; height: 200px; background: rgba(245, 240, 220, 0.97); border-color: rgba(245, 240, 220, 0.7); }
                #reviewSliderEmbed .rs-note { color: #2a1f3d; font-size: 10.5px; }
                #reviewSliderEmbed .rs-title { color: #5b21b6; }
            }
        `;
        document.head.appendChild(style);
    }

    try {
        const res = await fetch('https://dropin-chat.3c-innertherapy.workers.dev/api/reviews/approved?for=vault');
        const data = await res.json();
        embedReviews = data.reviews || [];
    } catch (e) {
        console.warn('Could not load reviews for banner:', e);
        return;
    }

    if (embedReviews.length === 0) return;

    embedIndex = 0;
    buildEmbedTrack();
    if (embedTimer) clearInterval(embedTimer);
    embedTimer = setInterval(() => {
        embedIndex = (embedIndex + 1) % embedReviews.length;
        updateEmbedPosition();
    }, 6000);
}

// Builds every card once, laid out side by side — sliding between
// them is then just a transform, giving a real slide-in motion
// instead of the content instantly replacing itself.
function buildEmbedTrack() {
    const container = document.getElementById('reviewSliderEmbed');
    if (!container) return;

    const cardsHtml = embedReviews.map(r => {
        const emojiHtml = (r.emojis || []).join(' ');
        const hasNote = r.note && r.note.trim();
        const fallbackQuote = (!hasNote && r.emojis && r.emojis.length)
            ? r.emojis.map(e => REVIEW_EMOJI_LINES[e]).filter(Boolean).join(' ')
            : '';
        const emojiOnly = emojiHtml && !hasNote;
        const identityLabel = r.identity === 'member' ? 'Community Member' : (r.identity === 'visitor' ? '3C Visitor' : '');
        const starsHtml = r.stars
            ? '<div class="rs-stars">'
                + Array.from({ length: 5 }, (_, i) =>
                    `<span class="${i < r.stars ? 'rs-star-filled' : 'rs-star-empty'}">★</span>`
                  ).join('')
              + '</div>'
            : '';
        const logos = REVIEW_LOGOS[r.ratedFor] || [];
        const logoHtml = logos.map(src => `<img src="${src}" alt="">`).join('');
        return `
            <div class="rs-slide">
                <div class="rs-card">
                    <div class="rs-title">💝 From Our Visitors</div>
                    ${emojiHtml ? `<div class="rs-emojis${emojiOnly ? ' rs-emoji-only' : ''}">${emojiHtml}</div>` : ''}
                    ${hasNote ? `<div class="rs-note">${escapeHtml(r.note)}</div>` : (fallbackQuote ? `<div class="rs-note">${escapeHtml(fallbackQuote)}</div>` : '')}
                    ${identityLabel ? `<div class="rs-meta">${identityLabel}</div>` : ''}
                    ${starsHtml}
                    ${logoHtml ? `<div class="rs-logos">${logoHtml}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const dotsHtml = embedReviews.map((_, i) => `<div class="rs-dot ${i === 0 ? 'active' : ''}"></div>`).join('');

    container.innerHTML = `
        <div class="rs-track" id="rsTrack">${cardsHtml}</div>
        <div class="rs-dots" id="rsDots">${dotsHtml}</div>
    `;
}

function updateEmbedPosition() {
    const track = document.getElementById('rsTrack');
    const dots = document.getElementById('rsDots');
    if (!track) return;
    track.style.transform = `translateX(-${embedIndex * 100}%)`;
    if (dots) {
        dots.querySelectorAll('.rs-dot').forEach((d, i) => d.classList.toggle('active', i === embedIndex));
    }
}

// ==================== COPY SERIES LINK ====================
// Copies a library URL — ?folder=X&highlight=Y — so visitors land
// in the Vault first (traffic + view tracking) rather than skipping
// straight to an external quiz app. Opens the full grid with that
// one item glowing and scrolled into view, keeping the "browse
// everything" feel intact rather than isolating a single item.
function copySeriesLink(itemId) {
    const item = seriesItemsCache.find(i => i.id === itemId);
    if (!item) return;

    const baseUrl = window.location.origin + window.location.pathname;
    const folderSlug = currentFolder ? (currentFolder.slug || currentFolder.tableName) : '';
    const itemSlug = item.custom_url || item.slug || item.id;
    const link = baseUrl + '?folder=' + encodeURIComponent(folderSlug) + '&highlight=' + encodeURIComponent(itemSlug);

    navigator.clipboard.writeText(link).then(() => {
        alert('✅ Link copied!\n\n' + item.title + '\n' + link);
    }).catch(() => {
        prompt('Copy this link:', link);
    });
}

function nativeShareSeriesItem(itemId) {
    const item = seriesItemsCache.find(i => i.id === itemId);
    if (!item) return;
    const SHARE_WORKER = 'https://3c-public-library.org';
    const folderSlug = currentFolder ? (currentFolder.slug || currentFolder.tableName) : '';
    const itemSlug = item.custom_url || item.slug || item.id;
    const link = `${SHARE_WORKER}/share/vault/${encodeURIComponent(folderSlug)}/${encodeURIComponent(itemSlug)}`;
    if (navigator.share) {
        navigator.share({
            url: link,
        }).catch(() => { /* cancelled */ });
    } else {
        // No native share sheet available — copy the same worker link
        // just built above, not a different one via copySeriesLink().
        navigator.clipboard.writeText(link).then(() => {
            alert('✅ Share link copied to clipboard!\n\n' + link);
        }).catch(() => {
            prompt('Copy this link:', link);
        });
    }
}

// ==================== OPEN SERIES ITEM ====================
function openSeriesItem(itemId) {
    const item = seriesItemsCache.find(i => i.id === itemId);
    if (!item) return;

    // Track that this item was opened — fire and forget, never
    // blocks navigation. Shows up as "Views" in the admin panel.
    if (typeof vaultClient !== 'undefined' && vaultClient.incrementSeriesViewCount) {
        vaultClient.incrementSeriesViewCount(item.id).catch(() => {});
    }

    if (item.type === 'pdf') {
        openPDFModal(item.url, item.title, item.id);
        return;
    }

    if (item.type === 'flipbook') {
        const isMobile = window.innerWidth <= 768;
        const page = isMobile ? '../flipbook-viewer-mobile.html' : '../flipbook-viewer.html';
        const url = item.url ? page + '?manifest=' + encodeURIComponent(item.url) : page + '?content=' + item.id;
        window.location.href = url;
        return;
    }

    if (item.type === 'presentation') {
        const url = item.url ? '../presentation-viewer.html?manifest=' + encodeURIComponent(item.url) : '../presentation-viewer.html?content=' + item.id;
        window.location.href = url;
        return;
    }

    if (item.type === 'video') { openSeriesMedia(item, 'video'); return; }
    if (item.type === 'audio') { openSeriesMedia(item, 'audio'); return; }
    if (item.type === 'image' || item.type === 'gif') { openSeriesMedia(item, 'image'); return; }

    // Quiz has its own exit button (fixed separately in quiz_app.js
    // to return to document.referrer) — still same-tab navigation.
    if (item.type === 'quiz') {
        window.location.href = item.url || item.external_url || '#';
        return;
    }

    // card-game, spin-wheel, landing-page, virtual-slideshow, link —
    // these are external single-page apps with no close button of
    // their own. Rather than navigate away entirely, load them in an
    // iframe inside the same modal video/audio already use, so the
    // vault's own X button controls closing — no changes needed to
    // the destination site itself.
    if (item.type === 'card-game' || item.type === 'spin-wheel' ||
        item.type === 'landing-page' || item.type === 'virtual-slideshow' || item.type === 'link') {
        openSeriesMedia(item, 'iframe');
        return;
    }

    // Fallback for anything unrecognised — still same-tab, not a new one
    window.location.href = item.url || item.external_url || '#';
}

// ==================== SERIES MEDIA MODAL ====================
// Reuses #mediaModal (already in vault.html). Video/image size to
// their own natural dimensions — no forced aspect ratio, no
// letterboxing margins. Plyr's hide-controls + replay-on-end
// behaviour (vault.html) picks up any <video> automatically via
// its MutationObserver, so no extra wiring needed here.
function openSeriesMedia(item, kind) {
    const modal = document.getElementById('mediaModal');
    const title = document.getElementById('mediaTitle');
    const container = document.getElementById('mediaContainer');
    if (!modal || !container) return;

    // Iframe-embedded apps already show their own title on screen —
    // showing ours too was just a duplicate sitting above it.
    if (title) title.textContent = (kind === 'iframe') ? '' : (item.title || '');
    container.innerHTML = '';

    if (kind === 'video') {
        container.innerHTML = '<video autoplay playsinline style="display:block; max-width:90vw; max-height:80vh; width:auto; height:auto; background:transparent; border-radius:8px;"><source src="' + item.url + '"></video>';
    } else if (kind === 'audio') {
        container.innerHTML = '<audio controls autoplay style="width:400px; max-width:90vw;"><source src="' + item.url + '"></audio>';
    } else if (kind === 'image') {
        container.innerHTML = '<img src="' + item.url + '" style="display:block; max-width:90vw; max-height:80vh; width:auto; height:auto; border-radius:8px;">';
    } else if (kind === 'iframe') {
        // No border, no radius, no background — the app itself already
        // has its own bezel/frame/background designed in. This iframe
        // is just an invisible window behind it.
        // Sized by percentage (100% of its parent), not vh — vh measures
        // against the full viewport including space a mobile browser's
        // address bar hasn't collapsed out of yet, which was pushing
        // content (like the app's own header) up out of view on phones.
        // #mediaModal is already correctly sized via fixed positioning,
        // so cascading percentage height down from it tracks the real
        // visible area correctly on every device.
        container.style.maxWidth = '100%';
        container.style.maxHeight = '100%';
        container.style.width = '100%';
        container.style.height = '100%';
        container.innerHTML = '<iframe src="' + (item.url || item.external_url) + '" style="width:100%; height:100%; border:none; background:transparent; display:block;" allow="autoplay; fullscreen"></iframe>';
    }

    modal.style.display = 'flex';
}

function closeMediaPlayer() {
    const modal = document.getElementById('mediaModal');
    const container = document.getElementById('mediaContainer');
    if (container) {
        container.querySelectorAll('video, audio').forEach(el => {
            try { el.pause(); el.currentTime = 0; el.src = ''; } catch (e) {}
        });
        container.innerHTML = '';
    }
    if (modal) modal.style.display = 'none';
}

// Click outside the media content (on the dark backdrop) closes it
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('mediaModal');
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeMediaPlayer(); });
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('mediaModal');
        if (modal && modal.style.display === 'flex') closeMediaPlayer();
    }
});

// Apps running inside the iframe modal (Mirror Quest and similar)
// can't just navigate to "go back" — that only changes what's shown
// inside their own small window, not the modal around them. Instead
// they post a message out to this page asking it to close the modal.
// Pair this with a standard exit function inside each app:
//
//   function vaultExit() {
//       if (window.parent && window.parent !== window) {
//           window.parent.postMessage({ type: 'vault-close-modal' }, '*');
//           return;
//       }
//       if (document.referrer) { window.location.href = document.referrer; }
//       else { window.history.back(); }
//   }
//
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'vault-close-modal') {
        closeMediaPlayer();
    }
});

// ==================== OPEN FOLDER SIDEBAR ====================
async function openFolderSidebar(folderId) {
    const folder = library.folders.find(f => f.id === folderId);
    if (!folder) return;
    if (folder.isPublic === false) { console.warn('Attempted to access private folder via sidebar:', folder.title); window.location.href = '?folder=' + folder.slug; return; }
    console.log('Opening folder sidebar for:', folder.title, 'ID:', folderId);
    const subfolders = library.folders.filter(f => f.parentId === folderId).sort((a, b) => a.title.localeCompare(b.title));

    let folderContent = [];
    if (folder.displayStyle === 'collection') {
        try {
            const items = await vaultClient.getContentSeries(folderId);
            folderContent = items.map(item => ({ id: item.id, title: item.title, slug: item.slug, type: item.type, folderId: item.folder_id, url: item.url, thumbnail: item.thumbnail_url, description: item.description, order: item.display_order }));
            console.log('Loaded series folder content:', folderContent.length, 'items');
        } catch (err) { console.error('Error loading series folder content:', err); }
    } else {
        try {
            const { data, error } = await vaultClient.client.from('vault_content')
                .select('id, folder_id, title, type, url, thumbnail_url, description, slug, display_order')
                .eq('folder_id', folderId).order('display_order', { ascending: true });
            console.log('Vault sidebar query result:', { data, error, count: data ? data.length : 0 });
            if (!error && data) {
                folderContent = data.map(item => ({ id: item.id, title: item.title, slug: item.slug, type: item.type, folderId: item.folder_id, url: item.url, thumbnail: item.thumbnail_url, description: item.description, order: item.display_order }));
                console.log('Loaded vault folder content:', folderContent.length, 'items');
            } else if (error) { console.error('Vault sidebar Supabase error:', error); }
        } catch (err) { console.error('Error loading vault folder content:', err); }
    }

    document.getElementById('sidebarFolderTitle').innerHTML = `<div><h3 style="margin: 0; color: #9b59b6; font-size: 18px;">${folder.title}</h3><div style="font-size: 12px; color: #808080; margin-top: 4px;">${folder.tableName || folder.slug}</div></div>`;

    let contentHtml = '';
    if (subfolders.length > 0) {
        subfolders.forEach(subfolder => {
            const itemCount = subfolder.actualItemCount || 0;
            contentHtml += `<div class="subfolder-card" onclick="window.location.href='?folder=${subfolder.slug}'"><div style="display: flex; align-items: center; gap: 10px;"><div style="font-size: 24px;">📂</div><div style="flex: 1;"><div style="font-weight: 600; color: #ffffff; font-size: 14px;">${subfolder.title}</div><div style="font-size: 11px; color: #808080;">${itemCount} items</div></div><div style="color: #9b59b6; font-size: 18px;">→</div></div></div>`;
        });
    }
    if (folderContent.length > 0) {
        const itemCount = folderContent.length;
        const isCollection = folder.displayStyle === 'collection';
        if (subfolders.length > 0) contentHtml += '<hr style="border: none; border-top: 1px solid rgba(155, 89, 182, 0.3); margin: 20px 0;">';
        contentHtml += '<p style="color: #9b59b6; margin-top: 15px; font-size: 14px;">' + (isCollection ? '🎬' : '📄') + ' This folder has ' + itemCount + ' content item' + (itemCount !== 1 ? 's' : '') + '. Click to view:</p>';
        contentHtml += '<button onclick="window.location.href=\'?folder=' + (folder.tableName || folder.slug) + '\'" style="background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(155, 89, 182, 0.3); transition: all 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 4px 12px rgba(155, 89, 182, 0.4)\'" onmouseout="this.style.transform=\'\'; this.style.boxShadow=\'0 2px 8px rgba(155, 89, 182, 0.3)\'">' + (isCollection ? '🎬 View Collection (' : '📂 View Content (') + itemCount + ')</button>';
    }
    if (folderContent.length === 0 && subfolders.length === 0) contentHtml = '<p style="color: #999; text-align: center; padding: 40px;">No sub-folders or content yet.</p>';
    document.getElementById('sidebarContent').innerHTML = contentHtml;
    document.getElementById('folderSidebar').style.display = 'block';
}

function closeFolderSidebar() { document.getElementById('folderSidebar').style.display = 'none'; }

// ==================== VIEW CONTENT ====================
function viewContent(contentSlug) {
    const content = findContentBySlug(contentSlug, currentFolder.id);
    if (content) showViewer(content);
}

// ==================== SHARE PDF LINK ====================
function sharePDFLink(contentId) {
    const baseUrl = window.location.origin + window.location.pathname;
    
    // Determine view type based on content type
    let viewType = 'pdf-only'; // default
    if (currentContent) {
        const type = currentContent.type;
        if (type === 'flipbook') {
            viewType = 'flipbook-only';
        } else if (type === 'presentation') {
            viewType = 'presentation-only';
        } else if (type === 'pdf') {
            viewType = 'pdf-only';
        } else if (type === 'video') {
            viewType = 'video-only';
        } else if (type === 'image' || type === 'gif') {
            viewType = 'image-only';
        } else if (type === 'audio') {
            viewType = 'audio-only';
        } else if (type === 'landing-page') {
            viewType = 'landing-page-only';
        } else if (type === 'virtual-slideshow') {
            viewType = 'virtual-slideshow-only';
        } else if (type === 'quiz') {
            viewType = 'quiz-only';
        } else if (type === 'card-game') {
            viewType = 'card-game-only';
        } else if (type === 'spin-wheel') {
            viewType = 'spin-wheel-only';
        } else if (type === 'link') {
            viewType = 'link-only';
        }
    }
    
    if (currentContent && currentFolder) {
        const folderTableName  = currentFolder.tableName;
        const contentCustomUrl = currentContent.customUrl || currentContent.slug;
        return baseUrl + '?folder=' + folderTableName + '&url=' + contentCustomUrl + '&view=' + viewType;
    }
    return baseUrl + '?content=' + contentId + '&view=' + viewType;
}

function buildShareWorkerLink(contentId) {
    // Share button only — routes through the share-preview Worker,
    // separate from sharePDFLink() (Copy Link), which stays on the
    // original direct-link format.
    const SHARE_WORKER = 'https://3c-public-library.org';
    if (currentContent && currentFolder) {
        const folderSlug = currentFolder.slug || currentFolder.tableName;
        const itemSlug = currentContent.customUrl || currentContent.slug || currentContent.id;
        return `${SHARE_WORKER}/share/vault/${encodeURIComponent(folderSlug)}/${encodeURIComponent(itemSlug)}`;
    }
    return sharePDFLink(contentId);
}

// ==================== SHOW VIEWER ====================
function showViewer(content, pdfOnlyMode) {
    if (pdfOnlyMode === undefined) pdfOnlyMode = false;
    currentContent = content;
    let viewerHtml = '';

    const shareButton = pdfOnlyMode ? '' : '<button onclick="nativeShareContent()" title="Share" style="background: rgba(0,212,200,0.1); border: 1px solid rgba(0,212,200,0.35); color: #00d4c8; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg></button><button onclick="copyShareLink()" title="Copy Link" style="background: rgba(155,89,182,0.15); border: 1px solid rgba(155,89,182,0.35); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>';

    if (content.type === 'pdf') {
        let thumbnailSrc = content.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23f0f0f0" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="80"%3E%F0%9F%93%84%3C/text%3E%3C/svg%3E';
        const safeUrl = content.url.replace(/`/g, '\\`'), safeTitle = content.title.replace(/`/g, '\\`');
        viewerHtml = `<div style="text-align: center; cursor: pointer;" onclick="openPDFModal(\`${safeUrl}\`, \`${safeTitle}\`, \`${content.id}\`)"><img src="${thumbnailSrc}" style="width: 80%; max-width: 400px; height: auto; border: 2px solid #ddd; border-radius: 8px; margin: 0 auto 20px auto; display: block; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"><div style="font-size: 18px; color: #9b59b6; font-weight: 600; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);">📄 Click to view PDF</div></div>`;
    } else if (content.type === 'flipbook') {
        let thumbnailSrc = content.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23f0f0f0" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="80"%3E%F0%9F%93%96%3C/text%3E%3C/svg%3E';
        const isMobile = window.innerWidth <= 768;
        const flipbookViewerPage = isMobile ? '../flipbook-viewer-mobile.html' : '../flipbook-viewer.html';
        const flipbookUrl = content.url ? flipbookViewerPage + '?manifest=' + encodeURIComponent(content.url) : flipbookViewerPage + '?content=' + content.id;
        viewerHtml = `<div style="text-align: center;"><img src="${thumbnailSrc}" style="width: 80%; max-width: 400px; height: auto; border-radius: 8px; margin: 0 auto 20px auto; display: block; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"><a href="${flipbookUrl}" onclick="event.stopPropagation(); window.location.href='${flipbookUrl}'; return false;" style="display: inline-flex; align-items: center; gap: 8px; font-size: 18px; color: #9b59b6; font-weight: 600; text-decoration: none; padding: 12px 24px; background: rgba(155, 89, 182, 0.1); border: 2px solid #9b59b6; border-radius: 8px; transition: all 0.3s; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);"><span style="font-size: 24px;">📖</span>Click to View Flipbook</a></div>`;
    } else if (content.type === 'presentation') {
        let thumbnailSrc = content.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23f0f0f0" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="80"%3E%F0%9F%93%8A%3C/text%3E%3C/svg%3E';
        const presentationUrl = content.url ? '../presentation-viewer.html?manifest=' + encodeURIComponent(content.url) : '../presentation-viewer.html?content=' + content.id;
        viewerHtml = `<div style="text-align: center;"><img src="${thumbnailSrc}" style="width: 80%; max-width: 400px; height: auto; border-radius: 8px; margin: 0 auto 20px auto; display: block; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"><a href="${presentationUrl}" onclick="event.stopPropagation(); window.location.href='${presentationUrl}'; return false;" style="display: inline-flex; align-items: center; gap: 8px; font-size: 18px; color: #9b59b6; font-weight: 600; text-decoration: none; padding: 12px 24px; background: rgba(155, 89, 182, 0.1); border: 2px solid #9b59b6; border-radius: 8px; transition: all 0.3s; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);"><span style="font-size: 24px;">📊</span>Click to View Presentation</a></div>`;
    } else if (content.type === 'video') {
        const isDirectVideo = /\.(mp4|webm|mov|ogg|m4v)(\?|#|$)/i.test(content.url);
        viewerHtml = (content.url.startsWith('data:') || isDirectVideo) ?
            '<div style="position:relative;width:fit-content;max-width:100%;margin:0 auto;background:transparent;border-radius:16px;overflow:hidden;">' +
            '<video id="vaultVideo" autoplay playsinline style="display:block;max-width:100%;height:auto;max-height:90vh;object-fit:contain;background:transparent;"><source src="' + content.url + '"></video>' +
            '<div id="vaultPlayOverlay" onclick="var v=document.getElementById(\'vaultVideo\');v.play();this.style.display=\'none\';" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;cursor:pointer;background:transparent;">' +
            '<div style="width:60px;height:60px;background:rgba(155,89,182,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;color:white;backdrop-filter:blur(4px);">▸</div></div></div>' :
            '<iframe src="' + content.url + '" style="width:100%;height:90vh;border:none;display:block;" allowfullscreen></iframe>';
    } else if (content.type === 'image' || content.type === 'gif') {
        viewerHtml = '<div style="display: flex; justify-content: center; padding: 20px;"><img src="' + content.url + '" style="max-width: 600px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>';
    } else if (content.type === 'audio') {
        viewerHtml = '<div style="display: flex; justify-content: center; padding: 40px;"><audio controls style="width: 100%; max-width: 600px; height: 54px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"><source src="' + content.url + '"></audio></div>';
    } else if (content.type === 'quiz' || content.type === 'card-game' || content.type === 'spin-wheel' || content.type === 'landing-page' || content.type === 'virtual-slideshow' || content.type === 'link') {
        const linkLabels = { 'quiz': 'Click to Open Quiz', 'card-game': 'Click to Open Card Game', 'spin-wheel': 'Click to Spin the Wheel', 'landing-page': 'Click to Open', 'virtual-slideshow': 'Click to Launch Virtual Slideshow', 'link': 'Click to Open Link' };
        const linkIcons  = { 'quiz': '🧠', 'card-game': '🃏', 'spin-wheel': '🎡', 'landing-page': '🚀', 'virtual-slideshow': '🎞️', 'link': '🔗' };
        const linkLabel  = linkLabels[content.type] || '🔗 Click to Open';
        const linkIcon   = linkIcons[content.type]  || '🔗';
        let thumbnailSrc = content.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23f0f0f0" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="80"%3E%F0%9F%94%97%3C/text%3E%3C/svg%3E';
        const target = content.url || content.externalUrl || '#';
        viewerHtml = '<div style="text-align: center;"><img src="' + thumbnailSrc + '" style="width: 80%; max-width: 400px; height: auto; border-radius: 8px; margin: 0 auto 20px auto; display: block; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"><a href="' + target + '" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; font-size: 18px; color: #9b59b6; font-weight: 600; text-decoration: none; padding: 12px 24px; background: rgba(155, 89, 182, 0.1); border: 2px solid #9b59b6; border-radius: 8px; transition: all 0.3s; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);"><span style="font-size: 24px;">' + linkIcon + '</span>' + linkLabel + '</a></div>';
    } else {
        // Unknown type — thumbnail + generic open button
        let thumbnailSrc = content.thumbnail || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400"%3E%3Crect fill="%23f0f0f0" width="300" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999" font-size="80"%3E%F0%9F%93%8E%3C/text%3E%3C/svg%3E';
        const target = content.url || content.externalUrl || '#';
        viewerHtml = '<div style="text-align: center;"><img src="' + thumbnailSrc + '" style="width: 80%; max-width: 400px; height: auto; border-radius: 8px; margin: 0 auto 20px auto; display: block; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"><a href="' + target + '" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; font-size: 18px; color: #9b59b6; font-weight: 600; text-decoration: none; padding: 12px 24px; background: rgba(155, 89, 182, 0.1); border: 2px solid #9b59b6; border-radius: 8px; transition: all 0.3s; text-shadow: 0 0 10px rgba(155, 89, 182, 0.5);"><span style="font-size: 24px;">📎</span>Click to Open</a></div>';
    }

    // Return icon — always climbs to the true root ancestor folder,
    // however deep the content is nested, and opens that root's full
    // sidebar (all its sub-folders + its own items). Matches
    // library.html's return behavior exactly.
    let returnButton = '';
    if (currentFolder) {
        let rootFolder = currentFolder;
        while (rootFolder.parentId) {
            const parent = library.folders.find(f => f.id === rootFolder.parentId);
            if (!parent) break;
            rootFolder = parent;
        }
        const folderHasContent = (rootFolder.actualItemCount && rootFolder.actualItemCount > 0)
            || library.folders.some(f => f.parentId === rootFolder.id);
        if (folderHasContent) {
            returnButton = '<button onclick="window.location.href=\'?openFolder=' + encodeURIComponent(rootFolder.id) + '\'" title="Return to folder content list" style="background: rgba(155,89,182,0.15); border: 1px solid rgba(155,89,182,0.35); color: #c084fc; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 2.64-6.36M3 4v5h5"/></svg></button>';
        }
    }

    const viewer = document.getElementById('viewer');
    if (pdfOnlyMode) viewer.innerHTML = '<div id="viewerContent" style="max-width: 800px; margin: 0 auto; padding: 20px;"></div>';
    let contentArea = document.getElementById('viewerContent');

    if (contentArea) {
        contentArea.style.display = 'block';
        contentArea.classList.add('active');
        const leftSidebar = document.getElementById('leftSidebar');
        if (leftSidebar && window.innerWidth <= 768) leftSidebar.classList.add('hidden');
    }

    const descHtml = content.description ? '<div class="viewer-desc">' + content.description + '</div>' : '';

    contentArea.innerHTML = '<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px;"><h2 style="font-size: 18px; margin: 0; flex: 1; min-width: 0;">' + content.title + '</h2><div style="display: flex; gap: 6px; flex-shrink: 0;">' + returnButton + shareButton + '</div></div>' + descHtml + viewerHtml + `
        <div class="comments-section" style="margin-top: 40px;">
            <div class="comments-header"><h3>💬 Comments</h3><span class="comment-count" id="commentCount">0</span></div>
            <div class="comment-form">
                <div id="commentSuccessMsg" class="comment-success" style="display: none;">✅ Thank you! Your comment has been posted successfully.</div>
                <input type="text" id="commentAuthorName" placeholder="Your Name *" required>
                <input type="email" id="commentAuthorEmail" placeholder="Your Email (optional, for notifications)">
                <textarea id="commentText" placeholder="Write your comment here... *" required></textarea>
                <button onclick="submitComment()" id="submitCommentBtn">Post Comment</button>
            </div>
            <div class="comments-list" id="commentsList"><div class="no-comments">No comments yet. Be the first to comment!</div></div>
        </div>
    `;
    loadComments(content.id);

    // Telegram webview autoplay fallback — show play overlay only if autoplay blocked at start
    const vaultVid = document.getElementById('vaultVideo');
    const vaultOverlay = document.getElementById('vaultPlayOverlay');
    if (vaultVid && vaultOverlay) {
        vaultVid.play().then(() => {
            vaultOverlay.style.display = 'none';
        }).catch(() => {
            vaultOverlay.style.display = 'flex';
        });
    }
}

// ==================== COPY SHARE LINK ====================
function copyFolderLink(folderRef) {
    const link = `${window.location.origin}${window.location.pathname}?folder=${encodeURIComponent(folderRef)}`;
    navigator.clipboard.writeText(link).then(() => { alert('✅ Folder link copied to clipboard!\n\n' + link); }).catch(err => { prompt('Copy this link:', link); });
}

function copyShareLink() {
    if (!currentContent) return;
    const shareLink = sharePDFLink(currentContent.id);
    navigator.clipboard.writeText(shareLink).then(() => { alert('✅ Link copied to clipboard!\n\n' + shareLink); }).catch(err => { prompt('Copy this link:', shareLink); });
}

function nativeShareContent() {
    if (!currentContent) return;
    const shareLink = buildShareWorkerLink(currentContent.id);
    if (navigator.share) {
        navigator.share({
            url: shareLink,
        }).catch(() => { /* cancelled */ });
    } else {
        // No native share sheet available (most desktop browsers) —
        // copy the SAME worker-routed link just built above, not a
        // different one via copyShareLink().
        navigator.clipboard.writeText(shareLink).then(() => {
            alert('✅ Share link copied to clipboard!\n\n' + shareLink);
        }).catch(() => {
            prompt('Copy this link:', shareLink);
        });
    }
}

// ==================== PDF MODAL ====================
function openPDFModal(pdfUrl, title, contentId) {
    const modal = document.getElementById('pdfModal'), titleEl = document.getElementById('pdfTitle');
    if (!modal || !titleEl) return;
    titleEl.textContent = title;
    modal.classList.add('active');
    if (typeof window.loadPdfInViewer === 'function') window.loadPdfInViewer(pdfUrl);
    else if (typeof window.openEnhancedPDF === 'function') window.openEnhancedPDF(pdfUrl, title);
}

function closePDFModal() { const modal = document.getElementById('pdfModal'); if (modal) modal.classList.remove('active'); }

// ==================== HIDE CONTENT VIEWER ====================
// hideContentViewer() removed — its only caller (the return icon) now
// navigates to the root folder's sidebar instead. vault.html's video-stop
// wrapper around this function has been cleaned up to match.

// ==================== LAZY LOADING ====================
let thumbnailObserver;
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        thumbnailObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const thumbnail = entry.target, bgImage = thumbnail.getAttribute('data-bg');
                    if (bgImage) {
                        const img = new Image(); img.decoding = 'async';
                        img.onload = () => { thumbnail.style.backgroundImage = 'url(\'' + bgImage + '\')'; thumbnail.style.backgroundSize = 'cover'; thumbnail.style.backgroundPosition = 'center'; };
                        img.src = bgImage; thumbnail.removeAttribute('data-bg'); thumbnailObserver.unobserve(thumbnail);
                    }
                }
            });
        }, { rootMargin: '200px', threshold: 0.01 });
    }
}
function observeThumbnails() { if (thumbnailObserver) document.querySelectorAll('.content-thumbnail[data-bg]').forEach(t => thumbnailObserver.observe(t)); }
initLazyLoading();

// ==================== COMMENTS ====================
async function loadComments(contentId) {
    try {
        console.log('Loading vault comments for content:', contentId);
        const { data: comments, error } = await vaultClient.client.from('vault_comments').select('*').eq('content_id', contentId).eq('is_approved', true).order('created_at', { ascending: true });
        if (error) throw error;
        const count = comments ? comments.length : 0;
        const commentCountEl = document.getElementById('commentCount');
        if (commentCountEl) commentCountEl.textContent = count;
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;
        if (count === 0) { commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>'; return; }
        commentsList.innerHTML = comments.map(comment => '<div class="comment-item"><div class="comment-header"><span class="comment-author">' + escapeHtml(comment.author_name) + '</span><span class="comment-date">' + formatDate(comment.created_at) + '</span></div><div class="comment-text">' + escapeHtml(comment.comment_text) + '</div></div>').join('');
    } catch (error) { console.error('Error loading vault comments:', error); const cl = document.getElementById('commentsList'); if (cl) cl.innerHTML = '<div class="no-comments">Error loading comments.</div>'; }
}

async function submitComment() {
    const authorName = document.getElementById('commentAuthorName').value.trim();
    const authorEmail = document.getElementById('commentAuthorEmail').value.trim();
    const commentText = document.getElementById('commentText').value.trim();
    const submitBtn = document.getElementById('submitCommentBtn');
    if (!authorName || !commentText) { alert('Please fill in your name and comment.'); return; }
    if (!currentContent || !currentContent.id) { alert('No content selected for commenting.'); return; }
    try {
        submitBtn.disabled = true; submitBtn.textContent = 'Posting...';
        const { error } = await vaultClient.client.from('vault_comments').insert([{ content_id: currentContent.id, author_name: authorName, author_email: authorEmail || null, comment_text: commentText, is_approved: true }]);
        if (error) throw error;
        const successMsg = document.getElementById('commentSuccessMsg');
        if (successMsg) { successMsg.style.display = 'block'; setTimeout(() => { successMsg.style.display = 'none'; }, 5000); }
        document.getElementById('commentAuthorName').value = ''; document.getElementById('commentAuthorEmail').value = ''; document.getElementById('commentText').value = '';
        await loadComments(currentContent.id); console.log('Vault comment submitted');
    } catch (error) { console.error('Error submitting vault comment:', error); alert('Error submitting comment: ' + (error.message || error.toString()) + '\n\nPlease try again or contact support.'); }
    finally { submitBtn.disabled = false; submitBtn.textContent = 'Post Comment'; }
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function formatDate(dateString) {
    const date = new Date(dateString), now = new Date(), diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000), diffHours = Math.floor(diffMs / 3600000), diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' minute' + (diffMins > 1 ? 's' : '') + ' ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==================== PRIVATE FOLDER PASSWORD ====================

function isOwner() {
    if (!currentUser || !currentUser.email) return false;
    const ownerEmail = CONFIG && CONFIG.app ? CONFIG.app.ownerEmail : null;
    if (!ownerEmail) return false;
    return currentUser.email.toLowerCase() === ownerEmail.toLowerCase();
}

async function checkCurrentUser() {
    try {
        if (!vaultClient || !vaultClient.client) return;
        const result = await vaultClient.client.auth.getUser();
        currentUser = result.data.user;
        if (currentUser) { console.log('Vault: Logged in as:', currentUser.email); if (isOwner()) console.log('Owner access granted'); }
    } catch (error) { console.error('Error checking vault user:', error); currentUser = null; }
}

function isFolderPrivate(folder) { return folder && folder.is_public === false; }

function promptForFolderPassword(folder) {
    pendingPrivateFolder = folder;
    const modal = document.getElementById('passwordPromptModal'), folderNameEl = document.getElementById('passwordPromptFolderName'), inputEl = document.getElementById('passwordPromptInput'), errorEl = document.getElementById('passwordError');
    folderNameEl.textContent = 'Enter password to access: ' + folder.title;
    inputEl.value = ''; errorEl.style.display = 'none'; modal.style.display = 'flex'; inputEl.focus();
    inputEl.onkeypress = (e) => { if (e.key === 'Enter') submitFolderPassword(); };
}

async function submitFolderPassword() {
    if (!pendingPrivateFolder) return;
    const inputEl = document.getElementById('passwordPromptInput'), errorEl = document.getElementById('passwordError'), password = inputEl.value.trim();
    if (!password) { errorEl.textContent = 'Please enter a password'; errorEl.style.display = 'block'; return; }
    try {
        const { data: passwords, error } = await vaultClient.client.from('vault_folder_passwords').select('*').eq('folder_id', pendingPrivateFolder.id).eq('is_active', true);
        if (error) throw error;
        if (!passwords || passwords.length === 0) { errorEl.textContent = 'No active passwords for this folder'; errorEl.style.display = 'block'; return; }
        let passwordValid = false;
        for (const pwd of passwords) {
            if (pwd.expires_at && new Date(pwd.expires_at) < new Date()) continue;
            const isValid = await PasswordUtils.verifyPassword(password, pwd.password_hash);
            if (isValid) { passwordValid = true; break; }
        }
        if (passwordValid) { PasswordUtils.grantAccess(pendingPrivateFolder.id); closePasswordPrompt(); window.location.href = '?folder=' + pendingPrivateFolder.slug; }
        else { errorEl.textContent = '❌ Invalid password'; errorEl.style.display = 'block'; inputEl.value = ''; inputEl.focus(); }
    } catch (error) { console.error('Error validating vault password:', error); errorEl.textContent = 'Error validating password'; errorEl.style.display = 'block'; }
}

function closePasswordPrompt() { const modal = document.getElementById('passwordPromptModal'); if (modal) modal.style.display = 'none'; pendingPrivateFolder = null; }
function checkPrivateFolderAccess(folder) { if (!isFolderPrivate(folder)) return true; return PasswordUtils.hasAccess(folder.id); }
