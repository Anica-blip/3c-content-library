/**
 * Enhanced PDF Viewer with Link Detection
 * Designed & built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success Cooking Lab
 */

// ==================== WATERMARK ====================
// Injects the Claude × Chef Anica watermark above the PDF modal toolbar
(function injectWatermark() {
    const inject = () => {
        if (document.getElementById('claudeWatermark')) return; // already present
        const bar = document.createElement('div');
        bar.id = 'claudeWatermark';
        bar.style.cssText = 'background:rgba(10,14,39,0.9);border-bottom:1px solid rgba(155,89,182,0.15);padding:4px 16px;text-align:right;font-size:10px;color:rgba(155,89,182,0.6);letter-spacing:0.3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;';
        bar.innerHTML = 'Designed &amp; built with ❤️ by <a href="https://www.anthropic.com" target="_blank" rel="noopener" style="color:rgba(192,132,252,0.7);text-decoration:none;">Claude</a> (Anthropic) × Chef Anica · <span style="opacity:0.7;">3C Thread To Success Cooking Lab 🧪👨‍🍳</span>';
        document.body.insertBefore(bar, document.body.firstChild);
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();

// ==================== PDF.js CONFIGURATION ====================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ==================== PDF VIEWER STATE ====================
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let currentPdfContentId = null;
let currentPdfUrl = null;
let currentPdfTitle = null;

// ==================== OPEN PDF VIEWER ====================
async function openPdfViewer(content) {
    const modal = document.getElementById('pdfModal');
    const title = document.getElementById('pdfTitle');
    
    title.textContent = content.title;
    currentPdfContentId = content.id;
    currentPdfUrl = content.url;
    currentPdfTitle = content.title;
    
    // Check for saved page position
    const savedPosition = getPlaybackPosition(content.id);
    if (savedPosition && savedPosition.position) {
        pageNum = savedPosition.position;
    } else {
        pageNum = content.last_page || 1;
    }
    
    modal.classList.add('active');
    
    try {
        // Load PDF
        const loadingTask = pdfjsLib.getDocument(content.url);
        pdfDoc = await loadingTask.promise;
        
        console.log('📄 PDF loaded:', pdfDoc.numPages, 'pages');
        
        // Render first page
        renderPage(pageNum);
        
        // Update page info
        updatePageInfo();
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF: ' + error.message);
        closePdfViewer();
    }
}

// ==================== RENDER PAGE ====================
async function renderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
        return;
    }
    
    pageRendering = true;
    
    try {
        const page = await pdfDoc.getPage(num);
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        
        pageRendering = false;
        
        if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
        }
        
        // Detect and handle links
        await detectAndHandleLinks(page, viewport, canvas);
        
        // Save page position
        if (currentPdfContentId) {
            savePlaybackPosition(currentPdfContentId, num);
            await supabaseClient.updateLastPage(currentPdfContentId, num);
        }
        
    } catch (error) {
        console.error('Error rendering page:', error);
        pageRendering = false;
    }
}

// ==================== LINK DETECTION ====================
async function detectAndHandleLinks(page, viewport, canvas) {
    try {
        const annotations = await page.getAnnotations();
        
        if (annotations.length === 0) return;
        
        console.log('🔗 Found', annotations.length, 'annotations on page', pageNum);
        
        // Remove old link overlays
        const oldOverlays = document.querySelectorAll('.pdf-link-overlay');
        oldOverlays.forEach(overlay => overlay.remove());
        
        // Create container for link overlays
        const container = document.getElementById('pdfContainer');
        const canvasRect = canvas.getBoundingClientRect();
        
        annotations.forEach(annotation => {
            if (annotation.subtype === 'Link' && annotation.url) {
                createLinkOverlay(annotation, viewport, canvas, canvasRect, container);
            }
        });
        
    } catch (error) {
        console.error('Error detecting links:', error);
    }
}

function createLinkOverlay(annotation, viewport, canvas, canvasRect, container) {
    const rect = annotation.rect;
    
    // Convert PDF coordinates to canvas coordinates
    const [x1, y1, x2, y2] = rect;
    const canvasX1 = x1 * scale;
    const canvasY1 = (viewport.height - y2) * scale;
    const canvasX2 = x2 * scale;
    const canvasY2 = (viewport.height - y1) * scale;
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'pdf-link-overlay';
    overlay.style.position = 'absolute';
    overlay.style.left = (canvasRect.left + canvasX1) + 'px';
    overlay.style.top = (canvasRect.top + canvasY1) + 'px';
    overlay.style.width = (canvasX2 - canvasX1) + 'px';
    overlay.style.height = (canvasY2 - canvasY1) + 'px';
    overlay.style.cursor = 'pointer';
    overlay.style.border = '2px solid rgba(0, 123, 255, 0.3)';
    overlay.style.background = 'rgba(0, 123, 255, 0.1)';
    overlay.style.zIndex = '10';
    overlay.style.transition = 'all 0.2s';
    
    overlay.addEventListener('mouseenter', () => {
        overlay.style.background = 'rgba(0, 123, 255, 0.2)';
        overlay.style.border = '2px solid rgba(0, 123, 255, 0.6)';
    });
    
    overlay.addEventListener('mouseleave', () => {
        overlay.style.background = 'rgba(0, 123, 255, 0.1)';
        overlay.style.border = '2px solid rgba(0, 123, 255, 0.3)';
    });
    
    overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Open link in modal instead of new tab
        openLinkInModal(annotation.url, 'PDF Link');
        
        console.log('🔗 Clicked link:', annotation.url);
    });
    
    overlay.title = annotation.url;
    
    container.appendChild(overlay);
}

// ==================== PAGE NAVIGATION ====================
function previousPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function nextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
    updatePageInfo();
}

function updatePageInfo() {
    document.getElementById('pageInfo').textContent = `Page ${pageNum} of ${pdfDoc ? pdfDoc.numPages : '?'}`;
    
    // Update button states
    document.getElementById('prevPage').disabled = pageNum <= 1;
    document.getElementById('nextPage').disabled = pdfDoc && pageNum >= pdfDoc.numPages;
}

// ==================== ZOOM CONTROLS ====================
function zoomIn() {
    scale += 0.25;
    if (scale > 3) scale = 3;
    renderPage(pageNum);
    updateZoomLevel();
}

function zoomOut() {
    scale -= 0.25;
    if (scale < 0.5) scale = 0.5;
    renderPage(pageNum);
    updateZoomLevel();
}

function updateZoomLevel() {
    document.getElementById('zoomLevel').textContent = Math.round(scale * 100) + '%';
}

// ==================== DOWNLOAD PDF ====================
async function downloadPDF() {
    if (!currentPdfUrl || !currentPdfTitle) {
        alert('No PDF is currently loaded');
        return;
    }
    
    try {
        console.log('📥 Downloading PDF:', currentPdfTitle);
        
        // Fetch the PDF file
        const response = await fetch(currentPdfUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch PDF');
        }
        
        // Get the blob
        const blob = await response.blob();
        
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Set filename (sanitize the title)
        const filename = currentPdfTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        a.download = filename;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ PDF download initiated:', filename);
        
    } catch (error) {
        console.error('❌ Error downloading PDF:', error);
        alert('Error downloading PDF: ' + error.message);
    }
}

// ==================== CLOSE VIEWER ====================
function closePdfViewer() {
    const modal = document.getElementById('pdfModal');
    modal.classList.remove('active');
    
    // Clean up
    pdfDoc = null;
    pageNum = 1;
    scale = 1.5;
    currentPdfContentId = null;
    currentPdfUrl = null;
    currentPdfTitle = null;
    
    // Remove link overlays
    const overlays = document.querySelectorAll('.pdf-link-overlay');
    overlays.forEach(overlay => overlay.remove());
    
    // Clear canvas
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    const pdfModal = document.getElementById('pdfModal');
    if (!pdfModal.classList.contains('active')) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            previousPage();
            break;
        case 'ArrowRight':
            nextPage();
            break;
        case 'Escape':
            closePdfViewer();
            break;
        case '+':
        case '=':
            zoomIn();
            break;
        case '-':
            zoomOut();
            break;
    }
});

// ==================== ANIMATED MEDIA IN PDFs ====================
// This is a placeholder for future enhancement
// To support GIFs/animations in PDFs, you would need to:
// 1. Detect image annotations
// 2. Check if they're animated (GIF, APNG, etc.)
// 3. Replace them with <img> tags in an overlay
// 4. Position them correctly over the canvas

async function detectAnimatedMedia(page) {
    // Future implementation
    // This would scan for image annotations and check if they're animated
    console.log('🎬 Animated media detection not yet implemented');
}

// ==================== TOUCH GESTURES (Mobile) ====================
let touchStartX = 0;
let touchEndX = 0;

document.getElementById('pdfCanvas').addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

document.getElementById('pdfCanvas').addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
        // Swipe left - next page
        nextPage();
    }
    if (touchEndX > touchStartX + 50) {
        // Swipe right - previous page
        previousPage();
    }
}
