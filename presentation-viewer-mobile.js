/**
 * 3C Mobile Presentation Viewer
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

// Tracks active link popup — used to cancel timer if user closes modal before it fires
let linkPopupState = null;

// A4 dimensions at 96 DPI
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// Current page dimensions (default to landscape for presentations)
let currentPageWidth = A4_HEIGHT_PX;  // Start with landscape width
let currentPageHeight = A4_WIDTH_PX;  // Start with landscape height
let isLandscape = true;  // Default to landscape

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
 * Initialize the mobile presentation viewer
 */
async function init() {
    console.log('🚀 Initializing 3C Mobile Presentation Viewer');
    
    // Get URL parameters
    const params = getUrlParams();
    contentId = params.content;
    manifestUrl = params.manifest;
    
    console.log('📍 Content ID:', contentId);
    console.log('📍 Manifest URL:', manifestUrl);
    
    if (!contentId && !manifestUrl) {
        console.error('❌ No content ID or manifest URL provided');
        alert('Error: No presentation content specified');
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
        console.error('❌ Error initializing presentation:', error);
        alert('Error loading presentation: ' + error.message);
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
        
        // Check if it's a presentation (has project_json)
        if (!data.project_json) {
            console.log('⚠️ Not a presentation, redirecting to library');
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
    console.log('✅ Mobile presentation initialized');
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
        
        // Calculate scale to fit container while maintaining aspect ratio (landscape)
        const scaleX = (containerWidth - 40) / A4_HEIGHT_PX; // 40px padding - use landscape width
        const scaleY = (containerHeight - 40) / A4_WIDTH_PX; // use landscape height
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
        
        const displayWidth = Math.round(A4_HEIGHT_PX * scale); // landscape width
        const displayHeight = Math.round(A4_WIDTH_PX * scale); // landscape height
        
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
        
        // Quietly warm the browser cache for the pages either side of this
        // one, so the next tap turns the page instantly instead of showing
        // the loading spinner while the image downloads.
        preloadNeighbourPages(pageNum);
        
    } catch (error) {
        console.error('❌ Error rendering page:', error);
        alert('Error rendering page: ' + error.message);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Preload the previous and next pages' background images into the
 * browser cache (fire and forget — never blocks, never errors out loud).
 * crossOrigin must match renderPage's usage exactly, otherwise the
 * cached copy would be rejected on CORS grounds and re-downloaded.
 */
function preloadNeighbourPages(pageNum) {
    [pageNum - 1, pageNum + 1].forEach(n => {
        if (n < 1 || n > totalPages) return;
        const pageData = manifest.pages[n - 1];
        if (!pageData) return;
        const src = pageData.backgroundData || pageData.background || pageData.imageUrl || null;
        // Only preload real URLs — data: URIs are already in memory
        if (!src || src.startsWith('data:')) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
    });
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
    // Editor canvas dimensions depend on page orientation:
    // - Landscape: 842px x 595px (1123*0.75 x 794*0.75)
    // - Portrait: 595px x 842px (794*0.75 x 1123*0.75)
    const pageIsLandscape = pageWidth > pageHeight;
    const editorWidth = pageIsLandscape ? 842 : EDITOR_WIDTH_PX;
    const editorHeight = pageIsLandscape ? 595 : EDITOR_HEIGHT_PX;
    
    const scaleX = pageWidth / editorWidth;
    const scaleY = pageHeight / editorHeight;
    
    console.log('📱 Mobile element scaling:', {
        orientation: pageIsLandscape ? 'LANDSCAPE' : 'PORTRAIT',
        editorCanvas: `${editorWidth}x${editorHeight}`,
        viewerPage: `${pageWidth}x${pageHeight}`,
        scale: `${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`
    });
    
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
                let imgSrc = element.imagePath || element.image;
                // Convert relative paths to full GitHub Pages URL
                // Supports: public/3C Buttons, public/3C Buttons/Emojis, public/3C Buttons/Emojis/General
                if (imgSrc && !imgSrc.startsWith('http')) {
                    imgSrc = 'https://anica-blip.github.io/interactive-PDF/public' + (imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc);
                }
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
            console.log('📱 EMOJI ELEMENT DETECTED:', element);
            console.log('📱 Element position:', {x: scaledX, y: scaledY, w: scaledWidth, h: scaledHeight});
            console.log('📱 Has imagePath?', !!element.imagePath, 'Has image?', !!element.image);
            
            if (element.imagePath || element.image) {
                let imgSrc = element.imagePath || element.image;
                console.log('📱 Original image path:', imgSrc);
                
                // Convert relative paths to full GitHub Pages URL
                // Supports: public/3C Buttons/Emojis, public/3C Buttons/Emojis/General
                if (imgSrc && !imgSrc.startsWith('http')) {
                    imgSrc = 'https://anica-blip.github.io/interactive-PDF/public' + (imgSrc.startsWith('/') ? imgSrc : '/' + imgSrc);
                }
                console.log('📱 Final emoji URL:', imgSrc);
                
                const img = document.createElement('img');
                img.src = imgSrc;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '50%';
                img.style.display = 'block';
                img.onerror = (e) => {
                    console.error('❌ FAILED to load emoji image:', imgSrc);
                    console.error('Error event:', e);
                };
                img.onload = () => {
                    console.log('✅ EMOJI IMAGE LOADED:', imgSrc);
                    console.log('Image natural size:', img.naturalWidth, 'x', img.naturalHeight);
                };
                elementDiv.appendChild(img);
                console.log('📱 Emoji img appended to elementDiv');
            } else {
                console.warn('⚠️ Emoji has NO imagePath or image property:', element);
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
            // Parse element data from dataset to ensure we get the correct stored data
            const elementData = JSON.parse(e.currentTarget.dataset.elementData);
            handleElementClick(elementData);
        });
        
        pageDiv.appendChild(elementDiv);
        
        // Debug: Verify element was added to DOM
        if (element.type === '3c-emoji' || element.type === '3c-emoji-decoration') {
            console.log('📱 Emoji elementDiv appended to pageDiv');
            console.log('📱 ElementDiv in DOM?', document.contains(elementDiv));
            console.log('📱 ElementDiv computed style:', window.getComputedStyle(elementDiv).display);
        }
    });
    
    console.log('📱 Total elements rendered:', positionedElements.length);
}

/**
 * Handle interactive element click
 */
function handleElementClick(element) {
    console.log('🖱️ Element clicked:', element.type);
    
    const elementType = element.type;
    
    if (elementType === '3c-button' || elementType === 'button') {
        // 3C Buttons ONLY handle website links
        if (element.url) {
            let buttonUrl = element.url;
            if (!buttonUrl.startsWith('http://') && !buttonUrl.startsWith('https://')) {
                buttonUrl = 'https://' + buttonUrl;
            }
            console.log('� 3C Button: Opening website link...');
            showLinkPopup(buttonUrl);
        }
    } else if (elementType === 'video' || elementType === 'cloudflare-stream') {
        console.log('🎬 Opening video element...');
        playMedia(element, 'video');
    } else if (elementType === '3c-emoji' || elementType === '3c-emoji-decoration') {
        // Emojis/General handle ALL media types: videos, images, audio, GIFs, etc.
        if (element.url) {
            let emojiUrl = element.url;
            if (!emojiUrl.startsWith('http://') && !emojiUrl.startsWith('https://')) {
                emojiUrl = 'https://' + emojiUrl;
            }
            
            if (isVideoUrl(emojiUrl)) {
                console.log('🎥 Emoji/General: Opening video...');
                playMedia({...element, url: emojiUrl}, 'video');
            } else if (isAudioUrl(emojiUrl)) {
                console.log('🎵 Emoji/General: Opening audio...');
                playMedia({...element, url: emojiUrl}, 'audio');
            } else if (isImageUrl(emojiUrl)) {
                console.log('🖼️ Emoji/General: Opening image from Cloudflare...');
                showAnimatedMedia(emojiUrl);
            } else if (isPresentationUrl(emojiUrl)) {
                console.log('📊 Emoji/General: Opening presentation viewer...');
                window.location.href = emojiUrl;
            } else {
                console.log('🔗 Emoji/General: Opening link in popup...');
                showLinkPopup(emojiUrl);
            }
        }
    } else if (elementType === 'audio') {
        console.log('🎵 Opening audio element...');
        playMedia(element, 'audio');
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
 * Check if URL is an image (including GIFs, PNGs, JPGs, etc.)
 */
function isImageUrl(url) {
    if (!url) return false;
    const imagePatterns = [
        /\.gif$/i,
        /\.png$/i,
        /\.jpg$/i,
        /\.jpeg$/i,
        /\.webp$/i,
        /\.svg$/i,
        /\.bmp$/i,
        /giphy\.com/i,
        /tenor\.com/i,
        /files\.3c-public-library\.org.*\.(gif|png|jpg|jpeg|webp)/i
    ];
    return imagePatterns.some(pattern => pattern.test(url));
}

/**
 * Check if URL is an audio file
 */
function isAudioUrl(url) {
    if (!url) return false;
    const audioPatterns = [
        /\.mp3$/i,
        /\.wav$/i,
        /\.ogg$/i,
        /\.m4a$/i,
        /\.aac$/i,
        /\.flac$/i,
        /files\.3c-public-library\.org.*\.(mp3|wav|ogg|m4a|aac|flac)/i
    ];
    return audioPatterns.some(pattern => pattern.test(url));
}

/**
 * Check if URL is animated media (GIF, etc.) - DEPRECATED, use isImageUrl instead
 */
function isAnimatedMediaUrl(url) {
    return isImageUrl(url);
}

/**
 * Check if URL is a presentation viewer link
 */
function isPresentationUrl(url) {
    if (!url) return false;
    return url.includes('presentation-viewer.html') || url.includes('interactive-pdf-viewer.html');
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
 * Show link in popup iframe — modal is chief.
 *
 * Telegram WebView: iframe embedding is blocked by most sites.
 * Fix: detect Telegram WebView and navigate directly via location.href —
 * Telegram handles it like a normal page, user presses back to return.
 *
 * WhatsApp / regular browsers: iframe loads inside modal as normal.
 * Closing the modal (✕) cancels all timers — no ghost tabs ever.
 */
function showLinkPopup(url) {
    console.log('🔗 Opening link in popup:', url);

    // ── Telegram WebView detection ──
    // TelegramWebviewProxy exists in Telegram's built-in browser (not Mini App)
    // UA check as belt-and-suspenders fallback
    const isTelegramWebView = (typeof window.TelegramWebviewProxy !== 'undefined') ||
                               /Telegram/i.test(navigator.userAgent);

    if (isTelegramWebView) {
        // Telegram WebView — navigate directly, no iframe needed
        // User presses back in Telegram to return to the library
        console.log('📱 Telegram WebView detected — navigating directly');
        location.href = url;
        return;
    }

    // ── All other browsers (WhatsApp, Safari, Chrome, etc.) ──
    // Use iframe inside modal — modal is chief

    // Cancel any leftover state from a previous popup
    if (linkPopupState) {
        clearTimeout(linkPopupState.timer);
        linkPopupState.cancelled = true;
        linkPopupState = null;
    }

    // State object shared between iframe callbacks and closeMedia
    const state = { timer: null, cancelled: false, iframeLoaded: false };
    linkPopupState = state;

    mediaPlayer.innerHTML = '';

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%; display:flex; flex-direction:column; gap:10px;';

    // ── Option 1: iframe ──
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%; height:70vh; border:none; border-radius:8px; background:#111;';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals';

    // ── Option 2: blocked message (hidden until needed) ──
    const blockedMsg = document.createElement('div');
    blockedMsg.style.cssText = `
        display: none;
        background: rgba(155, 89, 182, 0.1);
        border: 1px solid rgba(155, 89, 182, 0.3);
        border-radius: 12px;
        padding: 28px 20px;
        text-align: center;
        color: #d0c8e8;
        font-size: 14px;
        line-height: 1.6;
    `;
    blockedMsg.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 12px;">🌐</div>
        <div style="font-weight: 700; color: #c084fc; font-size: 16px; margin-bottom: 10px;">
            This link opens in your browser
        </div>
        <div style="margin-bottom: 20px; font-size: 13px; color: #b0a0c8;">
            This link needs to open as a new browser page.
            Tap the button below to continue — it will open safely in your browser.
        </div>
        <button style="
            background: linear-gradient(135deg, #9b59b6, #8e44ad);
            color: white; border: none; padding: 14px 24px;
            border-radius: 10px; font-size: 14px; font-weight: 700;
            cursor: pointer; width: 100%; letter-spacing: 0.3px;
            box-shadow: 0 2px 10px rgba(155,89,182,0.4);
        " id="_3c-open-external-btn">Tap to open link →</button>
    `;

    // Wire the open button — for non-Telegram browsers only
    blockedMsg.querySelector('#_3c-open-external-btn').onclick = () => {
        // Open URL first, then close overlay
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
        setTimeout(() => {
            mediaOverlay.classList.remove('active');
            mediaPlayer.innerHTML = '';
        }, 50);
    };

    // Helper: swap iframe for blocked message inside the modal
    function showBlockedMessage() {
        if (state.cancelled) return;
        clearTimeout(state.timer);
        console.log('🔒 Iframe blocked — showing message inside modal');
        iframe.style.display = 'none';
        blockedMsg.style.display = 'block';
    }

    // Detect blocked iframe on load
    iframe.onload = () => {
        if (state.cancelled) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc || doc.body === null || doc.body.innerHTML === '') {
                throw new Error('Empty or inaccessible');
            }
            state.iframeLoaded = true;
            clearTimeout(state.timer);
            console.log('✅ Iframe loaded successfully');
        } catch (e) {
            showBlockedMessage();
        }
    };

    // Belt-and-suspenders timeout
    state.timer = setTimeout(() => {
        if (state.cancelled || state.iframeLoaded) return;
        try {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc || doc.body === null || doc.body.innerHTML === '') {
                console.log('⏱️ Iframe timeout — showing blocked message in modal');
                showBlockedMessage();
            }
        } catch (e) {
            console.log('⏱️ Iframe blocked (timeout) — showing blocked message in modal');
            showBlockedMessage();
        }
    }, 2500);

    wrapper.appendChild(iframe);
    wrapper.appendChild(blockedMsg);
    mediaPlayer.appendChild(wrapper);
    mediaOverlay.classList.add('active');
}

/**
 * Show animated media (GIF) in overlay
 */
function showAnimatedMedia(url) {
    console.log('🎬 Opening animated media:', url);
    
    mediaPlayer.innerHTML = '';
    
    const img = document.createElement('img');
    img.src = url;
    img.style.cssText = 'display: block; margin: 0 auto; border-radius: 8px; object-fit: contain;';
    
    // Mobile-responsive sizing - handle both orientations
    img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        console.log('📐 Image loaded:', img.naturalWidth, 'x', img.naturalHeight, 'aspect:', aspectRatio.toFixed(2));
        console.log('📱 Viewport:', viewportWidth, 'x', viewportHeight);
        
        if (aspectRatio > 1) {
            // Landscape image - fit to width with max constraints
            img.style.cssText = `
                display: block !important;
                margin: 0 auto !important;
                border-radius: 8px !important;
                object-fit: contain !important;
                width: 95vw !important;
                height: auto !important;
                max-width: 95vw !important;
                max-height: 85vh !important;
            `;
            console.log('🖼️ Landscape mode: width=95vw, height=auto');
        } else {
            // Portrait image - fit to height (reduced to 80vh so close button is reachable)
            img.style.cssText = `
                display: block !important;
                margin: 0 auto !important;
                border-radius: 8px !important;
                object-fit: contain !important;
                width: auto !important;
                height: 80vh !important;
                max-width: 95vw !important;
                max-height: 80vh !important;
            `;
            console.log('🖼️ Portrait mode: width=auto, height=80vh');
        }
    };
    
    img.onerror = () => {
        console.error('❌ Failed to load image:', url);
    };
    
    mediaPlayer.appendChild(img);
    mediaOverlay.classList.add('active');
}

/**
 * Close media overlay.
 * Cancels any active link popup timer so nothing fires after ✕ is pressed.
 */
function closeMedia() {
    // Kill any pending link popup timer/callbacks immediately
    if (linkPopupState) {
        clearTimeout(linkPopupState.timer);
        linkPopupState.cancelled = true;
        linkPopupState = null;
    }
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
            alert('Error reloading presentation: ' + error.message);
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

/**
 * Download PDF - generate and download
 */
async function downloadPDF() {
    console.log('📥 Download PDF clicked');

    try {
        loading.classList.remove('hidden');

        if (manifest.pdfUrl) {
            console.log('📄 PDF URL found, fetching as blob:', manifest.pdfUrl);
            try {
                const response = await fetch(manifest.pdfUrl);
                if (!response.ok) throw new Error('Fetch failed: ' + response.status);
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = (manifest.title || 'presentation') + '.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
                console.log('✅ PDF downloaded via blob');
                return;
            } catch (fetchErr) {
                // Fetch failed (CORS or network) — fall back to direct link in new tab
                console.warn('⚠️ Blob fetch failed, opening direct URL:', fetchErr.message);
                window.open(manifest.pdfUrl, '_blank');
                return;
            }
        }

        // No pdfUrl — generate PDF from rendered page canvases
        console.log('📄 No PDF URL, generating from page canvases...');

        if (typeof jspdf === 'undefined') {
            console.error('❌ jsPDF library not loaded');
            alert('PDF generation not available. Please contact support.');
            return;
        }

        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [A4_WIDTH_PX, A4_HEIGHT_PX] });

        // Use the already-rendered canvases in the DOM — no re-fetch needed
        const pageCanvases = document.querySelectorAll('#page-wrapper .page canvas');

        if (pageCanvases.length === 0) {
            alert('No pages found to download. Please make sure the presentation has loaded.');
            return;
        }

        for (let i = 0; i < pageCanvases.length; i++) {
            if (i > 0) pdf.addPage();
            const imgData = pageCanvases[i].toDataURL('image/jpeg', 0.92);
            pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
        }

        pdf.save((manifest.title || 'presentation') + '.pdf');
        console.log('✅ PDF generated and downloaded');

    } catch (error) {
        console.error('❌ Error downloading PDF:', error);
        alert('Error downloading PDF: ' + error.message);
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
function setupTouchGestures() {
    const hammer = new Hammer(pageContainer, {
        touchAction: 'none'
    });
    
    hammer.get('pinch').set({ enable: true });
    hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
    hammer.get('swipe').set({ velocity: 0.3, threshold: 50 });
    
    let scale = 1;
    let lastScale = 1;
    let posX = 0;
    let posY = 0;
    let lastPosX = 0;
    let lastPosY = 0;
    
    function updateTransform() {
        const page = pageWrapper.querySelector('.page');
        if (page) {
            page.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
            page.style.transformOrigin = 'center';
        }
    }
    
    hammer.on('swipeleft', (e) => {
        if (scale <= 1.1) {
            e.preventDefault();
            e.srcEvent.preventDefault();
            e.srcEvent.stopPropagation();
            if (currentPage < totalPages) goToPage(currentPage + 1);
        }
    });
    
    hammer.on('swiperight', (e) => {
        if (scale <= 1.1) {
            e.preventDefault();
            e.srcEvent.preventDefault();
            e.srcEvent.stopPropagation();
            if (currentPage > 1) goToPage(currentPage - 1);
        }
    });
    
    hammer.on('panstart', () => {
        lastPosX = posX;
        lastPosY = posY;
    });
    
    hammer.on('panmove', (e) => {
        if (scale > 1) {
            posX = lastPosX + e.deltaX;
            posY = lastPosY + e.deltaY;
            updateTransform();
        }
    });
    
    hammer.on('pinchstart', () => {
        lastScale = scale;
    });
    
    hammer.on('pinchmove', (e) => {
        scale = Math.max(1, Math.min(lastScale * e.scale, 3));
        if (scale === 1) {
            posX = 0;
            posY = 0;
        }
        updateTransform();
    });
    
    hammer.on('pinchend', () => {
        lastScale = scale;
    });
    
    console.log('✅ Touch gestures enabled with pan and zoom');
}
