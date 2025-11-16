# ☁️ Cloudflare R2 Complete Setup Guide

## Why You Need This

**Problem:** Vercel has limits, Supabase has limits  
**Solution:** Store files in Cloudflare R2 (unlimited, cheap, fast CDN)

**Your Architecture:**
```
Vercel (hosting) → Supabase (database) → Cloudflare R2 (file storage)
```

---

## 🎯 What Gets Stored Where

### Vercel (Static Hosting)
- ✅ admin.html, library.html
- ✅ JavaScript files (admin-core.js, etc.)
- ✅ CSS files
- ❌ NO PDF/video files

### Supabase (Database)
- ✅ Folder metadata (titles, slugs)
- ✅ Content metadata (titles, descriptions)
- ✅ File URLs (pointing to R2)
- ❌ NO actual file content

### Cloudflare R2 (File Storage)
- ✅ PDFs (any size)
- ✅ Videos (any size)
- ✅ Images
- ✅ Audio files
- ✅ Unlimited storage

---

## 📋 Step-by-Step Setup

### Step 1: Create Cloudflare R2 Bucket

1. **Go to Cloudflare Dashboard**
   - https://dash.cloudflare.com

2. **Navigate to R2**
   - Click "R2" in left sidebar
   - Click "Create bucket"

3. **Create Bucket**
   ```
   Bucket name: 3c-library-files
   Location: Automatic (or choose closest to your users)
   ```

4. **Note Your Account ID**
   - Found in R2 overview page
   - Example: `a1b2c3d4e5f6g7h8i9j0`

### Step 2: Create R2 API Token

1. **In R2 Dashboard**
   - Click "Manage R2 API Tokens"
   - Click "Create API Token"

2. **Configure Token**
   ```
   Token name: 3c-library-upload
   Permissions: 
   - ✅ Object Read & Write
   Bucket: 3c-library-files (or All buckets)
   TTL: Forever
   ```

3. **Save Credentials**
   ```
   Access Key ID: xxxxxxxxxxxxxxxxxxxx
   Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```
   
   ⚠️ **IMPORTANT:** Save these now! You can't see them again.

### Step 3: Configure R2 Public Access

1. **In your bucket settings**
   - Click "Settings" tab
   - Scroll to "Public Access"

2. **Option A: R2.dev Domain (Easy)**
   ```
   Enable: Allow Access
   Domain: https://pub-xxxxx.r2.dev
   ```
   
   ✅ Free, instant, works immediately

3. **Option B: Custom Domain (Professional)**
   ```
   Add custom domain: files.3c-library.org
   ```
   
   Requires:
   - Domain in Cloudflare
   - DNS configuration
   - SSL certificate (automatic)

**For now, use Option A (R2.dev domain)**

### Step 4: Add Secrets to GitHub

1. **Go to GitHub Repository**
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"

2. **Add These Secrets:**
   ```
   Name: SUPABASE_URL
   Value: https://your-project.supabase.co

   Name: SUPABASE_KEY
   Value: your-anon-key-here

   Name: R2_ACCOUNT_ID
   Value: your-account-id-from-step-1

   Name: R2_ACCESS_KEY_ID
   Value: your-access-key-from-step-2

   Name: R2_SECRET_ACCESS_KEY
   Value: your-secret-key-from-step-2

   Name: R2_BUCKET_NAME
   Value: 3c-library-files
   ```

### Step 5: Deploy Cloudflare Worker

**You need a Worker to handle uploads from the browser.**

1. **Create Worker**
   - Go to Cloudflare Dashboard
   - Click "Workers & Pages"
   - Click "Create Application"
   - Click "Create Worker"
   - Name it: `3c-library-upload`

2. **Copy Worker Code**
   
   Copy the code from `cloudflare-worker.js` file

3. **Paste into Worker Editor**
   - Replace the default code
   - Click "Save and Deploy"

4. **Bind R2 Bucket to Worker**
   - In Worker settings, click "Settings" tab
   - Scroll to "R2 Bucket Bindings"
   - Click "Add binding"
   ```
   Variable name: R2_BUCKET
   R2 bucket: 3c-library-files
   ```
   - Click "Save"

5. **Add Environment Variables**
   - Still in Settings
   - Scroll to "Environment Variables"
   - Add variable:
   ```
   Variable name: R2_PUBLIC_URL
   Value: https://pub-xxxxx.r2.dev (your R2 public URL from Step 3)
   ```

6. **Get Worker URL**
   - Your worker URL will be:
   ```
   https://3c-library-upload.your-subdomain.workers.dev
   ```
   - Copy this URL

### Step 6: Update config.js

1. **Open config.js in your project**

2. **Update R2 configuration:**
   ```javascript
   r2: {
       publicUrl: 'https://pub-xxxxx.r2.dev', // Your R2 public URL
       uploadEndpoint: 'https://3c-library-upload.your-subdomain.workers.dev/upload', // Your Worker URL
       maxFileSize: 100 * 1024 * 1024,
       // ... rest stays the same
   }
   ```

3. **Save the file**

---

## 🎯 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UPLOAD FLOW                               │
└─────────────────────────────────────────────────────────────┘

1. User uploads PDF in admin.html
   ↓
2. admin-core.js calls r2Storage.uploadContent(file)
   ↓
3. r2-storage.js sends file to Cloudflare Worker
   POST https://3c-library-upload.your-subdomain.workers.dev/upload
   ↓
4. Worker receives file and uploads to R2 bucket
   ↓
5. Worker returns public URL
   https://pub-xxxxx.r2.dev/content/pdf/1699999999-abc123.pdf
   ↓
6. admin-core.js saves URL to Supabase
   INSERT INTO content_public (url, ...) VALUES ('https://pub-xxxxx.r2.dev/...')
   ↓
7. Public library reads URL from Supabase
   ↓
8. Browser loads PDF from R2 CDN
```

---

## 📊 What Gets Stored Where (Final)

### Vercel
```
✅ admin.html (2 KB)
✅ library.html (30 KB)
✅ admin-core.js (23 KB)
✅ config.js (1 KB)
Total: ~100 KB of static files
```

### Supabase
```
✅ Folder: "Anica Coffee Break Chats"
   - id, title, slug, table_name

✅ Content: "Episode 1"
   - id, title, slug
   - url: "https://pub-xxxxx.r2.dev/content/pdf/episode-01.pdf"
   - thumbnail_url: "https://pub-xxxxx.r2.dev/thumbnails/thumb-01.jpg"
   
❌ NO actual file content
Total: ~10 KB per content item (just metadata)
```

### Cloudflare R2
```
✅ /content/pdf/episode-01.pdf (50 MB)
✅ /content/pdf/episode-02.pdf (75 MB)
✅ /content/video/session-01.mp4 (500 MB)
✅ /thumbnails/thumb-01.jpg (200 KB)
Total: Unlimited storage, pay per GB
```

---

## 💰 Cost Breakdown

### Vercel (Free Tier)
- ✅ 100 GB bandwidth/month
- ✅ Unlimited static files
- ✅ No credit card required
- **Cost: $0**

### Supabase (Free Tier)
- ✅ 500 MB database
- ✅ 1 GB file storage (not used for PDFs)
- ✅ 2 GB bandwidth
- **Cost: $0**

### Cloudflare R2
- ✅ 10 GB storage/month FREE
- ✅ Unlimited egress (downloads) FREE
- ✅ 1 million Class A operations FREE
- After free tier: $0.015/GB/month
- **Cost: ~$0-5/month** (depending on usage)

**Total: $0-5/month for unlimited PDFs/videos!**

---

## ✅ Testing the Setup

### Test 1: Upload a Small PDF

1. Open admin panel
2. Create a test folder
3. Upload a small PDF (< 5 MB)
4. Check browser console for:
   ```
   ✅ Uploading file to R2...
   ✅ File uploaded: https://pub-xxxxx.r2.dev/...
   ✅ Content saved
   ```

### Test 2: View in Public Library

1. Open public library
2. Navigate to your folder
3. Click on the PDF
4. PDF should load from R2 URL
5. Check Network tab - should see request to `pub-xxxxx.r2.dev`

### Test 3: Upload Large File

1. Upload a 50 MB PDF
2. Should upload successfully (no Supabase limits!)
3. Verify it loads in public library

---

## 🐛 Troubleshooting

### Error: "Upload failed"

**Check:**
1. Worker is deployed and running
2. R2 bucket binding is correct (variable name: `R2_BUCKET`)
3. Worker URL in config.js is correct
4. CORS is enabled in worker (already in code)

**Test Worker:**
```bash
curl -X POST https://your-worker-url.workers.dev/upload \
  -F "file=@test.pdf" \
  -F "folder=test" \
  -F "type=content"
```

### Error: "CORS policy"

**Fix:** Update worker code line 10:
```javascript
'Access-Control-Allow-Origin': 'https://3c-content-library.vercel.app',
```

### Error: "R2 bucket not found"

**Check:**
1. Bucket name is correct: `3c-library-files`
2. Binding variable name is: `R2_BUCKET`
3. Worker has access to bucket

### Files Upload But Don't Display

**Check:**
1. R2 public access is enabled
2. Public URL in config.js is correct
3. URL saved in Supabase is accessible
4. Check browser console for CORS errors

---

## 📋 Post-Setup Checklist

- [ ] R2 bucket created
- [ ] R2 API token created and saved
- [ ] R2 public access enabled
- [ ] Cloudflare Worker deployed
- [ ] R2 bucket bound to Worker
- [ ] Environment variables set in Worker
- [ ] GitHub Secrets added (for screenshot workflow)
- [ ] config.js updated with URLs
- [ ] Test upload successful
- [ ] Test viewing in public library
- [ ] Large file test (50+ MB)

---

## 🚀 Ready to Push to GitHub

Once you complete the R2 setup:

1. **Update config.js** with your actual URLs
2. **Commit all files:**
   ```bash
   git add .
   git commit -m "Add Cloudflare R2 storage integration"
   git push origin main
   ```

3. **Vercel will auto-deploy** your updated site

---

## 📚 Summary

### Your Complete Architecture:

```
User Browser
    ↓
Vercel (Static Hosting)
    ├── admin.html → Upload files
    └── library.html → View content
    ↓
Cloudflare Worker
    └── Handles file uploads
    ↓
Cloudflare R2
    └── Stores actual files (PDFs, videos)
    ↓
Supabase
    └── Stores metadata + R2 URLs
    ↓
User Browser
    └── Loads files from R2 CDN
```

### Benefits:
- ✅ No Vercel limits (static files only)
- ✅ No Supabase limits (just URLs, not files)
- ✅ Unlimited file storage in R2
- ✅ Free CDN delivery worldwide
- ✅ Fast, scalable, professional

---

**You're ready to store unlimited PDFs and videos!** 🎉

