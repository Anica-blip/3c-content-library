/**
 * 3C Content Library - Flipbook Viewer
 * Enhanced version with 2x rendering quality and popup functions
 * Version: 2025-01-02 - Integrated from interactive-pdf
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global state
let currentPage = 1;
let totalPages = 0;
let scale = 0.46; // Default 46% zoom for optimal viewing (fits viewport without scrolling)
let manifest = null;
let pageCanvases = [];
let flipbookInitialized = false;
let contentId = null;
let contentData = null;

// A4 dimensions at 96 DPI (standard web DPI)
const A4_WIDTH_PX = 794;  // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

// Editor canvas dimensions (75% of A4 - this is what the editor uses)
const EDITOR_WIDTH_PX = 595;  // 794 * 0.75
const EDITOR_HEIGHT_PX = 842;  // 1123 * 0.75

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
        content: params.get('content'),
        manifest: params.get('manifest')
    };
}

/**
 * Initialize flipbook
 */
async function init() {
    try {
        const params = getUrlParams();
        contentId = params.content;
        const manifestUrl = params.manifest;

        // Priority 1: Load from manifest URL (Cloudflare R2)
        if (manifestUrl) {
            console.log('Loading from manifest URL (Cloudflare R2):', manifestUrl);
            await loadManifestFromUrl(manifestUrl);
        }
        // Priority 2: Load from content ID (Supabase)
        else if (contentId) {
            console.log('Loading from content ID (Supabase):', contentId);
            // Initialize Supabase
            if (!supabaseClient.isConnected) {
                await supabaseClient.init(CONFIG.supabase.url, CONFIG.supabase.anonKey);
            }
            // Load content from Supabase
            await loadContentFromSupabase(contentId);
        }
        else {
            alert('No flipbook data provided. Use ?manifest=URL or ?content=ID');
            loading.classList.add('hidden');
            goBack();
            return;
        }

        loading.classList.add('hidden');
    } catch (error) {
        console.error('Init error:', error);
        alert('Failed to load flipbook: ' + error.message);
        loading.classList.add('hidden');
        goBack();
    }
}

/**
 * Load manifest JSON from URL (for Cloudflare R2)
 */
async function loadManifestFromUrl(url) {
    try {
        console.log(' Fetching manifest from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const manifestData = await response.json();
        console.log(' Manifest loaded from URL:', manifestData.title || 'Untitled');
        console.log(' Pages:', manifestData.pages?.length || 0);
        
        await initFromManifest(manifestData);
    } catch (error) {
        console.error(' Failed to load manifest from URL:', error);
        throw new Error(`Failed to load flipbook manifest: ${error.message}`);
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
    
    // Sort pages by pageNumber to ensure correct order
    if (manifest.pages && manifest.pages.length > 0) {
        manifest.pages.sort((a, b) => {
            const pageA = a.pageNumber || 0;
            const pageB = b.pageNumber || 0;
            return pageA - pageB;
        });
        console.log(' Pages sorted by pageNumber:', manifest.pages.map(p => p.pageNumber || '?').join(', '));
    }
    
    totalPages = manifest.pages ? manifest.pages.length : 0;
    
    if (totalPages === 0) {
        throw new Error('No pages found in flipbook data');
    }
    
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    console.log('🎨 Rendering', totalPages, 'pages at', Math.round(scale * 100) + '% zoom');
    
    // Render all pages at current scale with 2x quality
    await renderPagesAtScale();
    
    // Initialize flipbook
    initFlipbook();
    
    // Setup event listeners
    setupEventListeners();
}

/**
 * Render all pages at the current scale with 2x resolution for quality
 */
async function renderPagesAtScale() {
    pageCanvases = [];
    
    // Calculate actual display dimensions at current zoom
    const pageWidth = Math.round(A4_WIDTH_PX * scale);
    const pageHeight = Math.round(A4_HEIGHT_PX * scale);
    
    console.log('   Page dimensions:', pageWidth, 'x', pageHeight, 'px');
    
    for (let i = 0; i < manifest.pages.length; i++) {
        const page = manifest.pages[i];
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = () => {
                // Render at 2x resolution for quality, then scale display with CSS
                const renderScale = 2;
                canvas.width = pageWidth * renderScale;
                canvas.height = pageHeight * renderScale;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Set CSS display size to actual zoom size
                canvas.style.width = pageWidth + 'px';
                canvas.style.height = pageHeight + 'px';
                
                resolve();
            };
            
            img.onerror = (error) => {
                console.warn(' Failed to load background for page', i + 1);
                const renderScale = 2;
                canvas.width = pageWidth * renderScale;
                canvas.height = pageHeight * renderScale;
                canvas.style.width = pageWidth + 'px';
                canvas.style.height = pageHeight + 'px';
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve();
            };
            
            // Get background source
            let backgroundSource = null;
            if (page.backgroundData) {
                backgroundSource = page.backgroundData;
            } else if (page.background && page.background.startsWith('data:')) {
                backgroundSource = page.background;
            } else if (page.background) {
                backgroundSource = page.background;
            }
            
            if (backgroundSource) {
                img.src = backgroundSource;
            } else {
                // Create blank canvas
                const renderScale = 2;
                canvas.width = pageWidth * renderScale;
                canvas.height = pageHeight * renderScale;
                canvas.style.width = pageWidth + 'px';
                canvas.style.height = pageHeight + 'px';
                
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resolve();
            }
        });
        
        pageCanvases.push(canvas);
    }
    
    console.log(' All pages rendered at', Math.round(scale * 100) + '% with 2x quality');
}

/**
 * Initialize turn.js flipbook
 */
function initFlipbook() {
    const flipbook = $('#flipbook');
    
    // Clear existing content
    flipbook.empty();
    
    // Get actual page dimensions from CSS-styled canvas
    const pageWidth = Math.round(A4_WIDTH_PX * scale);
    const pageHeight = Math.round(A4_HEIGHT_PX * scale);
    
    console.log('📖 Initializing flipbook with page size:', pageWidth, 'x', pageHeight);
    
    // Add pages to flipbook
    pageCanvases.forEach((canvas, index) => {
        const pageDiv = $('<div class="page"></div>');
        
        // Ensure canvas fills the page div
        $(canvas).css({
            'display': 'block',
            'width': '100%',
            'height': '100%'
        });
        
        pageDiv.append(canvas);
        
        // Add interactive elements overlay
        if (manifest && manifest.pages && manifest.pages[index]) {
            const pageData = manifest.pages[index];
            if (pageData.elements && pageData.elements.length > 0) {
                console.log(' Page', index + 1, '- Rendering', pageData.elements.length, 'elements');
                renderInteractiveElements(pageDiv, pageData.elements, pageWidth, pageHeight);
            }
        }
        
        // Add page number
        const pageNumber = $('<div class="page-number"></div>').text(index + 1);
        pageDiv.append(pageNumber);
        
        flipbook.append(pageDiv);
    });
    
    // Initialize turn.js with correct dimensions
    flipbook.turn({
        width: pageWidth * 2, // Double width for spread
        height: pageHeight,
        autoCenter: true,
        display: 'double',
        gradients: true,
        elevation: 50,
        acceleration: true,
        duration: 1000,
        pages: totalPages,
        when: {
            turning: function(event, page, view) {
                try {
                    currentPage = page;
                    updatePageInfo();
                } catch (error) {
                    console.error('Error during page turn:', error);
                    return true;
                }
            },
            turned: function(event, page, view) {
                currentPage = page;
                updatePageInfo();
            },
            start: function(event, pageObject, corner) {
                // Prevent turn if element is being clicked
                if ($(event.target).closest('.interactive-element').length > 0) {
                    event.preventDefault();
                    return false;
                }
            }
        }
    });
    
    flipbookInitialized = true;
    updatePageInfo();
    
    console.log(' Flipbook initialized at', Math.round(scale * 100) + '% zoom');
}

/**
 * Render interactive elements as overlays on page
 * Elements are positioned based on editor coordinates (595px x 842px canvas)
 */
function renderInteractiveElements(pageDiv, elements, pageWidth, pageHeight) {
    // Filter out only positioned elements (ignore element container metadata)
    const positionedElements = elements.filter(element => {
        return (element.x !== undefined && element.x !== null) && 
               (element.y !== undefined && element.y !== null) &&
               element.type !== 'container' &&
               element.type !== 'element-container';
    });
    
    if (positionedElements.length === 0) return;
    
    console.log(' Rendering', positionedElements.length, 'elements on page');
    
    positionedElements.forEach((element, idx) => {
        // Element positions are saved relative to editor canvas (595px x 842px)
        // We need to scale them to current viewer size (pageWidth x pageHeight)
        const scaleX = pageWidth / EDITOR_WIDTH_PX;
        const scaleY = pageHeight / EDITOR_HEIGHT_PX;
        
        if (idx === 0) {
            console.log('🔍 Element scaling:');
            console.log('   Editor canvas:', EDITOR_WIDTH_PX, 'x', EDITOR_HEIGHT_PX);
            console.log('   Viewer page:', pageWidth, 'x', pageHeight);
            console.log('   Scale factors:', scaleX.toFixed(3), 'x', scaleY.toFixed(3));
        }
        
        // Scale element position and size to match current page size
        const scaledX = element.x * scaleX;
        const scaledY = element.y * scaleY;
        const scaledWidth = (element.width || 100) * scaleX;
        const scaledHeight = (element.height || 40) * scaleY;
        
        const elementDiv = $('<div></div>').css({
            position: 'absolute',
            left: scaledX + 'px',
            top: scaledY + 'px',
            width: scaledWidth + 'px',
            height: scaledHeight + 'px',
            cursor: 'pointer',
            zIndex: 1000
        });
        
        // Handle different element types
        if (element.type === '3c-button' && element.imagePath) {
            // 3C Button with image
            const img = $('<img>').attr('src', element.imagePath).css({
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                cursor: 'pointer',
                transition: 'transform 0.2s'
            }).hover(
                function() { $(this).css('transform', 'scale(1.05)'); },
                function() { $(this).css('transform', 'scale(1)'); }
            );
            
            img.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                try {
                    console.log('🔘 3C Button clicked:', element);
                    if (element.url) {
                        console.log('📍 Button URL:', element.url);
                        if (isVideoUrl(element.url)) {
                            console.log('🎥 Detected as video URL, opening in popup...');
                            playMedia(element, 'video');
                        } else {
                            console.log('🔗 Opening link in new window...');
                            const popup = window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
                            if (!popup) {
                                console.error('❌ Popup blocked by browser');
                                alert('⚠️ Popup Blocked\n\nPlease allow popups for this site to open links.\n\nURL: ' + element.url);
                            } else {
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } else {
                        console.warn('⚠️ Button has no URL configured');
                        alert('⚠️ Button Error\n\nThis button has no URL configured.');
                    }
                } catch (error) {
                    console.error('❌ Error handling button click:', error);
                    alert('❌ Button Error\n\n' + error.message);
                }
            });
            
            elementDiv.append(img);
        } else if (element.type === 'button') {
            // Regular button
            const button = $('<button></button>')
                .text(element.text || 'Click')
                .css({
                    width: '100%',
                    height: '100%',
                    background: element.backgroundColor || '#667eea',
                    color: element.textColor || '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: Math.round((element.fontSize || 14) * scaleX) + 'px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s'
                })
                .hover(
                    function() { $(this).css('transform', 'scale(1.05)'); },
                    function() { $(this).css('transform', 'scale(1)'); }
                );
            
            button.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                try {
                    console.log('\n🔘 ========== BUTTON CLICKED ==========');
                    console.log('Element type:', element.type);
                    console.log('Element object:', JSON.stringify(element, null, 2));
                    console.log('Element.url:', element.url);
                    console.log('Element.videoUrl:', element.videoUrl);
                    console.log('Element.mediaUrl:', element.mediaUrl);
                    console.log('Element.iframeUrl:', element.iframeUrl);
                    console.log('Element.streamId:', element.streamId);
                    
                    if (element.url) {
                        console.log('📍 Button URL:', element.url);
                        const isVideo = isVideoUrl(element.url);
                        console.log('🔍 isVideoUrl() result:', isVideo);
                        
                        if (isVideo) {
                            console.log('🎥 Detected as video URL, opening in popup...');
                            playMedia(element, 'video');
                        } else {
                            console.log('🔗 Opening link in new window...');
                            const popup = window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
                            if (!popup) {
                                console.error('❌ Popup blocked by browser');
                                alert('⚠️ Popup Blocked\n\nPlease allow popups for this site.\n\nURL: ' + element.url);
                            } else {
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } else if (element.videoUrl || element.streamId) {
                        console.log('🎥 Opening video from videoUrl/streamId...');
                        playMedia(element, 'video');
                    } else {
                        console.warn('⚠️ Button has no URL or video configured');
                        console.log('Available element properties:', Object.keys(element));
                        alert('⚠️ Button Error\n\nThis button has no URL or video configured.\n\nElement type: ' + element.type);
                    }
                    console.log('========================================\n');
                } catch (error) {
                    console.error('❌ Error handling button click:', error);
                    console.error('Stack trace:', error.stack);
                    alert('❌ Button Error\n\n' + error.message);
                }
            });
            
            elementDiv.append(button);
        } else if (element.type === 'hotspot' || element.type === 'link') {
            // Invisible clickable area
            elementDiv.css({
                background: 'transparent',
                border: '2px dashed rgba(102, 126, 234, 0.3)'
            }).hover(
                function() { $(this).css('background', 'rgba(102, 126, 234, 0.1)'); },
                function() { $(this).css('background', 'transparent'); }
            );
            
            elementDiv.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                try {
                    console.log('🎯 Hotspot/Link clicked:', element);
                    if (element.url) {
                        console.log('📍 Hotspot URL:', element.url);
                        if (isVideoUrl(element.url)) {
                            console.log('🎥 Detected as video URL, opening in popup...');
                            playMedia(element, 'video');
                        } else {
                            console.log('🔗 Opening link in new window...');
                            const popup = window.open(element.url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no');
                            if (!popup) {
                                console.error('❌ Popup blocked by browser');
                                alert('⚠️ Popup Blocked\n\nPlease allow popups for this site.\n\nURL: ' + element.url);
                            } else {
                                console.log('✅ Link opened successfully');
                            }
                        }
                    } else {
                        console.warn('⚠️ Hotspot has no URL configured');
                        alert('⚠️ Hotspot Error\n\nThis hotspot has no URL configured.');
                    }
                } catch (error) {
                    console.error('❌ Error handling hotspot click:', error);
                    alert('❌ Hotspot Error\n\n' + error.message);
                }
            });
        } else if (element.type === 'video' || element.type === 'cloudflare-stream') {
            // Video with thumbnail or purple box
            const videoWrapper = $('<div></div>').css({
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '8px',
                cursor: 'pointer'
            });
            
            // Check if video has thumbnail
            if (element.thumbnail || element.thumbnailUrl) {
                // Video WITH thumbnail
                const thumbnailUrl = element.thumbnail || element.thumbnailUrl;
                videoWrapper.css({
                    backgroundImage: `url(${thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                });
                
                const playBtn = $('<div></div>').css({
                    width: Math.round(64 * scaleX) + 'px',
                    height: Math.round(64 * scaleX) + 'px',
                    background: 'rgba(139, 92, 246, 0.3)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    pointerEvents: 'none'
                }).html('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="margin-left: 3px;"><path d="M8 5v14l11-7z" fill="#a78bfa" stroke="#a78bfa" stroke-width="2" stroke-linejoin="round"/></svg>');
                
                videoWrapper.append(playBtn);
                
                // IIFE to capture element correctly for multiple videos
                (function(capturedElement) {
                    videoWrapper.on('click', function(e) {
                        e.stopPropagation();
                        console.log('\n🎬 ========== VIDEO ELEMENT CLICKED ==========');
                        console.log('Element type:', capturedElement.type);
                        console.log('Element object:', JSON.stringify(capturedElement, null, 2));
                        console.log('========================================\n');
                        playMedia(capturedElement, 'video');
                    });
                })(element);
                
            } else {
                // Video WITHOUT thumbnail - purple box with play icon
                videoWrapper.css({
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '2px solid rgba(102, 126, 234, 0.5)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                });
                
                const playIcon = $('<i class="fas fa-play-circle"></i>').css({
                    color: '#667eea',
                    fontSize: '48px',
                    pointerEvents: 'none'
                });
                
                videoWrapper.append(playIcon);
                
                // IIFE to capture element correctly for multiple videos
                (function(capturedElement) {
                    videoWrapper.on('click', function(e) {
                        e.stopPropagation();
                        console.log('\n🎬 ========== VIDEO ELEMENT CLICKED ==========');
                        console.log('Element type:', capturedElement.type);
                        console.log('Element object:', JSON.stringify(capturedElement, null, 2));
                        console.log('========================================\n');
                        playMedia(capturedElement, 'video');
                    });
                })(element);
            }
            
            elementDiv.append(videoWrapper);
        }
        
        pageDiv.append(elementDiv);
    });
}

/**
 * Detect if URL is a video platform link
 */
function isVideoUrl(url) {
    if (!url) return false;
    const videoPatterns = [
        /youtube\.com\/watch/i,
        /youtu\.be\//i,
        /vimeo\.com\//i,
        /\.mp4$/i,
        /\.webm$/i,
        /\.ogg$/i,
        /\.mov$/i,
        /cloudflarestream\.com/i,
        /cloudflare\.com.*\/stream/i,
        /r2\..*\.org.*\.(mp4|webm|mov)/i, // Cloudflare R2 video files
        /customer-.*\.cloudflarestream\.com/i // Cloudflare Stream customer domains
    ];
    return videoPatterns.some(pattern => pattern.test(url));
}

/**
 * Convert video URL to embed iframe URL
 */
function getVideoEmbedUrl(url) {
    // YouTube
    let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?]+)/);
    if (match) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    
    // Vimeo
    match = url.match(/vimeo\.com\/(\d+)/);
    if (match) {
        return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
    }
    
    return null;
}

/**
 * Play video/audio in overlay
 */
function playMedia(element, type) {
    try {
        console.log('\n🎬 ========== PLAYING MEDIA ==========');
        console.log('Element:', element);
        console.log('Type:', type);
        
        mediaTitle.textContent = element.text || element.title || (type === 'video' ? 'Video' : 'Audio');
        mediaPlayerWrapper.innerHTML = '';
        
        if (type === 'video') {
            const videoUrl = element.url || element.videoUrl || element.mediaUrl || element.iframeUrl;
            console.log('📍 Video URL:', videoUrl);
            console.log('📍 Stream ID:', element.streamId);
            console.log('📍 Element type:', element.type);
            
            if (!videoUrl && !element.streamId) {
                console.error('❌ No video URL found in element');
                console.error('Element details:', JSON.stringify(element, null, 2));
                alert('❌ Video Error\n\nNo video URL found.\n\nElement type: ' + element.type + '\n\nPlease check the element configuration in the editor.');
                return;
            }
            
            // Cloudflare Stream
            if (element.type === 'cloudflare-stream' && element.streamId) {
                console.log('🎥 Using Cloudflare Stream element with ID:', element.streamId);
                const streamElement = document.createElement('stream');
                streamElement.setAttribute('src', element.streamId);
                streamElement.setAttribute('controls', '');
                streamElement.setAttribute('autoplay', '');
                if (element.poster) {
                    streamElement.setAttribute('poster', element.poster);
                }
                streamElement.onerror = (e) => {
                    console.error('❌ Cloudflare Stream failed to load:', e);
                    alert('❌ Video Error\n\nCloudflare Stream failed to load.\n\nStream ID: ' + element.streamId);
                };
                mediaPlayerWrapper.appendChild(streamElement);
                console.log('✅ Cloudflare Stream element added to page');
            }
            // Cloudflare Stream iframe
            else if (videoUrl && (videoUrl.includes('/iframe') || videoUrl.includes('cloudflarestream.com'))) {
                console.log('🎥 Using Cloudflare Stream iframe:', videoUrl);
                const iframe = document.createElement('iframe');
                iframe.src = videoUrl;
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.style.maxWidth = '100%';
                iframe.style.maxHeight = '70vh';
                iframe.style.width = 'auto';
                iframe.style.height = 'auto';
                iframe.style.border = 'none';
                iframe.onerror = (e) => {
                    console.error('❌ Cloudflare Stream iframe failed to load:', e);
                    alert('❌ Video Error\n\nCloudflare Stream iframe failed to load.\n\nURL: ' + videoUrl);
                };
                mediaPlayerWrapper.appendChild(iframe);
                console.log('✅ Cloudflare Stream iframe added to page');
            }
            // YouTube/Vimeo
            else if (videoUrl) {
                const embedUrl = getVideoEmbedUrl(videoUrl);
                if (embedUrl) {
                    console.log('🎥 Using YouTube/Vimeo embed:', embedUrl);
                    const iframe = document.createElement('iframe');
                    iframe.src = embedUrl;
                    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = true;
                    iframe.style.maxWidth = '100%';
                    iframe.style.maxHeight = '70vh';
                    iframe.style.width = 'auto';
                    iframe.style.height = 'auto';
                    iframe.style.border = 'none';
                    iframe.onerror = (e) => {
                        console.error('❌ YouTube/Vimeo iframe failed to load:', e);
                        alert('❌ Video Error\n\nYouTube/Vimeo iframe failed to load.\n\nURL: ' + embedUrl);
                    };
                    mediaPlayerWrapper.appendChild(iframe);
                    console.log('✅ YouTube/Vimeo iframe added to page');
                } else {
                    // Direct video file (including Cloudflare R2 URLs)
                    console.log('🎥 Using direct video file:', videoUrl);
                    const video = document.createElement('video');
                    video.src = videoUrl;
                    video.controls = true;
                    video.autoplay = true;
                    video.style.maxWidth = '100%';
                    video.style.maxHeight = '70vh';
                    video.style.width = 'auto';
                    video.style.height = 'auto';
                    video.style.objectFit = 'contain';
                    video.setAttribute('crossorigin', 'anonymous'); // Enable CORS for Cloudflare R2
                    if (element.thumbnailUrl || element.poster) {
                        video.poster = element.thumbnailUrl || element.poster;
                        console.log('📸 Using poster:', element.thumbnailUrl || element.poster);
                    }
                    
                    // Detect video orientation and adjust container
                    video.onloadedmetadata = () => {
                        const videoWidth = video.videoWidth;
                        const videoHeight = video.videoHeight;
                        const aspectRatio = videoWidth / videoHeight;
                        
                        console.log('📐 Video dimensions:', videoWidth, 'x', videoHeight);
                        console.log('📐 Aspect ratio:', aspectRatio.toFixed(2));
                        
                        const mediaContainer = document.getElementById('media-container');
                        
                        if (aspectRatio > 1) {
                            // Landscape video (16:9 or wider)
                            console.log('🖼️ Landscape orientation detected (16:9)');
                            video.style.width = '80vw';
                            video.style.maxWidth = '1200px';
                            video.style.height = 'auto';
                            mediaContainer.style.maxWidth = '85vw';
                        } else {
                            // Portrait video (9:16 or taller)
                            console.log('📱 Portrait orientation detected (9:16)');
                            video.style.width = 'auto';
                            video.style.height = '75vh';
                            video.style.maxWidth = '500px';
                            mediaContainer.style.maxWidth = '600px';
                        }
                    };
                    
                    video.onerror = (e) => {
                        console.error('❌ Video failed to load:', videoUrl);
                        console.error('Error details:', e);
                        const errorMsg = '❌ Video Error\n\nFailed to load video file.\n\nURL: ' + videoUrl + '\n\nPossible causes:\n• File not found (404)\n• CORS not enabled on server\n• Invalid video format\n• Network error';
                        mediaPlayerWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 40px; background: rgba(231, 76, 60, 0.2); border-radius: 8px; margin: 20px;">' + errorMsg.replace(/\n/g, '<br>') + '</div>';
                        alert(errorMsg);
                    };
                    video.onloadstart = () => {
                        console.log('⏳ Video loading started:', videoUrl);
                    };
                    video.oncanplay = () => {
                        console.log('✅ Video ready to play:', videoUrl);
                    };
                    mediaPlayerWrapper.appendChild(video);
                    console.log('✅ Direct video element added to page');
                }
            }
        } else if (type === 'audio') {
            const audioUrl = element.url || element.mediaUrl;
            console.log('🎵 Loading audio:', audioUrl);
            const audio = document.createElement('audio');
            audio.src = audioUrl;
            audio.controls = true;
            audio.autoplay = true;
            audio.style.width = '100%';
            audio.onerror = (e) => {
                console.error('❌ Audio failed to load:', audioUrl, e);
                const errorMsg = '❌ Audio Error\n\nFailed to load audio file.\n\nURL: ' + audioUrl;
                mediaPlayerWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 40px; background: rgba(231, 76, 60, 0.2); border-radius: 8px; margin: 20px;">' + errorMsg.replace(/\n/g, '<br>') + '</div>';
                alert(errorMsg);
            };
            audio.oncanplay = () => {
                console.log('✅ Audio ready to play:', audioUrl);
            };
            mediaPlayerWrapper.appendChild(audio);
            console.log('✅ Audio element added to page');
        }
        
        mediaOverlay.classList.add('active');
        console.log('✅ Media overlay opened');
        console.log('========================================\n');
    } catch (error) {
        console.error('❌ CRITICAL ERROR playing media:', error);
        console.error('Stack trace:', error.stack);
        alert('❌ Critical Error\n\nFailed to play media.\n\nError: ' + error.message + '\n\nCheck browser console for details.');
    }
}


/**
 * Close media overlay
 */
function closeMedia() {
    // Stop and release all media
    mediaPlayerWrapper.querySelectorAll('video, audio').forEach(media => {
        media.pause();
        media.currentTime = 0;
        media.src = '';
        media.load();
    });
    
    // Clear iframes
    mediaPlayerWrapper.querySelectorAll('iframe').forEach(iframe => {
        iframe.src = 'about:blank';
        iframe.remove();
    });
    
    // Remove Cloudflare Stream elements
    mediaPlayerWrapper.querySelectorAll('stream').forEach(stream => {
        stream.remove();
    });
    
    // Clear all content immediately
    mediaPlayerWrapper.innerHTML = '';
    mediaTitle.textContent = '';
    mediaOverlay.classList.remove('active');
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
    
    // Zoom controls - properly re-render at new scale
    $('#zoom-in').on('click', () => {
        console.log('🔍 Zoom in clicked');
        scale += 0.05; // Increase by 5%
        scale = Math.round(scale * 100) / 100;
        if (scale > 1.5) scale = 1.5; // Max 150%
        reloadFlipbook();
    });
    
    $('#zoom-out').on('click', () => {
        console.log('🔍 Zoom out clicked');
        scale -= 0.05; // Decrease by 5%
        scale = Math.round(scale * 100) / 100;
        if (scale < 0.3) scale = 0.3; // Min 30%
        reloadFlipbook();
    });
    
    // Back button
    $('#back-btn').on('click', goBack);
    
    // Download button
    $('#download-btn').on('click', downloadFlipbook);
    
    // Navigation arrows
    $('#nav-arrow-left').on('click', () => {
        $('#flipbook').turn('previous');
    });
    
    $('#nav-arrow-right').on('click', () => {
        $('#flipbook').turn('next');
    });
    
    // Close media
    closeMediaBtn.addEventListener('click', closeMedia);
    mediaOverlay.addEventListener('click', (e) => {
        if (e.target === mediaOverlay) {
            closeMedia();
        }
    });
    
    // Keyboard shortcuts
    $(document).on('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMedia();
        } else if (!mediaOverlay.classList.contains('active')) {
            // Only allow navigation when media is not playing
            if (e.key === 'ArrowLeft') {
                $('#flipbook').turn('previous');
            } else if (e.key === 'ArrowRight') {
                $('#flipbook').turn('next');
            } else if (e.key === 'Home') {
                $('#flipbook').turn('page', 1);
            } else if (e.key === 'End') {
                $('#flipbook').turn('page', totalPages);
            }
        }
    });
}

/**
 * Reload flipbook after zoom change
 */
async function reloadFlipbook() {
    loading.classList.remove('hidden');
    console.log('🔄 Reloading flipbook at', Math.round(scale * 100) + '% zoom');
    
    // Update zoom display
    document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
    
    try {
        // Store current page before destroying
        const savedPage = currentPage;
        
        // Destroy existing flipbook
        if (flipbookInitialized) {
            $('#flipbook').turn('destroy');
            flipbookInitialized = false;
        }
        
        // Re-render pages at new scale
        await renderPagesAtScale();
        initFlipbook();
        
        // Restore page position after reload
        if (savedPage > 1) {
            setTimeout(() => {
                $('#flipbook').turn('page', savedPage);
            }, 100);
        }
        
        // Resize container to fit new dimensions
        const pageWidth = Math.round(A4_WIDTH_PX * scale);
        const pageHeight = Math.round(A4_HEIGHT_PX * scale);
        $('#flipbook').css({
            width: (pageWidth * 2) + 'px',
            height: pageHeight + 'px'
        });
        
        console.log(' Flipbook reloaded at', Math.round(scale * 100) + '%');
    } catch (error) {
        console.error(' Error reloading flipbook:', error);
    } finally {
        loading.classList.add('hidden');
    }
}

/**
 * Update page info display
 */
function updatePageInfo() {
    $('#current-page').text(currentPage);
    
    // Update button states
    $('#first-page, #prev-page').prop('disabled', currentPage === 1);
    $('#next-page, #last-page').prop('disabled', currentPage === totalPages);
    
    // Update navigation arrows visibility
    const leftArrow = document.getElementById('nav-arrow-left');
    const rightArrow = document.getElementById('nav-arrow-right');
    
    if (leftArrow) {
        if (currentPage === 1) {
            leftArrow.classList.add('hidden');
        } else {
            leftArrow.classList.remove('hidden');
        }
    }
    
    if (rightArrow) {
        if (currentPage === totalPages) {
            rightArrow.classList.add('hidden');
        } else {
            rightArrow.classList.remove('hidden');
        }
    }
}

/**
 * Download flipbook as PDF
 */
async function downloadFlipbook() {
    try {
        console.log('📥 Download button clicked');
        
        if (!manifest || !manifest.pages || manifest.pages.length === 0) {
            alert('⚠️ No flipbook data available to download');
            return;
        }
        
        // Show loading indicator
        loading.classList.remove('hidden');
        
        // Create a new jsPDF instance
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [A4_WIDTH_PX, A4_HEIGHT_PX]
        });
        
        console.log('📄 Creating PDF with', manifest.pages.length, 'pages');
        
        // Add each page to the PDF
        for (let i = 0; i < manifest.pages.length; i++) {
            const page = manifest.pages[i];
            
            if (i > 0) {
                pdf.addPage();
            }
            
            // Get background image
            if (page.background || page.backgroundData) {
                const imgData = page.backgroundData || page.background;
                try {
                    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);
                } catch (error) {
                    console.warn('⚠️ Could not add image for page', i + 1, error);
                }
            }
            
            console.log('✅ Added page', i + 1, 'to PDF');
        }
        
        // Generate filename
        const filename = (manifest.title || 'flipbook').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        
        // Save the PDF
        pdf.save(filename);
        
        loading.classList.add('hidden');
        console.log('✅ PDF download complete:', filename);
        
    } catch (error) {
        console.error('❌ Error downloading flipbook:', error);
        loading.classList.add('hidden');
        alert('❌ Download Error\n\nFailed to download flipbook.\n\nError: ' + error.message);
    }
}

/**
 * Go back to library (returns to where user came from)
 */
function goBack() {
    // Use document.referrer to go back to the previous page (Landing Page 2)
    if (document.referrer && document.referrer.includes('library.html')) {
        window.location.href = document.referrer;
    } else {
        // Fallback: construct Landing Page 2 URL
        const params = getUrlParams();
        if (params.content) {
            // Try to get folder from URL params or contentData
            const folderParam = new URLSearchParams(window.location.search).get('folder');
            if (folderParam) {
                window.location.href = `library.html?folder=${folderParam}&content=${params.content}`;
            } else {
                window.location.href = `library.html?content=${params.content}`;
            }
        } else {
            window.location.href = 'library.html';
        }
    }
}

// Initialize on load
$(document).ready(() => {
    init();
});
