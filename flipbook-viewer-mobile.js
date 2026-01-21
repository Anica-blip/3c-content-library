/**
 * 3C Mobile Flipbook Viewer
 * Single-page viewer for mobile devices with swipe navigation and pinch-to-zoom
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let manifest = null;
let currentPage = 1;
let totalPages = 0;
let pageCanvases = [];
let contentId = null;
let manifestUrl = null;

// A4 dimensions at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// Editor saves at 75% scale (595px × 842px)
const EDITOR_WIDTH_PX = 595;
const EDITOR_HEIGHT_PX = 842;

// Render scale for crisp images
const RENDER_SCALE = 2;

// DOM elements
const loading = document.getElementById('loading');
const pageContainer = document.getElementById('page-container');
const pageWrapper = document.getElementById('page-wrapper');
const pageCounter = document.getElementById('page-counter');
const mediaOverlay = document.getElementById('media-overlay');
const mediaPlayer = document.getElementById('media-player');
const closeMediaBtn = document.getElementById('close-media');

/**
 * Initialize the mobile flipbook viewer
 */
async function init() {
    console.log('🚀 Initializing 3C Mobile Flipbook Viewer');
    
    // Get URL parameters
    const params = getUrlParams();
    contentId = params.content;
    manifestUrl = params.manifest;
    
    console.log('📍 Content ID:', contentId);
    console.log('📍 Manifest URL:', manifestUrl);
    
    if (!contentId && !manifestUrl) {
        console.error('❌ No content ID or manifest URL provided');
        alert('Error: No flipbook content specified');
        goBack();
        return;
    }
    
    try {
        // Load manifest
        if (manifestUrl) {
            await loadManifestFromUrl(manifestUrl);
        } else if (contentId) {
            await loadContentFromSupabase(contentId);
        }
        
        if (!manifest) {
            throw new Error('Failed to load manifest');
        }
        
        // Initialize viewer
        await initFromManifest();
        setupEventListeners();
        setupTouchGestures();
        
    } catch (error) {
        console.error('❌ Error initializing flipbook:', error);
        alert('Error loading flipbook: ' + error.message);
        goBack();
    }
}

/**
 * Get URL parameters
 */
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        content: params.get('content'),
        manifest: params.get('manifest')
    };
}

/**
 * Load manifest from Cloudflare R2 URL
 */
async function loadManifestFromUrl(url) {
    console.log('📥 Loading manifest from URL:', url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        manifest = await response.json();
        console.log('✅ Manifest loaded:', manifest);
    } catch (error) {
        console.error('❌ Error loading manifest:', error);
        throw error;
    }
}

/**
 * Load content from Supabase
 */
async function loadContentFromSupabase(contentId) {
    console.log('📥 Loading content from Supabase:', contentId);
    try {
        const { data, error } = await supabase
            .from('content')
            .select('*')
            .eq('id', contentId)
            .single();
        
        if (error) throw error;
        if (!data) throw new Error('Content not found');
        
        console.log('✅ Content loaded:', data);
        
        // Check if it's a flipbook (has project_json)
        if (!data.project_json) {
            console.log('⚠️ Not a flipbook, redirecting to library');
            window.location.href = `library.html?content=${contentId}`;
            return;
        }
        
        manifest = data.project_json;
        console.log('✅ Manifest extracted from Supabase');
    } catch (error) {
        console.error('❌ Error loading from Supabase:', error);
        throw error;
    }
}

/**
 * Initialize from manifest
 */
async function initFromManifest() {
    console.log('📖 Initializing from manifest');
    
    // Sort pages by page number
    if (manifest.pages) {
        manifest.pages.sort((a, b) => a.page - b.page);
    }
    
    totalPages = manifest.pages ? manifest.pages.length : 0;
    console.log('📄 Total pages:', totalPages);
    
    if (totalPages === 0) {
        throw new Error('No pages found in manifest');
    }
    
    // Update page counter
    updatePageCounter();
    
    // Render first page
    await renderPage(currentPage);
    
    loading.classList.add('hidden');
    console.log('✅ Mobile flipbook initialized');
}

/**
 * Render a single page
 */
async function renderPage(pageNum) {
    console.log('🎨 Rendering page:', pageNum);
    loading.classList.remove('hidden');
    
    try {
        const pageData = manifest.pages[pageNum - 1];
        if (!pageData) {
            throw new Error(`Page ${pageNum} not found`);
        }
        
        // Clear page wrapper
        pageWrapper.innerHTML = '';
        
        // Calculate responsive page size
        const containerWidth = pageContainer.clientWidth;
        const containerHeight = pageContainer.clientHeight;
        
        // Calculate scale to fit container while maintaining aspect ratio
        const scaleX = (containerWidth - 40) / A4_WIDTH_PX; // 40px padding
        const scaleY = (containerHeight - 40) / A4_HEIGHT_PX;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
        
        const displayWidth = Math.round(A4_WIDTH_PX * scale);
        const displayHeight = Math.round(A4_HEIGHT_PX * scale);
        
        console.log('📐 Page dimensions:', displayWidth, 'x', displayHeight, 'at', Math.round(scale * 100) + '%');
        
        // Create page div
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.style.width = displayWidth + 'px';
        pageDiv.style.height = displayHeight + 'px';
        
        // Create canvas for page image
        const canvas = document.createElement('canvas');
        canvas.width = displayWidth * RENDER_SCALE;
        canvas.height = displayHeight * RENDER_SCALE;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Load and draw page image (same logic as desktop viewer)
        // Check for backgroundData, background (data: or URL)
        let backgroundSource = null;
        if (pageData.backgroundData) {
            backgroundSource = pageData.backgroundData;
            console.log('📸 Loading page from backgroundData');
        } else if (pageData.background && pageData.background.startsWith('data:')) {
            backgroundSource = pageData.background;
            console.log('📸 Loading page from background (data URL)');
        } else if (pageData.background) {
            backgroundSource = pageData.background;
            console.log('📸 Loading page from background URL:', pageData.background);
        } else if (pageData.imageUrl) {
            backgroundSource = pageData.imageUrl;
            console.log('📸 Loading page from imageUrl:', pageData.imageUrl);
        }
        
        if (backgroundSource) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    console.log('✅ Page image rendered successfully');
                    resolve();
                };
                img.onerror = (e) => {
                    console.error('❌ Error loading page image:', backgroundSource);
                    console.error('Error details:', e);
                    // Draw white background if image fails to load
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    resolve(); // Don't reject, continue with white background
                };
                img.src = backgroundSource;
            });
        } else {
            console.warn('⚠️ No background image found in page data');
            console.log('Page data keys:', Object.keys(pageData));
            // Draw white background if no image source
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        pageDiv.appendChild(canvas);
        
        // Render interactive elements
        if (pageData.elements && pageData.elements.length > 0) {
            console.log('🎯 Rendering', pageData.elements.length, 'interactive elements');
            renderInteractiveElements(pageDiv, pageData.elements, displayWidth, displayHeight);
        }
        
        pageWrapper.appendChild(pageDiv);
        
    } catch (error) {
        console.error('❌ Error rendering page:', error);
        alert('Error rendering page: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Render interactive elements on page
 */
function renderInteractiveElements(pageDiv, elements, pageWidth, pageHeight) {
    // Filter positioned elements
    const positionedElements = elements.filter(element => {
        return (element.x !== undefined && element.x !== null) && 
               (element.y !== undefined && element.y !== null) &&
               element.type !== 'container' &&
               element.type !== 'element-container';
    });
    
    if (positionedElements.length === 0) return;
    
    // Calculate scale from editor canvas to actual page
    const scaleX = pageWidth / EDITOR_WIDTH_PX;
    const scaleY = pageHeight / EDITOR_HEIGHT_PX;
    
    positionedElements.forEach((element, idx) => {
        const scaledX = element.x * scaleX;
        const scaledY = element.y * scaleY;
        const scaledWidth = (element.width || 100) * scaleX;
        const scaledHeight = (element.height || 40) * scaleY;
        
        const elementDiv = document.createElement('div');
        elementDiv.className = 'interactive-element';
        elementDiv.style.left = scaledX + 'px';
        elementDiv.style.top = scaledY + 'px';
        elementDiv.style.width = scaledWidth + 'px';
        elementDiv.style.height = scaledHeight + 'px';
        
        // Store element data
        elementDiv.dataset.elementType = element.type;
        elementDiv.dataset.elementData = JSON.stringify(element);
        
        // Add visual representation based on element type
        if (element.type === '3c-button' || element.type === 'button') {
            if (element.imagePath || element.image) {
                const imgSrc = element.imagePath || element.image;
                console.log('🖼️ Button image:', imgSrc);
                const img = document.createElement('img');
                img.src = imgSrc;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.onerror = () => console.error('❌ Failed to load button image:', imgSrc);
                img.onload = () => console.log('✅ Button image loaded:', imgSrc);
                elementDiv.appendChild(img);
            } else {
                console.warn('⚠️ Button has no image:', element);
            }
        } else if (element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
            if (element.imagePath || element.image) {
                const imgSrc = element.imagePath || element.image;
                console.log('🖼️ Emoji image:', imgSrc);
                const img = document.createElement('img');
                img.src = imgSrc;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.onerror = () => console.error('❌ Failed to load emoji image:', imgSrc);
                img.onload = () => console.log('✅ Emoji image loaded:', imgSrc);
                elementDiv.appendChild(img);
            } else {
                console.warn('⚠️ Emoji has no image:', element);
            }
        } else if (element.type === 'video' || element.type === 'cloudflare-stream') {
            // Show play button overlay
            if (element.thumbnailUrl) {
                console.log('🖼️ Video thumbnail:', element.thumbnailUrl);
                const img = document.createElement('img');
                img.src = element.thumbnailUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.onerror = () => console.error('❌ Failed to load video thumbnail:', element.thumbnailUrl);
                img.onload = () => console.log('✅ Video thumbnail loaded:', element.thumbnailUrl);
                elementDiv.appendChild(img);
            }
            // Add play icon
            const playIcon = document.createElement('div');
            playIcon.innerHTML = '▶';
            playIcon.style.position = 'absolute';
            playIcon.style.top = '50%';
            playIcon.style.left = '50%';
            playIcon.style.transform = 'translate(-50%, -50%)';
            playIcon.style.fontSize = Math.min(scaledWidth, scaledHeight) * 0.3 + 'px';
            playIcon.style.color = 'white';
            playIcon.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
            playIcon.style.pointerEvents = 'none';
            elementDiv.appendChild(playIcon);
        }
        
        // Add click handler
        elementDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            handleElementClick(element);
        });
        
        pageDiv.appendChild(elementDiv);
    });
}

/**
 * Handle interactive element click
 */
function handleElementClick(element) {
    console.log('🖱️ Element clicked:', element.type);
    
    const elementType = element.type;
    
    if (elementType === '3c-button' || elementType === 'button') {
        if (element.url) {
            let buttonUrl = element.url;
            if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
                buttonUrl = 'https://' + buttonUrl;
            }
            
            if (isVideoUrl(buttonUrl)) {
                console.log('🎥 Opening video...');
                playMedia({...element, url: buttonUrl}, 'video');
            } else {
                console.log('🔗 Button link - staying in viewer');
                // Don't open in new tab, just log for now
                // Could implement in-viewer navigation later
            }
        } else if (element.videoUrl || element.streamId) {
            playMedia(element, 'video');
        }
    } else if (elementType === 'video' || elementType === 'cloudflare-stream') {
        console.log('🎬 Opening video element...');
        playMedia(element, 'video');
    } else if (elementType === '3c-emoji' || elementType === '3c-emoji-decoration') {
        if (element.url) {
            let emojiUrl = element.url;
            if (!emojiUrl.startsWith('http://') && !emojiUrl.startsWith('https://')) {
                emojiUrl = 'https://' + emojiUrl;
            }
            
            if (isVideoUrl(emojiUrl)) {
                console.log('🎥 3c-emoji video detected, using overlay...');
                playMedia({...element, url: emojiUrl}, 'video');
            } else {
                console.log('🔗 Emoji link - staying in viewer');
                // Don't open in new tab, just log for now
            }
        }
    } else if (elementType === 'hotspot' || elementType === 'link') {
        if (element.url) {
            if (isVideoUrl(element.url)) {
                playMedia(element, 'video');
            } else {
                console.log('🔗 Hotspot/link - staying in viewer');
                // Don't open in new tab
            }
        }
    }
}

/**
 * Check if URL is a video
 */
function isVideoUrl(url) {
    if (!url) return false;
    const videoPatterns = [
        /youtube\.com\/watch/i,
        /youtu\.be\//i,
        /vimeo\.com\//i,
        /\.mp4$/i,
        /\.webm$/i,
        /\.mov$/i,
        /cloudflarestream\.com/i,
        /files\.3c-public-library\.org.*\.(mp4|webm|mov)/i
    ];
    return videoPatterns.some(pattern => pattern.test(url));
}

/**
 * Play media in overlay
 */
function playMedia(element, type) {
    console.log('🎬 Playing media:', element);
    
    mediaPlayer.innerHTML = '';
    
    if (type === 'video') {
        const videoUrl = element.url || element.videoUrl || element.mediaUrl || element.iframeUrl;
        
        if (!videoUrl && !element.streamId) {
            console.error('❌ No video URL found');
            return;
        }
        
        // Cloudflare Stream
        if (element.type === 'cloudflare-stream' && element.streamId) {
            const streamElement = document.createElement('stream');
            streamElement.setAttribute('src', element.streamId);
            streamElement.setAttribute('controls', '');
            streamElement.setAttribute('autoplay', '');
            if (element.poster) {
                streamElement.setAttribute('poster', element.poster);
            }
            mediaPlayer.appendChild(streamElement);
        }
        // Cloudflare Stream iframe
        else if (videoUrl && (videoUrl.includes('/iframe') || videoUrl.includes('cloudflarestream.com'))) {
            const iframe = document.createElement('iframe');
            iframe.src = videoUrl;
            iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.style.width = '100%';
            iframe.style.height = '60vh';
            iframe.style.border = 'none';
            mediaPlayer.appendChild(iframe);
        }
        // YouTube/Vimeo
        else if (videoUrl) {
            const embedUrl = getVideoEmbedUrl(videoUrl);
            if (embedUrl) {
                const iframe = document.createElement('iframe');
                iframe.src = embedUrl;
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.style.width = '100%';
                iframe.style.height = '60vh';
                iframe.style.border = 'none';
                mediaPlayer.appendChild(iframe);
            } else {
                // Direct video file
                const video = document.createElement('video');
                video.src = videoUrl;
                video.controls = true;
                video.autoplay = true;
                video.style.width = '100%';
                video.style.maxHeight = '80vh';
                video.setAttribute('crossorigin', 'anonymous');
                if (element.thumbnailUrl || element.poster) {
                    video.poster = element.thumbnailUrl || element.poster;
                }
                mediaPlayer.appendChild(video);
            }
        }
    }
    
    mediaOverlay.classList.add('active');
}

/**
 * Get video embed URL
 */
function getVideoEmbedUrl(url) {
    // YouTube
    if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    }
    if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    }
    
    // Vimeo
    if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : null;
    }
    
    return null;
}

/**
 * Close media overlay
 */
function closeMedia() {
    mediaOverlay.classList.remove('active');
    mediaPlayer.innerHTML = '';
}

/**
 * Navigate to page
 */
async function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > totalPages) return;
    if (pageNum === currentPage) return;
    
    currentPage = pageNum;
    updatePageCounter();
    await renderPage(currentPage);
}

/**
 * Update page counter
 */
function updatePageCounter() {
    pageCounter.textContent = `${currentPage}/${totalPages}`;
    
    // Update button states
    document.getElementById('first-page').disabled = currentPage === 1;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('last-page').disabled = currentPage === totalPages;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Navigation buttons
    document.getElementById('first-page').addEventListener('click', () => goToPage(1));
    document.getElementById('prev-page').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('next-page').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('last-page').addEventListener('click', () => goToPage(totalPages));
    
    // Refresh button - reload JSON from source
    document.getElementById('refresh-btn').addEventListener('click', async () => {
        console.log('🔄 Refresh clicked - reloading JSON');
        loading.classList.remove('hidden');
        try {
            // Reload manifest from original source
            if (manifestUrl) {
                await loadManifestFromUrl(manifestUrl);
            } else if (contentId) {
                await loadContentFromSupabase(contentId);
            }
            // Re-initialize from manifest
            await initFromManifest();
        } catch (error) {
            console.error('❌ Error reloading JSON:', error);
            alert('Error reloading flipbook: ' + error.message);
        } finally {
            loading.classList.add('hidden');
        }
    });
    
    // Close button
    document.getElementById('close-btn').addEventListener('click', goBack);
    
    // Download button
    document.getElementById('download-btn').addEventListener('click', downloadPDF);
    
    // Close media
    closeMediaBtn.addEventListener('click', closeMedia);
    mediaOverlay.addEventListener('click', (e) => {
        if (e.target === mediaOverlay) {
            closeMedia();
        }
    });
    
    // Window resize
    window.addEventListener('resize', debounce(async () => {
        console.log('📐 Window resized, re-rendering page');
        await renderPage(currentPage);
    }, 300));
}

/**
 * Setup touch gestures
 */
function setupTouchGestures() {
    const hammer = new Hammer(pageContainer);
    
    // Swipe left/right for page navigation
    hammer.on('swipeleft', () => {
        console.log('👆 Swipe left');
        goToPage(currentPage + 1);
    });
    
    hammer.on('swiperight', () => {
        console.log('👆 Swipe right');
        goToPage(currentPage - 1);
    });
    
    console.log('✅ Touch gestures enabled');
}

/**
 * Download PDF - generate and download
 */
async function downloadPDF() {
    console.log('📥 Download PDF clicked - generating PDF');
    
    try {
        // Check if PDF URL exists in manifest
        if (manifest.pdfUrl) {
            console.log('📄 PDF URL found, downloading:', manifest.pdfUrl);
            const a = document.createElement('a');
            a.href = manifest.pdfUrl;
            a.download = manifest.title || 'flipbook.pdf';
            a.click();
            return;
        }
        
        // If no PDF URL, generate PDF from pages
        console.log('📄 No PDF URL, generating from pages...');
        loading.classList.remove('hidden');
        
        // Use jsPDF to generate PDF from page images
        if (typeof jspdf === 'undefined') {
            console.error('❌ jsPDF library not loaded');
            alert('PDF generation not available. Please contact support.');
            loading.classList.add('hidden');
            return;
        }
        
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [A4_WIDTH_PX, A4_HEIGHT_PX]
        });
        
        for (let i = 0; i < manifest.pages.length; i++) {
            const page = manifest.pages[i];
            
            // Get background source
            let backgroundSource = null;
            if (page.backgroundData) {
                backgroundSource = page.backgroundData;
            } else if (page.background) {
                backgroundSource = page.background;
            } else if (page.imageUrl) {
                backgroundSource = page.imageUrl;
            }
            
            if (backgroundSource) {
                if (i > 0) pdf.addPage();
                pdf.addImage(backgroundSource, 'PNG', 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
            }
        }
        
        pdf.save(manifest.title || 'flipbook.pdf');
        console.log('✅ PDF generated and downloaded');
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Go back - close window and return to landing page 2
 */
function goBack() {
    // Close the current window/tab
    window.close();
    
    // If window.close() doesn't work (some browsers block it), redirect to landing page 2
    setTimeout(() => {
        window.location.href = 'landing-page-2.html';
    }, 100);
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
