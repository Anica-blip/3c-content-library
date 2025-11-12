/**
 * 3C Admin Panel - Core JavaScript
 * Enhanced version with Supabase integration
 */

// ==================== GLOBAL STATE ====================
let currentFile = null;
let currentThumbnail = null;
let debugMode = false;
let folders = [];
let allContent = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('🚀 Admin panel initializing...');
    
    // Load saved Supabase credentials
    loadSupabaseCredentials();
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Setup file upload handlers
    setupFileHandlers();
    
    // Try to connect if credentials exist
    const url = document.getElementById('supabaseUrl').value;
    const key = document.getElementById('supabaseKey').value;
    
    if (url && key) {
        await connectSupabase();
    }
});

// ==================== SUPABASE CONNECTION ====================
function loadSupabaseCredentials() {
    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_key') || '';
    
    document.getElementById('supabaseUrl').value = url;
    document.getElementById('supabaseKey').value = key;
}

function saveSupabaseCredentials(url, key) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
}

async function connectSupabase() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    
    if (!url || !key) {
        showAlert('error', 'Please enter both Supabase URL and Anon Key');
        return;
    }
    
    try {
        debugLog('🔌 Connecting to Supabase...');
        await supabaseClient.init(url, key);
        
        saveSupabaseCredentials(url, key);
        updateConnectionStatus(true);
        showAlert('success', '✅ Connected to Supabase successfully!');
        
        // Load data
        await loadAllData();
        
        debugLog('✅ Supabase connected and data loaded');
    } catch (error) {
        debugLog('❌ Supabase connection failed: ' + error.message);
        updateConnectionStatus(false);
        showAlert('error', 'Connection failed: ' + error.message);
    }
}

async function testConnection() {
    try {
        await supabaseClient.testConnection();
        showAlert('success', '✅ Connection test successful!');
    } catch (error) {
        showAlert('error', '❌ Connection test failed: ' + error.message);
    }
}

function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionStatus');
    if (indicator) {
        indicator.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
    }
}

// ==================== DATA LOADING ====================
async function loadAllData() {
    try {
        // Load folders
        folders = await supabaseClient.getFolders();
        updateFolderSelects();
        displayFolders();
        
        // Load content
        await loadContent();
        
        // Load stats
        await loadStats();
        
        debugLog('📊 Data loaded: ' + folders.length + ' folders, ' + allContent.length + ' content items');
    } catch (error) {
        debugLog('❌ Error loading data: ' + error.message);
        showAlert('error', 'Error loading data: ' + error.message);
    }
}

async function loadStats() {
    try {
        const stats = await supabaseClient.getStats();
        document.getElementById('statFolders').textContent = stats.totalFolders;
        document.getElementById('statContent').textContent = stats.totalContent;
        document.getElementById('statViews').textContent = stats.totalViews;
    } catch (error) {
        debugLog('Error loading stats: ' + error.message);
    }
}

async function loadContent() {
    const filterFolderId = document.getElementById('filterFolder').value;
    
    try {
        if (filterFolderId) {
            allContent = await supabaseClient.getContentByFolder(filterFolderId);
        } else {
            // Load all content
            allContent = [];
            for (const folder of folders) {
                const content = await supabaseClient.getContentByFolder(folder.id);
                allContent.push(...content);
            }
        }
        
        displayContent();
    } catch (error) {
        debugLog('Error loading content: ' + error.message);
    }
}

// ==================== UI HELPER FUNCTIONS ====================
function updateFolderTypeUI() {
    const folderType = document.getElementById('folderType').value;
    const parentGroup = document.getElementById('parentFolderGroup');
    
    if (folderType === 'sub_root') {
        parentGroup.style.display = 'block';
    } else {
        parentGroup.style.display = 'none';
        document.getElementById('parentFolder').value = '';
    }
    
    suggestCustomURL();
}

function suggestCustomURL() {
    const title = document.getElementById('folderTitle').value.trim();
    const folderType = document.getElementById('folderType').value;
    const parentId = document.getElementById('parentFolder').value;
    const customURLInput = document.getElementById('folderCustomURL');
    const preview = document.getElementById('urlPreview');
    
    if (!title) {
        preview.textContent = 'URL: (will be auto-generated)';
        return;
    }
    
    // Generate suggestion
    let suggestion = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_');
    
    if (folderType === 'sub_root' && parentId) {
        const parentFolder = folders.find(f => f.id === parentId);
        if (parentFolder) {
            const parentURL = parentFolder.custom_url || parentFolder.slug;
            suggestion = `${parentURL}_sub.01`;
        }
    }
    
    // Only show suggestion if custom URL is empty
    if (!customURLInput.value) {
        preview.textContent = `Suggested URL: ${suggestion}`;
    } else {
        preview.textContent = `Custom URL: ${customURLInput.value}`;
    }
}

function suggestContentURL() {
    const title = document.getElementById('contentTitle').value.trim();
    const folderId = document.getElementById('contentFolder').value;
    const customURLInput = document.getElementById('contentCustomURL');
    const preview = document.getElementById('contentUrlPreview');
    
    if (!title || !folderId) {
        preview.textContent = 'URL: (will be auto-generated)';
        return;
    }
    
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
        const folderURL = folder.custom_url || folder.slug;
        const suggestion = `${folderURL}_content.01`;
        
        if (!customURLInput.value) {
            preview.textContent = `Suggested URL: ${suggestion}`;
        } else {
            preview.textContent = `Custom URL: ${customURLInput.value}`;
        }
    }
}

// ==================== FOLDER OPERATIONS ====================
async function createFolder() {
    const title = document.getElementById('folderTitle').value.trim();
    const tableName = document.getElementById('folderTableName').value.trim();
    const visibility = document.getElementById('folderVisibility').value;
    const description = document.getElementById('folderDescription').value.trim();
    const folderType = document.getElementById('folderType').value;
    const parentId = document.getElementById('parentFolder').value || null;
    const customURL = document.getElementById('folderCustomURL').value.trim() || null;
    
    if (!title) {
        showAlert('error', 'Please enter a folder title');
        return;
    }
    
    if (!tableName) {
        showAlert('error', 'Please enter a table name');
        return;
    }
    
    // Validate table name (lowercase, underscores only)
    if (!/^[a-z_]+$/.test(tableName)) {
        showAlert('error', 'Table name must be lowercase letters and underscores only (e.g., anica_chats)');
        return;
    }
    
    // Validate folder type and parent
    if (folderType === 'sub_root' && !parentId) {
        showAlert('error', 'Sub-root folders require a parent folder');
        return;
    }
    
    // Validate custom URL format
    if (customURL && !/^[a-z0-9_.-]+$/.test(customURL)) {
        showAlert('error', 'Custom URL can only contain lowercase letters, numbers, underscores, dots, and hyphens');
        return;
    }
    
    try {
        debugLog('📁 Creating folder: ' + title + ' (type: ' + folderType + ', table: ' + tableName + ', visibility: ' + visibility + ', parent: ' + (parentId || 'root') + ', custom URL: ' + (customURL || 'auto') + ')');
        const isPublic = visibility === 'public';
        const folder = await supabaseClient.createFolder(title, description, tableName, isPublic, parentId, folderType, customURL);
        
        const folderTypeLabel = folderType === 'sub_root' ? 'Sub-root folder' : 'Root folder';
        const displayURL = folder.custom_url || folder.slug;
        showAlert('success', `✅ ${folderTypeLabel} created: ${displayURL} → ${isPublic ? 'content_public' : 'content_private'}.${tableName}`);
        
        // Reset form
        document.getElementById('folderTitle').value = '';
        document.getElementById('folderTableName').value = '';
        document.getElementById('folderVisibility').value = 'public';
        document.getElementById('folderDescription').value = '';
        document.getElementById('folderType').value = 'root';
        document.getElementById('parentFolder').value = '';
        document.getElementById('folderCustomURL').value = '';
        document.getElementById('urlPreview').textContent = 'URL: (will be auto-generated)';
        updateFolderTypeUI();
        
        // Reload data
        await loadAllData();
    } catch (error) {
        debugLog('❌ Error creating folder: ' + error.message);
        showAlert('error', 'Error creating folder: ' + error.message);
    }
}

function editFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    // Populate parent folder dropdown for edit
    const editParentSelect = document.getElementById('editParentFolder');
    editParentSelect.innerHTML = '<option value="">-- Select Parent Folder --</option>';
    const rootFolders = folders.filter(f => !f.parent_id || f.folder_type === 'root');
    rootFolders.forEach(f => {
        if (f.id !== folder.id) { // Don't allow selecting itself as parent
            editParentSelect.innerHTML += `<option value="${f.id}">${f.title}</option>`;
        }
    });
    
    // Fill all form fields
    document.getElementById('editFolderId').value = folder.id;
    document.getElementById('editFolderTitle').value = folder.title;
    document.getElementById('editFolderType').value = folder.folder_type || 'root';
    document.getElementById('editParentFolder').value = folder.parent_id || '';
    document.getElementById('editFolderCustomURL').value = folder.custom_url || '';
    document.getElementById('editFolderTableName').value = folder.table_name || '';
    document.getElementById('editFolderDescription').value = folder.description || '';
    document.getElementById('editFolderPublic').checked = folder.is_public !== false;
    
    // Update UI based on folder type
    updateEditFolderTypeUI();
    
    // Show current URL
    const displayURL = folder.custom_url || folder.slug;
    document.getElementById('editUrlPreview').textContent = `Current URL: ${displayURL}`;
    
    document.getElementById('editFolderModal').classList.add('active');
}

async function updateFolder() {
    const id = document.getElementById('editFolderId').value;
    const title = document.getElementById('editFolderTitle').value.trim();
    const folderType = document.getElementById('editFolderType').value;
    const parentId = document.getElementById('editParentFolder').value || null;
    const customUrl = document.getElementById('editFolderCustomURL').value.trim() || null;
    const tableName = document.getElementById('editFolderTableName').value.trim();
    const description = document.getElementById('editFolderDescription').value.trim();
    const isPublic = document.getElementById('editFolderPublic').checked;
    
    if (!title) {
        showAlert('error', 'Please enter a folder title');
        return;
    }
    
    if (!tableName) {
        showAlert('error', 'Please enter a table name');
        return;
    }
    
    if (folderType === 'sub_root' && !parentId) {
        showAlert('error', 'Sub-root folders require a parent folder');
        return;
    }
    
    try {
        await supabaseClient.updateFolder(id, { 
            title, 
            folder_type: folderType,
            parent_id: parentId,
            custom_url: customUrl,
            table_name: tableName,
            description,
            is_public: isPublic
        });
        showAlert('success', '✅ Folder updated successfully!');
        closeEditFolderModal();
        await loadAllData();
    } catch (error) {
        showAlert('error', 'Error updating folder: ' + error.message);
    }
}

async function deleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    if (!confirm(`Delete folder "${folder.title}" and all its content?`)) {
        return;
    }
    
    try {
        await supabaseClient.deleteFolder(folderId);
        showAlert('success', '✅ Folder deleted');
        await loadAllData();
    } catch (error) {
        showAlert('error', 'Error deleting folder: ' + error.message);
    }
}

function closeEditFolderModal() {
    document.getElementById('editFolderModal').classList.remove('active');
}

function updateEditFolderTypeUI() {
    const folderType = document.getElementById('editFolderType').value;
    const parentGroup = document.getElementById('editParentFolderGroup');
    if (folderType === 'sub_root') {
        parentGroup.style.display = 'block';
    } else {
        parentGroup.style.display = 'none';
        document.getElementById('editParentFolder').value = '';
    }
    suggestEditCustomURL();
}

function suggestEditCustomURL() {
    const title = document.getElementById('editFolderTitle').value.trim();
    const folderType = document.getElementById('editFolderType').value;
    const parentId = document.getElementById('editParentFolder').value;
    const customURLInput = document.getElementById('editFolderCustomURL');
    const preview = document.getElementById('editUrlPreview');
    
    if (!title) {
        preview.textContent = 'URL: (will be auto-generated)';
        return;
    }
    
    let suggestion = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_');
    
    if (folderType === 'sub_root' && parentId) {
        const parentFolder = folders.find(f => f.id === parentId);
        if (parentFolder) {
            const parentURL = parentFolder.custom_url || parentFolder.slug;
            suggestion = `${parentURL}_sub.01`;
        }
    }
    
    if (!customURLInput.value) {
        preview.textContent = `Suggested URL: ${suggestion}`;
    } else {
        preview.textContent = `Custom URL: ${customURLInput.value}`;
    }
}

function updateEditURLPreview() {
    const customURL = document.getElementById('editFolderCustomURL').value.trim();
    const preview = document.getElementById('editUrlPreview');
    
    if (customURL) {
        preview.textContent = `Custom URL: ${customURL}`;
    } else {
        suggestEditCustomURL();
    }
}

// ==================== CONTENT OPERATIONS ====================
async function saveContent(event) {
    event.preventDefault();
    
    const editMode = document.getElementById('editMode').value === 'true';
    const contentId = document.getElementById('contentId').value;
    
    const folderId = document.getElementById('contentFolder').value;
    const title = document.getElementById('contentTitle').value.trim();
    const type = document.getElementById('contentType').value;
    const urlInput = document.getElementById('contentUrl').value.trim();
    const externalUrl = document.getElementById('externalUrl').value.trim();
    const description = document.getElementById('contentDescription').value.trim();
    const customURL = document.getElementById('contentCustomURL').value.trim() || null;
    
    if (!folderId) {
        showAlert('error', 'Please select a folder');
        return;
    }
    
    if (!title) {
        showAlert('error', 'Please enter a content title');
        return;
    }
    
    try {
        let fileUrl = urlInput;
        let thumbnailUrl = null;
        
        // Check if R2 is enabled
        const useR2 = CONFIG && CONFIG.features && CONFIG.features.useCloudflareR2;
        
        // Handle file upload
        if (currentFile) {
            debugLog('📤 Uploading file to R2...');
            if (useR2) {
                try {
                    const result = await r2Storage.uploadContent(currentFile);
                    fileUrl = result.url;
                    debugLog('✅ File uploaded: ' + fileUrl);
                } catch (error) {
                    debugLog('❌ R2 upload failed, using base64 fallback');
                    fileUrl = await fileToBase64(currentFile);
                }
            } else {
                fileUrl = await fileToBase64(currentFile);
            }
        }
        
        // Handle thumbnail upload
        if (currentThumbnail) {
            debugLog('📤 Uploading thumbnail...');
            if (useR2) {
                try {
                    const result = await r2Storage.uploadThumbnail(currentThumbnail);
                    thumbnailUrl = result.url;
                } catch (error) {
                    thumbnailUrl = await fileToBase64(currentThumbnail);
                }
            } else {
                thumbnailUrl = await fileToBase64(currentThumbnail);
            }
        }
        
        if (!fileUrl && !externalUrl) {
            showAlert('error', 'Please upload a file or enter a URL');
            return;
        }
        
        const contentData = {
            folder_id: folderId,
            title: title,
            type: type,
            url: fileUrl || null,
            external_url: externalUrl || null,
            thumbnail_url: thumbnailUrl,
            description: description,
            file_size: currentFile ? currentFile.size : null,
            custom_url: customURL
        };
        
        if (editMode) {
            // Update existing content
            debugLog('✏️ Updating content: ' + contentId);
            await supabaseClient.updateContent(contentId, contentData, folderId);
            const displayURL = customURL || 'auto-generated';
            showAlert('success', `✅ Content updated (URL: ${displayURL})`);
        } else {
            // Create new content
            debugLog('➕ Creating new content: ' + title);
            const result = await supabaseClient.createContent(contentData);
            const displayURL = result.custom_url || result.slug;
            showAlert('success', `✅ Content saved (URL: ${displayURL})`);
        }
        
        // Reset form
        resetContentForm();
        
        // Reload data
        await loadAllData();
        
    } catch (error) {
        debugLog('❌ Error saving content: ' + error.message);
        showAlert('error', 'Error saving content: ' + error.message);
    }
}

function editContent(contentId) {
    const content = allContent.find(c => c.id === contentId);
    if (!content) return;
    
    // Switch to edit mode
    document.getElementById('editMode').value = 'true';
    document.getElementById('contentId').value = content.id;
    document.getElementById('contentFormTitle').textContent = '✏️ Edit Content';
    document.getElementById('saveButton').textContent = '💾 Update Content';
    
    // Fill form
    document.getElementById('contentFolder').value = content.folder_id;
    document.getElementById('contentTitle').value = content.title;
    document.getElementById('contentType').value = content.type;
    document.getElementById('contentUrl').value = content.url || '';
    document.getElementById('externalUrl').value = content.external_url || '';
    document.getElementById('contentDescription').value = content.description || '';
    
    // Show thumbnail if exists
    if (content.thumbnail_url) {
        const preview = document.getElementById('thumbnailPreview');
        preview.src = content.thumbnail_url;
        preview.style.display = 'block';
    }
    
    // Scroll to form
    document.getElementById('contentForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteContent(contentId) {
    const content = allContent.find(c => c.id === contentId);
    if (!content) return;
    
    if (!confirm(`Delete content "${content.title}"?`)) {
        return;
    }
    
    try {
        await supabaseClient.deleteContent(contentId, content.folder_id);
        showAlert('success', '✅ Content deleted');
        await loadAllData();
    } catch (error) {
        showAlert('error', 'Error deleting content: ' + error.message);
    }
}

async function moveContentUp(contentId) {
    try {
        await supabaseClient.moveContentUp(contentId);
        await loadContent();
    } catch (error) {
        showAlert('error', 'Error moving content: ' + error.message);
    }
}

async function moveContentDown(contentId) {
    try {
        await supabaseClient.moveContentDown(contentId);
        await loadContent();
    } catch (error) {
        showAlert('error', 'Error moving content: ' + error.message);
    }
}

function resetContentForm() {
    document.getElementById('editMode').value = 'false';
    document.getElementById('contentId').value = '';
    document.getElementById('contentFormTitle').textContent = '➕ Add Content';
    document.getElementById('saveButton').textContent = '💾 Save Content';
    
    document.getElementById('contentForm').reset();
    document.getElementById('fileInfo').textContent = '';
    document.getElementById('thumbnailPreview').style.display = 'none';
    document.getElementById('contentCustomURL').value = '';
    document.getElementById('contentUrlPreview').textContent = 'URL: (will be auto-generated)';
    
    currentFile = null;
    currentThumbnail = null;
}

// ==================== UI DISPLAY ====================
function updateFolderSelects() {
    const selects = ['contentFolder', 'filterFolder', 'parentFolder'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        
        // Keep first option
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        // Add folders with indentation for sub-folders
        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            
            // Add indentation based on depth
            const indent = '  '.repeat(folder.depth || 0);
            const prefix = folder.depth > 0 ? '└─ ' : '';
            
            option.textContent = `${indent}${prefix}${folder.title} (${folder.item_count || 0} items)`;
            select.appendChild(option);
        });
        
        // Restore selection
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function displayFolders() {
    const container = document.getElementById('folderList');
    
    if (folders.length === 0) {
        container.innerHTML = '<p style="color: #999;">No folders created yet.</p>';
        return;
    }
    
    const html = folders.map(folder => {
        const indent = '  '.repeat(folder.depth || 0);
        const prefix = folder.depth > 0 ? '└─ ' : '';
        const depthStyle = folder.depth > 0 ? `margin-left: ${folder.depth * 20}px; border-left: 2px solid #ddd; padding-left: 10px;` : '';
        
        const folderTypeLabel = folder.folder_type === 'sub_root' ? '📂 Sub-Root' : '📁 Root';
        const displayURL = folder.custom_url || folder.slug;
        
        return `
        <div class="folder-card" style="${depthStyle}">
            <div class="folder-header">
                <div>
                    <div class="folder-title">${prefix}${escapeHtml(folder.title)} <span style="font-size: 12px; color: #666;">${folderTypeLabel}</span></div>
                    <div class="folder-meta">
                        URL: <strong style="color: #007bff;">${displayURL}</strong> | Items: ${folder.item_count || 0} | Depth: ${folder.depth || 0}
                    </div>
                    ${folder.path ? `<div class="folder-meta">Path: ${folder.path}</div>` : ''}
                    ${folder.description ? `<div class="folder-meta">${escapeHtml(folder.description)}</div>` : ''}
                </div>
                <div class="folder-actions">
                    <button onclick="editFolder('${folder.id}')">Edit</button>
                    <button class="delete" onclick="deleteFolder('${folder.id}')">Delete</button>
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    container.innerHTML = html;
}

function displayContent() {
    const container = document.getElementById('contentList');
    
    if (allContent.length === 0) {
        container.innerHTML = '<p style="color: #999;">No content added yet.</p>';
        return;
    }
    
    const html = allContent.map((content, index) => {
        const folder = folders.find(f => f.id === content.folder_id);
        const folderName = folder ? folder.title : 'Unknown';
        
        const thumbnailHtml = content.thumbnail_url 
            ? `<img src="${content.thumbnail_url}" class="content-thumbnail" alt="Thumbnail">`
            : `<div class="content-thumbnail" style="background: #ddd; display: flex; align-items: center; justify-content: center; color: #999; font-size: 24px;">${getTypeIcon(content.type)}</div>`;
        
        const canMoveUp = index > 0 && allContent[index-1].folder_id === content.folder_id;
        const canMoveDown = index < allContent.length - 1 && allContent[index+1].folder_id === content.folder_id;
        
        return `
            <div class="content-card">
                ${thumbnailHtml}
                <div class="content-info">
                    <div class="content-title">${escapeHtml(content.title)}</div>
                    <div class="content-meta">
                        Folder: ${escapeHtml(folderName)} | Type: ${content.type.toUpperCase()} | Views: ${content.view_count || 0}
                    </div>
                    <div class="content-meta">🔗 Public URL: <strong style="color: #007bff;">${content.custom_url || content.slug || 'auto-generated'}</strong></div>
                    ${content.url ? `<div class="content-meta">📄 File URL: <a href="${truncateURL(content.url)}" target="_blank" style="color: #007bff; text-decoration: none;" title="${content.url}">${truncateURL(content.url)}</a></div>` : '<div class="content-meta" style="color: #dc3545;">⚠️ No file URL</div>'}
                    ${content.description ? `<div class="content-meta">${escapeHtml(content.description)}</div>` : ''}
                    ${content.external_url ? `<div class="content-meta">🔗 Tech URL: <a href="${content.external_url}" target="_blank" style="color: #28a745; text-decoration: none;">${content.external_url}</a></div>` : ''}
                </div>
                <div class="content-actions">
                    ${canMoveUp ? `<button onclick="moveContentUp('${content.id}')">↑</button>` : ''}
                    ${canMoveDown ? `<button onclick="moveContentDown('${content.id}')">↓</button>` : ''}
                    <button onclick="editContent('${content.id}')">Edit</button>
                    <button class="delete" onclick="deleteContent('${content.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ==================== FILE HANDLING ====================
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        }, false);
    });
    
    uploadArea.addEventListener('drop', handleDrop, false);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        currentFile = files[0];
        displayFileInfo(currentFile);
    }
}

function setupFileHandlers() {
    document.getElementById('fileUpload').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            displayFileInfo(currentFile);
        }
    });
}

function displayFileInfo(file) {
    const info = document.getElementById('fileInfo');
    const size = formatFileSize(file.size);
    info.textContent = `📄 ${file.name} (${size})`;
}

function previewThumbnail(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    currentThumbnail = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('thumbnailPreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==================== DEBUG PANEL ====================
function toggleDebug() {
    debugMode = !debugMode;
    const panel = document.getElementById('debugPanel');
    panel.classList.toggle('active', debugMode);
    
    if (debugMode) {
        updateDebugPanel();
    }
}

function debugLog(message) {
    console.log(message);
    
    if (debugMode) {
        const content = document.getElementById('debugContent');
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.style.marginBottom = '10px';
        entry.style.paddingBottom = '10px';
        entry.style.borderBottom = '1px solid #333';
        entry.innerHTML = `<small style="color: #888;">[${timestamp}]</small><br>${escapeHtml(message)}`;
        content.insertBefore(entry, content.firstChild);
        
        // Keep only last 50 entries
        while (content.children.length > 50) {
            content.removeChild(content.lastChild);
        }
    }
}

function updateDebugPanel() {
    const content = document.getElementById('debugContent');
    content.innerHTML = `
        <h4 style="color: #4ec9b0; margin-bottom: 10px;">Current State</h4>
        <pre>${JSON.stringify({
            connected: supabaseClient.isConnected,
            folders: folders.length,
            content: allContent.length,
            currentFile: currentFile ? currentFile.name : null,
            currentThumbnail: currentThumbnail ? currentThumbnail.name : null
        }, null, 2)}</pre>
    `;
}

// ==================== UTILITY FUNCTIONS ====================
function showAlert(type, message) {
    const alertDiv = document.getElementById('connectionAlert');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

function truncateURL(url) {
    if (!url) return '';
    // Show only first 60 characters for long Cloudflare URLs
    if (url.length > 60) {
        return url.substring(0, 60) + '...';
    }
    return url;
}
