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

// ==================== GLOBAL ERROR HANDLER ====================
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin panel initializing...');
    debugLog('🚀 Admin panel initializing...');
    
    try {
        // Load saved Supabase credentials
        loadSupabaseCredentials();
        
        // Setup drag and drop
        setupDragAndDrop();
        
        // Setup file upload handlers
        setupFileHandlers();
        
        // Try to connect if credentials exist
        const urlInput = document.getElementById('supabaseUrl');
        const keyInput = document.getElementById('supabaseKey');
        
        if (urlInput && keyInput) {
            const url = urlInput.value;
            const key = keyInput.value;
            
            if (url && key) {
                console.log('Auto-connecting with saved credentials...');
                await connectSupabase();
            }
        }
        
        console.log('✅ Admin panel initialized');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        debugLog('❌ Initialization error: ' + (error.message || error.toString()));
    }
});

// ==================== SUPABASE CONNECTION ====================
function loadSupabaseCredentials() {
    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_key') || '';
    
    const urlInput = document.getElementById('supabaseUrl');
    const keyInput = document.getElementById('supabaseKey');
    
    if (urlInput) urlInput.value = url;
    if (keyInput) keyInput.value = key;
}

function saveSupabaseCredentials(url, key) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
}

async function connectSupabase() {
    const urlInput = document.getElementById('supabaseUrl');
    const keyInput = document.getElementById('supabaseKey');
    
    if (!urlInput || !keyInput) {
        showAlert('error', 'Supabase connection fields not found');
        return;
    }
    
    const url = urlInput.value.trim();
    const key = keyInput.value.trim();
    
    if (!url || !key) {
        showAlert('error', 'Please enter both Supabase URL and Anon Key');
        return;
    }
    
    try {
        debugLog('🔌 Connecting to Supabase...');
        console.log('Attempting connection with URL:', url);
        
        await supabaseClient.init(url, key);
        
        saveSupabaseCredentials(url, key);
        updateConnectionStatus(true);
        showAlert('success', '✅ Connected to Supabase successfully!');
        
        // Load data
        debugLog('📥 Loading data from Supabase...');
        await loadAllData();
        
        debugLog('✅ Supabase connected and data loaded');
    } catch (error) {
        console.error('Connection error:', error);
        debugLog('❌ Supabase connection failed: ' + (error.message || error.toString()));
        updateConnectionStatus(false);
        showAlert('error', 'Connection failed: ' + (error.message || error.toString()));
    }
}

async function testConnection() {
    try {
        if (!supabaseClient.isConnected) {
            showAlert('error', 'Please connect to Supabase first');
            return;
        }
        
        debugLog('🧪 Testing connection...');
        await supabaseClient.testConnection();
        showAlert('success', '✅ Connection test successful!');
        debugLog('✅ Connection test passed');
    } catch (error) {
        console.error('Test connection error:', error);
        debugLog('❌ Connection test failed: ' + (error.message || error.toString()));
        showAlert('error', '❌ Connection test failed: ' + (error.message || error.toString()));
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
        const statFolders = document.getElementById('statFolders');
        const statContent = document.getElementById('statContent');
        const statViews = document.getElementById('statViews');
        
        if (statFolders) statFolders.textContent = stats.totalFolders;
        if (statContent) statContent.textContent = stats.totalContent;
        if (statViews) statViews.textContent = stats.totalViews;
    } catch (error) {
        debugLog('Error loading stats: ' + error.message);
    }
}

async function loadContent() {
    try {
        console.log('📥 Loading content for', folders.length, 'folders...');
        // Load all content from all folders
        allContent = [];
        for (const folder of folders) {
            try {
                console.log('Loading content for folder:', folder.title, '(ID:', folder.id, ')');
                const content = await supabaseClient.getContentByFolder(folder.id);
                console.log('  → Found', content.length, 'items in', folder.title);
                allContent.push(...content);
            } catch (folderError) {
                console.error('Error loading content for folder', folder.title, ':', folderError);
                // Continue with other folders even if one fails
            }
        }
        
        console.log('✅ Total content loaded:', allContent.length);
        displayContent();
    } catch (error) {
        debugLog('Error loading content: ' + error.message);
        console.error('Error loading content:', error);
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
    console.log('🔨 createFolder() called');
    
    if (!supabaseClient.isConnected) {
        showAlert('error', 'Please connect to Supabase first');
        console.error('Supabase not connected');
        return;
    }
    
    const title = document.getElementById('folderTitle').value.trim();
    const tableName = document.getElementById('folderTableName').value.trim();
    const visibility = document.getElementById('folderVisibility').value;
    const description = document.getElementById('folderDescription').value.trim();
    const folderType = document.getElementById('folderType').value;
    const parentId = document.getElementById('parentFolder').value || null;
    const customURL = document.getElementById('folderCustomURL').value.trim() || null;
    
    console.log('📋 Form values:', { title, tableName, visibility, description, folderType, parentId, customURL });
    
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
        console.log('📁 Creating folder in Supabase...');
        debugLog('📁 Creating folder: ' + title + ' (type: ' + folderType + ', table: ' + tableName + ', visibility: ' + visibility + ', parent: ' + (parentId || 'root') + ', custom URL: ' + (customURL || 'auto') + ')');
        const isPublic = visibility === 'public';
        const folder = await supabaseClient.createFolder(title, description, tableName, isPublic, parentId, folderType, customURL);
        
        console.log('✅ Folder created:', folder);
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
        console.log('🔄 Reloading data...');
        await loadAllData();
    } catch (error) {
        console.error('❌ Error creating folder:', error);
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
    const rootFolders = folders.filter(f => !f.parent_id && f.folder_type === 'root');
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
        let projectJson = null;
        
        // Check if R2 is enabled
        const useR2 = CONFIG && CONFIG.features && CONFIG.features.useCloudflareR2;
        
        // Handle file upload
        if (currentFile) {
            // Special handling for flipbook JSON files
            if (type === 'flipbook' && currentFile.type === 'application/json') {
                debugLog('📖 Processing flipbook JSON file...');
                try {
                    const jsonText = await currentFile.text();
                    const jsonData = JSON.parse(jsonText);
                    
                    // Store JSON content in project_json field for backward compatibility
                    projectJson = jsonText;
                    
                    // Upload JSON file to Cloudflare R2 (MUST be Cloudflare URL, not base64)
                    debugLog('📤 Uploading flipbook JSON to R2...');
                    if (useR2) {
                        try {
                            const result = await r2Storage.uploadFlipbook(currentFile);
                            fileUrl = result.url;
                            debugLog('✅ Flipbook JSON uploaded to R2: ' + fileUrl);
                        } catch (error) {
                            debugLog('❌ R2 upload failed: ' + error.message);
                            showAlert('error', 'Failed to upload JSON to Cloudflare R2: ' + error.message);
                            return;
                        }
                    } else {
                        showAlert('error', 'Cloudflare R2 is required for flipbook uploads');
                        return;
                    }
                    
                    debugLog('✅ Flipbook JSON parsed and stored');
                } catch (error) {
                    debugLog('❌ Failed to parse JSON: ' + error.message);
                    showAlert('error', 'Invalid JSON file: ' + error.message);
                    return;
                }
            } else {
                // Regular file upload for non-flipbook content (PDF, images, etc.)
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
        
        if (!fileUrl && !externalUrl && !projectJson) {
            showAlert('error', 'Please upload a file or enter a URL');
            return;
        }
        
        const contentData = {
            folder_id: folderId,
            title: title,
            type: type,
            url: fileUrl || (editMode && !currentFile ? allContent.find(c => c.id === contentId)?.url : null),
            external_url: externalUrl || null,
            thumbnail_url: thumbnailUrl || (editMode && !currentThumbnail ? allContent.find(c => c.id === contentId)?.thumbnail_url : null),
            description: description,
            file_size: currentFile ? currentFile.size : (editMode ? allContent.find(c => c.id === contentId)?.file_size : null),
            custom_url: customURL
        };
        
        // Add project_json for flipbook documents
        if (projectJson) {
            contentData.project_json = projectJson;
        }
        
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
    
    // Fill form with ALL existing data
    document.getElementById('contentFolder').value = content.folder_id;
    document.getElementById('contentTitle').value = content.title;
    document.getElementById('contentType').value = content.type;
    document.getElementById('contentUrl').value = content.url || '';
    document.getElementById('externalUrl').value = content.external_url || '';
    document.getElementById('contentDescription').value = content.description || '';
    document.getElementById('contentCustomURL').value = content.custom_url || '';
    
    // Store existing URLs so they don't get lost if user doesn't re-upload
    currentFile = null; // Clear file input
    currentThumbnail = null; // Clear thumbnail input
    
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
        const isParentSelect = selectId === 'parentFolder';
        
        // Keep first option
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        
        if (folders.length === 0) return;
        
        // For parent folder dropdown, only show root folders
        if (isParentSelect) {
            const rootFolders = folders.filter(f => !f.parent_id && f.folder_type === 'root').sort((a, b) => a.title.localeCompare(b.title));
            rootFolders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = `📁 ${folder.title}`;
                select.appendChild(option);
            });
        } else {
            // For content folder dropdown - show folders hierarchically grouped by root folder
            // Get root folders sorted alphabetically
            const rootFolders = folders.filter(f => !f.parent_id && f.folder_type === 'root').sort((a, b) => a.title.localeCompare(b.title));
            
            rootFolders.forEach(rootFolder => {
                // Add root folder
                const rootOption = document.createElement('option');
                rootOption.value = rootFolder.id;
                const rootContentCount = folders.filter(c => c.id === rootFolder.id)[0]?.item_count || 0;
                rootOption.textContent = `📁 ${rootFolder.title} (${rootContentCount} items)`;
                select.appendChild(rootOption);
                
                // Add sub-folders under this root folder
                const subfolders = folders.filter(f => f.parent_id === rootFolder.id).sort((a, b) => a.title.localeCompare(b.title));
                subfolders.forEach(subfolder => {
                    const subOption = document.createElement('option');
                    subOption.value = subfolder.id;
                    const subContentCount = subfolder.item_count || 0;
                    subOption.textContent = `  └─ ${subfolder.title} (${subContentCount} items)`;
                    select.appendChild(subOption);
                });
            });
        }
        
        // Restore selection
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function displayFolders() {
    displayFoldersGrid();
}

function displayContent() {
    displayFoldersGrid();
}

function displayFoldersGrid() {
    const publicContainer = document.getElementById('folderContentList');
    const privateContainer = document.getElementById('privateFolderContentList');
    
    if (!publicContainer || !privateContainer) {
        console.error('Folder containers not found');
        return;
    }
    
    if (folders.length === 0) {
        publicContainer.innerHTML = '<p style="color: #999;">No public folders created yet.</p>';
        privateContainer.innerHTML = '<p style="color: #999;">No private folders created yet.</p>';
        return;
    }
    
    // Separate public and private folders
    // Note: is_public defaults to true, so we check explicitly for false
    const publicRootFolders = folders.filter(f => {
        const isRoot = !f.parent_id && f.folder_type === 'root';
        const isPublic = f.is_public !== false; // true or null = public
        console.log(`Folder "${f.title}": is_public=${f.is_public}, isRoot=${isRoot}, isPublic=${isPublic}`);
        return isRoot && isPublic;
    }).sort((a, b) => a.title.localeCompare(b.title));
    
    const privateRootFolders = folders.filter(f => {
        const isRoot = !f.parent_id && f.folder_type === 'root';
        const isPrivate = f.is_public === false; // explicitly false = private
        return isRoot && isPrivate;
    }).sort((a, b) => a.title.localeCompare(b.title));
    
    console.log('📊 Public folders:', publicRootFolders.length, publicRootFolders.map(f => f.title));
    console.log('📊 Private folders:', privateRootFolders.length, privateRootFolders.map(f => f.title));
    
    // Render PUBLIC folders
    if (publicRootFolders.length === 0) {
        publicContainer.innerHTML = '<p style="color: #999;">No public folders created yet.</p>';
    } else {
        let publicHtml = '<div class="folders-grid">';
        publicRootFolders.forEach(folder => {
            const contentCount = allContent.filter(c => c.folder_id === folder.id).length;
            const subfolders = folders.filter(f => f.parent_id === folder.id);
            const subfoldersCount = subfolders.length;
            const displayURL = folder.custom_url || folder.slug;
            
            let countLabel = subfoldersCount > 0 
                ? `${subfoldersCount} subfolder${subfoldersCount !== 1 ? 's' : ''}, ${contentCount} item${contentCount !== 1 ? 's' : ''}`
                : `${contentCount} item${contentCount !== 1 ? 's' : ''}`;
            
            publicHtml += `
                <div class="folder-grid-card" onclick="openFolderSidebar('${folder.id}')">
                    <div class="folder-icon">📁</div>
                    <div class="folder-grid-title">${escapeHtml(folder.title)}</div>
                    <div class="folder-grid-meta">${countLabel}</div>
                    <div class="folder-grid-url">${displayURL}</div>
                </div>
            `;
        });
        publicHtml += '</div>';
        publicContainer.innerHTML = publicHtml;
    }
    
    // Render PRIVATE folders
    if (privateRootFolders.length === 0) {
        privateContainer.innerHTML = '<p style="color: #999;">No private folders created yet. Set is_public=false when creating a folder.</p>';
    } else {
        let privateHtml = '<div class="folders-grid">';
        privateRootFolders.forEach(folder => {
            const contentCount = allContent.filter(c => c.folder_id === folder.id).length;
            const subfolders = folders.filter(f => f.parent_id === folder.id);
            const subfoldersCount = subfolders.length;
            const displayURL = folder.custom_url || folder.slug;
            
            let countLabel = subfoldersCount > 0 
                ? `${subfoldersCount} subfolder${subfoldersCount !== 1 ? 's' : ''}, ${contentCount} item${contentCount !== 1 ? 's' : ''}`
                : `${contentCount} item${contentCount !== 1 ? 's' : ''}`;
            
            privateHtml += `
                <div class="folder-grid-card" onclick="openFolderSidebar('${folder.id}')" style="border-color: #e74c3c;">
                    <div class="folder-icon">🔒</div>
                    <div class="folder-grid-title">${escapeHtml(folder.title)}</div>
                    <div class="folder-grid-meta">${countLabel}</div>
                    <div class="folder-grid-url">${displayURL}</div>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(231, 76, 60, 0.2);">
                        <button onclick="event.stopPropagation(); managePasswords('${folder.id}')" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">🔑 Passwords</button>
                    </div>
                </div>
            `;
        });
        privateHtml += '</div>';
        privateContainer.innerHTML = privateHtml;
    }
}

// Folder sidebar management
function openFolderSidebar(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const folderContent = allContent.filter(c => c.folder_id === folderId);
    const subfolders = folders.filter(f => f.parent_id === folderId).sort((a, b) => a.title.localeCompare(b.title));
    const sidebar = document.getElementById('folderSidebar');
    const sidebarTitle = document.getElementById('sidebarFolderTitle');
    const sidebarContent = document.getElementById('sidebarContent');
    
    // Update sidebar header
    const folderTypeLabel = folder.folder_type === 'sub_root' ? '📂 Sub-Root' : '📁 Root';
    const displayURL = folder.custom_url || folder.slug;
    sidebarTitle.innerHTML = `
        <div style="flex: 1;">
            <h3 style="margin: 0; color: #a78bfa; font-size: 18px;">${escapeHtml(folder.title)} <span style="font-size: 12px; color: #999;">${folderTypeLabel}</span></h3>
            <div style="font-size: 12px; color: #808080; margin-top: 4px;">URL: <strong style="color: #8b5cf6;">${displayURL}</strong></div>
            ${folder.description ? `<div style="font-size: 12px; color: #999; margin-top: 2px;">${escapeHtml(folder.description)}</div>` : ''}
        </div>
        <div style="display: flex; gap: 8px;">
            <button onclick="editFolder('${folder.id}')" style="padding: 6px 12px; font-size: 12px;">✏️ Edit</button>
            <button class="delete" onclick="deleteFolder('${folder.id}')" style="padding: 6px 12px; font-size: 12px;">🗑️ Delete</button>
            <button onclick="closeFolderSidebar()" style="padding: 6px 12px; font-size: 16px;">×</button>
        </div>
    `;
    
    // Build sidebar content
    let contentHtml = '';
    
    // Show subfolders first if they exist
    if (subfolders.length > 0) {
        contentHtml += '<div style="margin-bottom: 20px;"><h4 style="color: #a78bfa; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid rgba(139, 92, 246, 0.2); padding-bottom: 8px;">📂 Subfolders</h4>';
        
        subfolders.forEach(subfolder => {
            const subfolderContent = allContent.filter(c => c.folder_id === subfolder.id);
            const subfolderURL = subfolder.custom_url || subfolder.slug;
            
            contentHtml += `
                <div class="subfolder-card" onclick="openFolderSidebar('${subfolder.id}')" style="background: rgba(40, 40, 40, 0.5); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-size: 24px;">📂</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #ffffff; font-size: 14px;">${escapeHtml(subfolder.title)}</div>
                            <div style="font-size: 11px; color: #808080;">${subfolderContent.length} item${subfolderContent.length !== 1 ? 's' : ''} • ${subfolderURL}</div>
                        </div>
                        <div style="color: #8b5cf6; font-size: 18px;">→</div>
                    </div>
                </div>
            `;
        });
        
        contentHtml += '</div>';
    }
    
    // Show content items
    if (folderContent.length === 0 && subfolders.length === 0) {
        contentHtml += '<p style="color: #999; text-align: center; padding: 40px 20px;">No content or subfolders yet.<br><br>Use the "Add PDF/Flipbook" form above to add content.</p>';
    } else if (folderContent.length > 0) {
        contentHtml += '<div><h4 style="color: #a78bfa; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid rgba(139, 92, 246, 0.2); padding-bottom: 8px;">📄 Content Items</h4>';
        
        folderContent.forEach((content, index) => {
            // For flipbooks, show web view image instead of thumbnail container
            let thumbnailHtml;
            if (content.type === 'flipbook') {
                thumbnailHtml = content.thumbnail_url 
                    ? `<img src="${content.thumbnail_url}" style="width: 100%; max-width: 150px; height: auto; border-radius: 8px; object-fit: cover;" alt="Thumbnail">`
                    : `<div style="width: 100%; max-width: 150px; height: 200px; background: #ddd; display: flex; align-items: center; justify-content: center; color: #999; font-size: 48px; border-radius: 8px;">📖</div>`;
            } else {
                thumbnailHtml = content.thumbnail_url 
                    ? `<img src="${content.thumbnail_url}" class="content-thumbnail" alt="Thumbnail">`
                    : `<div class="content-thumbnail" style="background: #ddd; display: flex; align-items: center; justify-content: center; color: #999; font-size: 24px;">${getTypeIcon(content.type)}</div>`;
            }
            
            const canMoveUp = index > 0;
            const canMoveDown = index < folderContent.length - 1;
            const isInteractive = content.project_json ? ' 📖 Interactive' : '';
            
            // For flipbooks, add "Click to view flipbook" link
            let viewFlipbookLink = '';
            if (content.type === 'flipbook' && content.url) {
                viewFlipbookLink = `<div class="content-meta" style="margin-top: 8px;"><a href="flipbook-viewer.html?manifest=${encodeURIComponent(content.url)}" target="_blank" style="color: #8b5cf6; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;"><span style="font-size: 18px;">📖</span> Click to view flipbook</a></div>`;
            }
            
            contentHtml += `
                <div class="content-card" style="margin-bottom: 10px;">
                    ${thumbnailHtml}
                    <div class="content-info">
                        <div class="content-title">${escapeHtml(content.title)}${isInteractive}</div>
                        <div class="content-meta">Type: ${content.type.toUpperCase()} | Views: ${content.view_count || 0}</div>
                        <div class="content-meta">🔗 URL: <strong style="color: #007bff;">${content.custom_url || content.slug || 'auto-generated'}</strong></div>
                        ${content.url ? `<div class="content-meta">📄 File: <a href="${truncateURL(content.url)}" target="_blank" style="color: #007bff;">${truncateURL(content.url)}</a></div>` : '<div class="content-meta" style="color: #dc3545;">⚠️ No file URL (Missing)</div>'}
                        ${content.description ? `<div class="content-meta">${escapeHtml(content.description)}</div>` : ''}
                        ${viewFlipbookLink}
                    </div>
                    <div class="content-actions">
                        ${canMoveUp ? `<button onclick="moveContentUp('${content.id}')">↑</button>` : ''}
                        ${canMoveDown ? `<button onclick="moveContentDown('${content.id}')">↓</button>` : ''}
                        <button onclick="editContent('${content.id}')">Edit</button>
                        <button class="delete" onclick="deleteContent('${content.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        
        contentHtml += '</div>';
    }
    
    sidebarContent.innerHTML = contentHtml;
    
    // Show sidebar
    sidebar.classList.add('active');
}

function closeFolderSidebar() {
    document.getElementById('folderSidebar').classList.remove('active');
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
    console.log('toggleDebug called, current debugMode:', debugMode);
    debugMode = !debugMode;
    const panel = document.getElementById('debugPanel');
    console.log('Debug panel element:', panel);
    
    if (panel) {
        panel.classList.toggle('active', debugMode);
        console.log('Debug mode toggled to:', debugMode);
        
        if (debugMode) {
            updateDebugPanel();
        }
    } else {
        console.error('Debug panel element not found!');
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

// ==================== PASSWORD MANAGEMENT ====================

async function managePasswords(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    document.getElementById('passwordFolderId').value = folderId;
    document.getElementById('passwordModal').classList.add('active');
    
    // Load existing passwords
    await loadFolderPasswords(folderId);
    
    // Generate initial password
    generateNewPassword();
}

async function loadFolderPasswords(folderId) {
    const container = document.getElementById('passwordsList');
    container.innerHTML = '<p style="color: #999;">Loading passwords...</p>';
    
    try {
        const { data, error } = await supabaseClient.client
            .from('folder_passwords')
            .select('*')
            .eq('folder_id', folderId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="color: #999;">No passwords created yet.</p>';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        data.forEach(pwd => {
            const expiryText = pwd.expires_at 
                ? `Expires: ${new Date(pwd.expires_at).toLocaleDateString()}`
                : 'No expiration';
            const userText = pwd.user_identifier || 'No user specified';
            
            html += `
                <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; border-left: 4px solid #e74c3c;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">🔑 ${pwd.password_plain || '••••••••'}</div>
                            <div style="font-size: 12px; color: #666;">👤 ${userText}</div>
                            <div style="font-size: 12px; color: #666;">📅 ${expiryText}</div>
                            <div style="font-size: 11px; color: #999; margin-top: 4px;">Created: ${new Date(pwd.created_at).toLocaleDateString()}</div>
                        </div>
                        <button onclick="deactivatePassword('${pwd.id}')" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Deactivate</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading passwords:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Error loading passwords</p>';
    }
}

function generateNewPassword() {
    const password = PasswordUtils.generatePassword(12);
    document.getElementById('newPasswordValue').value = password;
}

async function saveNewPassword() {
    const folderId = document.getElementById('passwordFolderId').value;
    const password = document.getElementById('newPasswordValue').value;
    const userIdentifier = document.getElementById('newPasswordUser').value;
    const expiresAt = document.getElementById('newPasswordExpiry').value;
    
    if (!password) {
        alert('Please generate a password first');
        return;
    }
    
    try {
        const passwordHash = await PasswordUtils.hashPassword(password);
        
        const { data, error } = await supabaseClient.client
            .from('folder_passwords')
            .insert({
                folder_id: folderId,
                password_hash: passwordHash,
                password_plain: password, // Store plain for admin view (remove in production)
                user_identifier: userIdentifier || null,
                expires_at: expiresAt || null,
                is_active: true
            })
            .select();
        
        if (error) throw error;
        
        alert(`✅ Password created successfully!\n\nPassword: ${password}\nUser: ${userIdentifier || 'Not specified'}\n\nShare this password with the user.`);
        
        // Reload passwords list
        await loadFolderPasswords(folderId);
        
        // Reset form
        document.getElementById('newPasswordUser').value = '';
        document.getElementById('newPasswordExpiry').value = '';
        generateNewPassword();
        
    } catch (error) {
        console.error('Error saving password:', error);
        alert('Failed to save password: ' + error.message);
    }
}

async function deactivatePassword(passwordId) {
    if (!confirm('Deactivate this password? Users will no longer be able to access the folder with it.')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient.client
            .from('folder_passwords')
            .update({ is_active: false })
            .eq('id', passwordId);
        
        if (error) throw error;
        
        alert('✅ Password deactivated');
        
        // Reload passwords list
        const folderId = document.getElementById('passwordFolderId').value;
        await loadFolderPasswords(folderId);
        
    } catch (error) {
        console.error('Error deactivating password:', error);
        alert('Failed to deactivate password: ' + error.message);
    }
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

// ==================== UTILITY FUNCTIONS ====================

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
