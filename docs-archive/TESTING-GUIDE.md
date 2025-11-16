# 🧪 Testing Guide - Enhanced 3C Library

## Overview
This guide will help you test all the new features step by step.

---

## 📋 Prerequisites

### 1. Supabase Setup
- [ ] Run `supabase-schema.sql` in Supabase SQL Editor
- [ ] Verify tables created: `folders`, `content`, `user_interactions`
- [ ] Copy Supabase URL and anon key

### 2. Cloudflare R2 Setup (Optional for testing)
- [ ] R2 bucket created
- [ ] Worker deployed
- [ ] Public domain configured

### 3. Local Server
```bash
cd /home/acer/CascadeProjects/personal-website-2/Dashboard-library
python3 -m http.server 8000
```

---

## 🎯 Testing Checklist

### Phase 1: Admin Dashboard - Basic Functionality

#### 1.1 Supabase Connection
- [ ] Open `http://localhost:8000/admin.html`
- [ ] Enter Supabase URL and Key
- [ ] Click "Connect"
- [ ] Should see green indicator and success message
- [ ] Click "Test Connection"
- [ ] Should see "Connection test successful"

**Expected Result:** ✅ Connected status, stats show 0/0/0

#### 1.2 Create Folders
- [ ] Enter folder title: "Getting Started"
- [ ] Enter description: "Introduction guides"
- [ ] Click "Create Folder"
- [ ] Should see success message
- [ ] Folder appears in "Manage Folders" section
- [ ] Check URL slug: should be "getting-started"

**Create more folders:**
- [ ] "Tutorials" → slug: "tutorials"
- [ ] "Reference" → slug: "reference"
- [ ] "Getting Started" (duplicate) → slug: "getting-started-01"

**Expected Result:** ✅ 4 folders created with auto-incremented slugs

#### 1.3 Edit Folder
- [ ] Click "Edit" on any folder
- [ ] Modal opens with folder data
- [ ] Change title to "Getting Started Guide"
- [ ] Click "Update Folder"
- [ ] Should see success message
- [ ] Folder title updated in list
- [ ] Check slug updated: "getting-started-guide"

**Expected Result:** ✅ Folder updated, slug regenerated

#### 1.4 Delete Folder
- [ ] Create a test folder: "Test Delete"
- [ ] Click "Delete" on test folder
- [ ] Confirm deletion
- [ ] Folder removed from list

**Expected Result:** ✅ Folder deleted

---

### Phase 2: Admin Dashboard - Content Management

#### 2.1 Add Content with File Upload (Base64 Fallback)
- [ ] Select folder: "Getting Started Guide"
- [ ] Title: "Welcome PDF"
- [ ] Type: PDF
- [ ] Upload a small PDF file (< 5MB)
- [ ] Add description: "Welcome guide"
- [ ] Click "💾 Save Content"
- [ ] Should see success message
- [ ] Form resets automatically
- [ ] Content appears in "Manage Content" section

**Expected Result:** ✅ Content saved, form reset, appears in list

#### 2.2 Add Content with External URL
- [ ] Select folder: "Tutorials"
- [ ] Title: "YouTube Tutorial"
- [ ] Type: Video
- [ ] File URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- [ ] Tech URL: `https://docs.example.com/tutorial`
- [ ] Description: "Video tutorial"
- [ ] Click "💾 Save Content"

**Expected Result:** ✅ Content saved with both URLs

#### 2.3 Add Content with Thumbnail
- [ ] Select folder: "Reference"
- [ ] Title: "API Documentation"
- [ ] Type: Link
- [ ] File URL: `https://example.com/api-docs`
- [ ] Upload thumbnail image
- [ ] Preview shows thumbnail
- [ ] Click "💾 Save Content"

**Expected Result:** ✅ Content saved with thumbnail

#### 2.4 Edit Content
- [ ] Click "Edit" on any content
- [ ] Form fills with content data
- [ ] Button changes to "💾 Update Content"
- [ ] Change title
- [ ] Click "💾 Update Content"
- [ ] Should see "Content updated" message
- [ ] Form resets
- [ ] Changes reflected in list

**Expected Result:** ✅ Content updated, form reset

#### 2.5 Reorder Content
- [ ] Filter by a folder with multiple items
- [ ] Click "↑" on second item
- [ ] Item moves up
- [ ] Click "↓" on first item
- [ ] Item moves down

**Expected Result:** ✅ Content reordered

#### 2.6 Delete Content
- [ ] Click "Delete" on any content
- [ ] Confirm deletion
- [ ] Content removed from list
- [ ] Folder item count decreases

**Expected Result:** ✅ Content deleted

---

### Phase 3: Admin Dashboard - Advanced Features

#### 3.1 Debug Panel
- [ ] Click "🐛 Debug" button (top-right)
- [ ] Debug panel appears on right side
- [ ] Shows current state (folders, content counts)
- [ ] Perform any action (create folder, add content)
- [ ] Debug log updates with operation details
- [ ] Click "🐛 Debug" again to hide

**Expected Result:** ✅ Debug panel toggles, shows logs

#### 3.2 Statistics
- [ ] Check stats at top: Folders, Content Items, Total Views
- [ ] Should match actual counts
- [ ] Create new folder
- [ ] Stats update automatically

**Expected Result:** ✅ Stats accurate and update in real-time

#### 3.3 Filter Content
- [ ] In "Manage Content", select "Filter by Folder"
- [ ] Choose a specific folder
- [ ] Only content from that folder shows
- [ ] Select "All Folders"
- [ ] All content shows again

**Expected Result:** ✅ Filtering works correctly

---

### Phase 4: Public Library - Basic Display

#### 4.1 View All Content
- [ ] Open `http://localhost:8000/library-enhanced.html`
- [ ] Folders appear in left sidebar
- [ ] All content displays in grid view
- [ ] Each card shows:
  - Thumbnail or type icon
  - Type badge
  - Title
  - Description
  - View count

**Expected Result:** ✅ All content displays correctly

#### 4.2 Folder Navigation
- [ ] Click on a folder in sidebar
- [ ] Folder highlights (blue background)
- [ ] Content title changes to folder name
- [ ] Only content from that folder shows
- [ ] Click another folder
- [ ] Content updates

**Expected Result:** ✅ Folder navigation works

#### 4.3 View Toggle
- [ ] Click "List" button
- [ ] View changes to list layout
- [ ] Click "Grid" button
- [ ] View changes back to grid

**Expected Result:** ✅ View toggle works

#### 4.4 Dark Mode
- [ ] Click moon icon (🌙)
- [ ] Interface switches to dark mode
- [ ] Refresh page
- [ ] Dark mode persists
- [ ] Click moon icon again
- [ ] Switches back to light mode

**Expected Result:** ✅ Dark mode toggles and persists

---

### Phase 5: Public Library - Content Viewing

#### 5.1 Open PDF
- [ ] Click on a PDF content card
- [ ] PDF viewer modal opens
- [ ] PDF loads and displays
- [ ] Page navigation works (← →)
- [ ] Zoom controls work (+ -)
- [ ] Page info shows correctly
- [ ] Close with × or Escape key

**Expected Result:** ✅ PDF viewer works

#### 5.2 PDF Link Detection
- [ ] Open a PDF with hyperlinks
- [ ] Links highlighted with blue overlay
- [ ] Hover over link - overlay brightens
- [ ] Click link
- [ ] Link opens in draggable modal (not new tab)
- [ ] Modal can be dragged by header
- [ ] Click outside modal to close

**Expected Result:** ✅ PDF links open in modal

#### 5.3 Video Playback
- [ ] Click on video content
- [ ] Media player modal opens
- [ ] YouTube video embeds correctly
- [ ] Video plays
- [ ] Close modal

**Expected Result:** ✅ Video playback works

#### 5.4 Image Display
- [ ] Click on image content
- [ ] Media player modal opens
- [ ] Image displays
- [ ] Close modal

**Expected Result:** ✅ Image display works

#### 5.5 External Link
- [ ] Click on link-type content
- [ ] Opens in new tab
- [ ] If has tech URL, prompt appears
- [ ] Click "OK" to open tech URL in modal

**Expected Result:** ✅ Links work correctly

---

### Phase 6: Public Library - Advanced Features

#### 6.1 Direct Content Link
- [ ] Copy a content ID from Supabase
- [ ] Open `http://localhost:8000/library-enhanced.html?content=CONTENT_ID`
- [ ] Only that content displays
- [ ] Folder navigation hidden
- [ ] Content auto-opens

**Expected Result:** ✅ Direct content link works

#### 6.2 Folder Link
- [ ] Get folder slug from admin
- [ ] Open `http://localhost:8000/library-enhanced.html?folder=SLUG`
- [ ] Only that folder's content displays
- [ ] Folder highlighted in nav

**Expected Result:** ✅ Folder link works

#### 6.3 View Count Tracking
- [ ] Note current view count on a content item
- [ ] Click to open it
- [ ] Close and refresh page
- [ ] View count increased by 1
- [ ] Check in admin dashboard
- [ ] View count updated there too

**Expected Result:** ✅ View tracking works

#### 6.4 Last Page Memory (PDF)
- [ ] Open a PDF
- [ ] Navigate to page 5
- [ ] Close PDF viewer
- [ ] Reopen same PDF
- [ ] Should open at page 5

**Expected Result:** ✅ Last page remembered

#### 6.5 Keyboard Shortcuts (PDF)
- [ ] Open PDF viewer
- [ ] Press → (right arrow) - next page
- [ ] Press ← (left arrow) - previous page
- [ ] Press + - zoom in
- [ ] Press - - zoom out
- [ ] Press Escape - close viewer

**Expected Result:** ✅ All shortcuts work

---

### Phase 7: GitHub Actions (Optional)

#### 7.1 Setup Secrets
In GitHub repository settings, add secrets:
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_KEY`
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`

#### 7.2 Manual Trigger
- [ ] Go to Actions tab
- [ ] Select "Generate Screenshots for External URLs"
- [ ] Click "Run workflow"
- [ ] Wait for completion
- [ ] Check logs
- [ ] Verify screenshots uploaded to R2
- [ ] Check Supabase - thumbnail_url updated

**Expected Result:** ✅ Screenshots generated and uploaded

#### 7.3 Scheduled Run
- [ ] Wait for next scheduled run (2 AM UTC)
- [ ] Or change cron schedule for testing
- [ ] Verify automatic execution

**Expected Result:** ✅ Cron job runs automatically

---

## 🐛 Common Issues & Solutions

### Issue: Supabase connection fails
**Solution:**
- Verify URL and key are correct
- Check Supabase project is active
- Verify RLS policies are enabled
- Check browser console for errors

### Issue: R2 upload fails
**Solution:**
- Verify R2 credentials in config.js
- Check Worker is deployed and bound
- Test Worker health endpoint
- Falls back to base64 automatically

### Issue: PDF viewer doesn't load
**Solution:**
- Check PDF.js CDN is accessible
- Verify PDF URL is valid and accessible
- Check browser console for CORS errors
- Try a different PDF

### Issue: Links in PDF not detected
**Solution:**
- Not all PDFs have link annotations
- Try a PDF with hyperlinks
- Check browser console for errors

### Issue: Screenshots not generating
**Solution:**
- Verify GitHub secrets are set
- Check Actions logs for errors
- Verify Puppeteer can access URLs
- Check R2 credentials

---

## 📊 Performance Testing

### Load Testing
- [ ] Create 10+ folders
- [ ] Add 50+ content items
- [ ] Test admin dashboard performance
- [ ] Test public library loading speed
- [ ] Check database query performance

### Mobile Testing
- [ ] Test admin on mobile device
- [ ] Test public library on mobile
- [ ] Test PDF viewer on mobile
- [ ] Test touch gestures (swipe for pages)
- [ ] Test responsive layout

---

## ✅ Success Criteria

All features should work as expected:
- ✅ Folders create with auto-slugs
- ✅ Content saves as individual records
- ✅ Form resets after save
- ✅ Edit mode updates existing records
- ✅ External URLs supported
- ✅ Debug panel functional
- ✅ Public library displays correctly
- ✅ PDF viewer with link detection
- ✅ Links open in draggable modal
- ✅ View tracking works
- ✅ Last page memory works
- ✅ Dark mode works
- ✅ GitHub Actions generates screenshots

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________

Phase 1: Admin Basic       [ ] Pass  [ ] Fail
Phase 2: Content Mgmt      [ ] Pass  [ ] Fail
Phase 3: Advanced Features [ ] Pass  [ ] Fail
Phase 4: Public Display    [ ] Pass  [ ] Fail
Phase 5: Content Viewing   [ ] Pass  [ ] Fail
Phase 6: Advanced Public   [ ] Pass  [ ] Fail
Phase 7: GitHub Actions    [ ] Pass  [ ] Fail

Issues Found:
1. ___________
2. ___________
3. ___________

Overall: [ ] Pass  [ ] Fail
```

---

## 🚀 After Testing

Once all tests pass:
1. Deploy to production
2. Update documentation
3. Train users
4. Monitor performance
5. Gather feedback

---

**Happy Testing! 🎉**
