/**
 * 3C Content Library - Flipbook Viewer
 * Cloned from interactive-pdf builder for public viewing
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let currentPage = 1;
let totalPages = 0;
let scale = 1.5; // 100% zoom
let manifest = null;
let pageCanvases = [];
let flipbookInitialized = false;
let contentId = null;
let contentData = null;

// A4 dimensions at 96 DPI (standard web DPI)
const A4_WIDTH_PX = 794;  // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

// DOM elements
const loading = document.getElementById('loading');
const mediaOverlay = document.getElementById('media-overlay');
const mediaPlayerWrapper = document.getElementById('media-player-wrapper');
const mediaTitle = document.getElementById('media-title');
const closeMediaBtn = document.getElementById('close-media');

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        content: params.get('content')
    };
}

/**
 * Initialize flipbook
 */
async function init() {
    try {
        const params = getUrlParams();
        contentId = params.content;

        if (!contentId) {
            alert('No content ID provided');
            loading.classList.add('hidden');
            goBack();
            return;
        }

        // Initialize Supabase
        if (!supabaseClient.isConnected) {
            await supabaseClient.init(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        }

        // Load content from Supabase
        await loadContentFromSupabase(contentId);

        loading.classList.add('hidden');
    } catch (error) {
        console.error('Init error:', error);
        alert('Failed to load flipbook: ' + error.message);
        loading.classList.add('hidden');
        goBack();
    }
}

/**
 * Load content from Supabase
 */
async function loadContentFromSupabase(id) {
    try {
        // Try content_public first
        let { data, error } = await supabaseClient.client
            .from('content_public')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !data) {
            // Try content_private
            const privateResult = await supabaseClient.client
                .from('content_private')
                .select('*')
                .eq('id', id)
                .single();
            
            data = privateResult.data;
            error = privateResult.error;
        }
        
        if (error || !data) {
            throw new Error('Content not found: ' + (error?.message || 'Unknown error'));
        }

        contentData = data;
        
        // Check if this has project_json (interactive flipbook data)
        if (!contentData.project_json) {
            // Regular PDF - redirect to normal viewer
            window.location.href = `library.html?content=${id}`;
            return;
        }

        // Parse project data
        manifest = JSON.parse(contentData.project_json);
        console.log('Flipbook manifest loaded:', manifest);

        // Initialize from manifest
        await initFromManifest(manifest);

    } catch (error) {
        console.error('Error loading content:', error);
        throw error;
    }
}

/**
 * Initialize from JSON manifest
 */
async function initFromManifest(manifestData) {
    manifest = manifestData;
    totalPages = manifest.pages ? manifest.pages.length : 0;
    
    if (totalPages === 0) {
        throw new Error('No pages found in flipbook data');
    }
    
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('zoom-level').textContent = Math.round((scale / 1.5) * 100) + '%';
    
    console.log('Rendering', totalPages, 'pages...');
    
    // Create canvases from page backgrounds
    pageCanvases = [];
    
    for (const page of manifest.pages) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = () => {
                // Calculate canvas size based on A4 proportions
                const targetWidth = A4_WIDTH_PX * scale;
                const targetHeight = A4_HEIGHT_PX * scale;
                
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                resolve();
            };
            img.onerror = () => {
                // If image fails to load, create blank A4 canvas
                console.warn('Failed to load background for page', page.pageNumber);
                canvas.width = A4_WIDTH_PX * scale;
                canvas.height = A4_HEIGHT_PX * scale;
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                resolve();
            };
            
            // Handle different background formats
            if (page.background && page.background.startsWith('data:')) {
                img.src = page.background;
            } else if (page.backgroundData) {
                img.src = page.backgroundData;
            } else if (page.background) {
                img.src = page.background;
            } else {
                // No background - create blank
                canvas.width = A4_WIDTH_PX * scale;
                canvas.height = A4_HEIGHT_PX * scale;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve();
            }
        });
        
        pageCanvases.push(canvas);
        console.log('Rendered page:', page.pageNumber);
    }
    
    // Initialize flipbook
    initFlipbook();
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Initialize turn.js flipbook
 */
function initFlipbook() {
    const flipbook = $('#flipbook');
    
    // Clear existing content
    flipbook.empty();
    
    // Add pages to flipbook
    pageCanvases.forEach((canvas, index) => {
        const pageDiv = $('<div class="page"></div>');
        
        // Add canvas
        pageDiv.append(canvas);
        
        // Add interactive overlay if page has elements
        if (manifest.pages[index].elements && manifest.pages[index].elements.length > 0) {
            const overlay = createInteractiveOverlay(manifest.pages[index], canvas.width, canvas.height);
            pageDiv.append(overlay);
        }
        
        // Add page number
        const pageNumber = $('<div class="page-number"></div>').text(index + 1);
        pageDiv.append(pageNumber);
        
        flipbook.append(pageDiv);
    });
    
    // Calculate dimensions
    const pageWidth = pageCanvases[0].width;
    const pageHeight = pageCanvases[0].height;
    
    // Initialize turn.js
    flipbook.turn({
        width: pageWidth * 2, // Double width for spread
        height: pageHeight,
        autoCenter: true,
        gradients: true,
        elevation: 50,
        acceleration: true,
        duration: 1000,
        pages: totalPages,
        when: {
            turning: function(event, page, view) {
                currentPage = page;
                updatePageInfo();
            },
            turned: function(event, page, view) {
                // Page turned
            }
        }
    });
    
    flipbookInitialized = true;
    updatePageInfo();
    
    console.log('Flipbook initialized at', Math.round((scale / 1.5) * 100) + '% zoom');
}

/**
 * Create interactive overlay for a page
 */
function createInteractiveOverlay(pageData, canvasWidth, canvasHeight) {
    const overlay = $('<div class="interactive-overlay"></div>');
    
    if (!pageData.elements || pageData.elements.length === 0) {
        return overlay;
    }
    
    // Calculate scale factor from original A4 size to current canvas size
    const scaleX = canvasWidth / A4_WIDTH_PX;
    const scaleY = canvasHeight / A4_HEIGHT_PX;
    
    pageData.elements.forEach(element => {
        const el = $('<div class="interactive-element"></div>');
        
        // Scale position and size
        el.css({
            left: (element.x * scaleX) + 'px',
            top: (element.y * scaleY) + 'px',
            width: (element.width * scaleX) + 'px',
            height: (element.height * scaleY) + 'px'
        });
        
        // Handle different element types
        switch (element.type) {
            case 'video':
                el.css({
                    border: '2px solid #8b5cf6',
                    borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.1)'
                });
                el.html('<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b5cf6; font-size: 24px;">▶</div>');
                el.on('click', (e) => {
                    e.stopPropagation();
                    playMedia(element, 'video');
                });
                break;
                
            case 'audio':
                el.css({
                    border: '2px solid #8b5cf6',
                    borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.1)'
                });
                el.html('<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #8b5cf6; font-size: 20px;">🔊</div>');
                el.on('click', (e) => {
                    e.stopPropagation();
                    playMedia(element, 'audio');
                });
                break;
                
            case 'image':
                el.css({
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                });
                if (element.url) {
                    el.html(`<img src="${element.url}" style="width: 100%; height: 100%; object-fit: cover;">`);
                }
                break;
                
            case 'button':
                el.css({
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                });
                el.text(element.text || 'Click Me');
                el.on('click', (e) => {
                    e.stopPropagation();
                    if (element.url) {
                        window.open(element.url, '_blank');
                    }
                });
                break;
                
            case 'hotspot':
                el.css({
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: '2px dashed #8b5cf6',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8b5cf6',
                    fontSize: '24px'
                });
                el.html('👆');
                el.on('click', (e) => {
                    e.stopPropagation();
                    if (element.url) {
                        window.open(element.url, '_blank');
                    } else if (element.text) {
                        alert(element.text);
                    }
                });
                break;
        }
        
        overlay.append(el);
    });
    
    return overlay;
}

/**
 * Play video/audio in overlay
 */
function playMedia(element, type) {
    mediaTitle.textContent = element.text || element.title || (type === 'video' ? 'Video' : 'Audio');
    mediaPlayerWrapper.innerHTML = '';
    
    if (type === 'video') {
        if (element.url && (element.url.includes('youtube.com') || element.url.includes('youtu.be'))) {
            // YouTube video
            const videoId = extractYouTubeId(element.url);
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            mediaPlayerWrapper.appendChild(iframe);
        } else if (element.url) {
            // Direct video
            const video = document.createElement('video');
            video.src = element.url;
            video.controls = true;
            video.autoplay = true;
            mediaPlayerWrapper.appendChild(video);
        }
    } else if (type === 'audio') {
        const audio = document.createElement('audio');
        audio.src = element.url;
        audio.controls = true;
        audio.autoplay = true;
        audio.style.width = '100%';
        mediaPlayerWrapper.appendChild(audio);
    }
    
    mediaOverlay.classList.add('active');
}

/**
 * Extract YouTube video ID
 */
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Close media overlay
 */
function closeMedia() {
    mediaOverlay.classList.remove('active');
    
    mediaPlayerWrapper.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.currentTime = 0;
    });
    
    setTimeout(() => {
        mediaPlayerWrapper.innerHTML = '';
    }, 300);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation buttons
    $('#first-page').on('click', () => {
        $('#flipbook').turn('page', 1);
    });
    
    $('#prev-page').on('click', () => {
        $('#flipbook').turn('previous');
    });
    
    $('#next-page').on('click', () => {
        $('#flipbook').turn('next');
    });
    
    $('#last-page').on('click', () => {
        $('#flipbook').turn('page', totalPages);
    });
    
    // Zoom controls
    $('#zoom-in').on('click', async () => {
        scale += 0.375; // 25% increment (1.5 * 0.25 = 0.375)
        $('#zoom-level').text(Math.round((scale / 1.5) * 100) + '%');
        await reloadFlipbook();
    });
    
    $('#zoom-out').on('click', async () => {
        if (scale > 0.75) { // Minimum 50% zoom
            scale -= 0.375;
            $('#zoom-level').text(Math.round((scale / 1.5) * 100) + '%');
            await reloadFlipbook();
        }
    });
    
    // Back button
    $('#back-btn').on('click', goBack);
    
    // Close media
    closeMediaBtn.addEventListener('click', closeMedia);
    mediaOverlay.addEventListener('click', (e) => {
        if (e.target === mediaOverlay) {
            closeMedia();
        }
    });
    
    // Keyboard shortcuts
    $(document).on('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            $('#flipbook').turn('previous');
        } else if (e.key === 'ArrowRight') {
            $('#flipbook').turn('next');
        } else if (e.key === 'Home') {
            $('#flipbook').turn('page', 1);
        } else if (e.key === 'End') {
            $('#flipbook').turn('page', totalPages);
        } else if (e.key === 'Escape') {
            closeMedia();
        }
    });
}

/**
 * Reload flipbook after zoom change
 */
async function reloadFlipbook() {
    loading.classList.remove('hidden');
    
    // Destroy existing flipbook
    if (flipbookInitialized) {
        $('#flipbook').turn('destroy');
    }
    
    // Re-render from manifest
    await initFromManifest(manifest);
    
    loading.classList.add('hidden');
}

/**
 * Update page info display
 */
function updatePageInfo() {
    $('#current-page').text(currentPage);
    
    // Update button states
    $('#first-page, #prev-page').prop('disabled', currentPage === 1);
    $('#next-page, #last-page').prop('disabled', currentPage === totalPages);
}

/**
 * Go back to library
 */
function goBack() {
    const params = getUrlParams();
    if (params.folder) {
        window.location.href = `library.html?folder=${params.folder}&content=${contentId}`;
    } else if (contentId) {
        window.location.href = `library.html?content=${contentId}`;
    } else {
        window.location.href = 'library.html';
    }
}

// Initialize on load
$(document).ready(() => {
    init();
});
