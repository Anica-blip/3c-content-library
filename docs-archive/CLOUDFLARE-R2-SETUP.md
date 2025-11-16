# Cloudflare R2 Setup Guide for 3C Public Library

## 🎯 Overview

This guide will help you set up Cloudflare R2 storage for your library files. R2 is like Amazon S3 but with **zero egress fees** - perfect for serving files to the public!

**Benefits:**
- ✅ No bandwidth charges (unlike S3)
- ✅ $0.015/GB storage (very cheap)
- ✅ Fast global CDN
- ✅ Unlimited file sizes
- ✅ Professional file hosting

---

## 📋 Prerequisites

- Cloudflare account (free tier works!)
- Domain: `3c-public-library.org` (already set up)
- Credit card for R2 (required even for free tier, but won't be charged unless you exceed free limits)

**Free Tier Limits:**
- 10 GB storage/month
- 1 million Class A operations/month
- 10 million Class B operations/month
- **Zero egress fees** (this is the big win!)

---

## 🚀 Step-by-Step Setup

### Step 1: Create R2 Bucket

1. **Log in to Cloudflare Dashboard**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Select your account

2. **Navigate to R2**
   - Click **"R2"** in the left sidebar
   - Click **"Create bucket"**

3. **Configure Bucket**
   - **Bucket name:** `3c-library-files`
   - **Location:** Automatic (or choose closest region)
   - Click **"Create bucket"**

4. **Bucket Created!** ✅
   - You should see your new bucket in the list

---

### Step 2: Enable Public Access

1. **Open Bucket Settings**
   - Click on your `3c-library-files` bucket



   - Go to **"Settings"** tab

2. **Connect Custom Domain**
   - Scroll to **"Public access"** section
   - Click **"Connect domain"**
   - Enter: `files.3c-public-library.org`
   - Click **"Continue"**

3. **DNS Configuration**
   - Cloudflare will automatically add DNS records
   - Wait 1-2 minutes for DNS propagation
   - Your files will be accessible at: `https://files.3c-public-library.org/filename.pdf`

4. **Verify Public Access**
   - Upload a test file (see Step 4)
   - Try accessing it via the public URL
   - Should work without authentication!

---

### Step 3: Create API Tokens

You need API credentials for the Worker to upload files.

1. **Go to R2 API Tokens**
   - In R2 section, click **"Manage R2 API Tokens"**
   - Or go to: Account Home → R2 → API Tokens

2. **Create API Token**
   - Click **"Create API token"**
   - **Token name:** `3c-library-upload-token`
   - **Permissions:** 
     - ✅ Object Read & Write
     - ✅ Bucket Read
   - **Bucket:** Select `3c-library-files`
   - Click **"Create API token"**

3. **Save Credentials** ⚠️ IMPORTANT
   - You'll see three values:
     ```
     Access Key ID: abc123...
     Secret Access Key: xyz789...
     Account ID: your-account-id
     ```
   - **Copy these NOW** - you won't see them again!
   - Save them in a secure place (password manager)

---

### Step 4: Deploy Cloudflare Worker

The Worker handles file uploads from your admin dashboard.

1. **Create Worker**
   - Go to **"Workers & Pages"** in Cloudflare dashboard
   - Click **"Create application"**
   - Click **"Create Worker"**
   - **Name:** `3c-library-api`
   - Click **"Deploy"**

2. **Edit Worker Code**
   - Click **"Edit code"**
   - Delete the default code
   - Copy the entire contents of `worker-api.js` from this project
   - Paste it into the worker editor
   - Click **"Save and deploy"**

3. **Bind R2 Bucket to Worker**
   - Go back to worker overview
   - Click **"Settings"** tab
   - Scroll to **"Bindings"**
   - Click **"Add binding"**
   - **Type:** R2 bucket
   - **Variable name:** `R2_BUCKET` (must be exactly this!)
   - **R2 bucket:** Select `3c-library-files`
   - Click **"Save"**

4. **Add Custom Domain to Worker**
   - In worker settings, go to **"Triggers"** tab
   - Under **"Custom Domains"**, click **"Add Custom Domain"**
   - Enter: `api.3c-public-library.org`
   - Click **"Add Custom Domain"**
   - Wait for DNS propagation (1-2 minutes)

5. **Test Worker**
   - Open browser and go to: `https://api.3c-public-library.org/api/upload/health`
   - You should see: `{"status":"ok"}`
   - If you see this, your worker is working! ✅

---

### Step 5: Configure Your Application

1. **Update config.js**
   - Open `config.js` in your project
   - Update these values:
   ```javascript
   r2: {
       publicUrl: 'https://files.3c-public-library.org',
       uploadEndpoint: 'https://api.3c-public-library.org/api/upload',
       // ... rest stays the same
   }
   ```

2. **Save Changes**
   - Commit and push to GitHub (see GitHub setup guide)
   - Or upload directly to your hosting

---

### Step 6: Test File Upload

1. **Open Admin Dashboard**
   - Go to: `https://3c-public-library.org/admin.html`

2. **Try Uploading a File**
   - Create a test folder
   - Add content
   - Upload a small PDF (< 5MB for testing)
   - Click "Add Content"

3. **Verify Upload**
   - Check if content appears in library
   - Click on the content to view it
   - File should load from: `https://files.3c-public-library.org/...`

4. **Check R2 Dashboard**
   - Go back to Cloudflare → R2 → Your bucket
   - You should see the uploaded file listed
   - Verify file size and upload time

---

## 🔧 DNS Configuration Summary

You should have these DNS records in Cloudflare:

| Type | Name | Target | Status |
|------|------|--------|--------|
| CNAME | files.3c-public-library.org | R2 bucket | Auto-created |
| CNAME | api.3c-public-library.org | Worker | Auto-created |
| A/CNAME | 3c-public-library.org | Your hosting | Manual |
| CNAME | www.3c-public-library.org | 3c-public-library.org | Optional |

**Note:** The `files` and `api` subdomains are created automatically when you connect them in Steps 2 and 4.

---

## 📊 Understanding the Architecture

```
User Browser
    ↓
Admin Dashboard (admin.html)
    ↓
Cloudflare Worker (api.3c-public-library.org)
    ↓
R2 Bucket (3c-library-files)
    ↓
Public URL (files.3c-public-library.org)
    ↓
User Views Content
```

**Flow:**
1. User uploads file in admin dashboard
2. File sent to Cloudflare Worker API
3. Worker stores file in R2 bucket
4. Worker returns public URL
5. Admin saves URL to Supabase
6. Public users access file via public URL

---

## 💰 Cost Estimation

### Example: Small Library
- **Storage:** 5 GB
- **Monthly views:** 10,000 PDFs downloaded
- **Average file size:** 2 MB

**Costs:**
- Storage: 5 GB × $0.015 = $0.075/month
- Class A operations (uploads): ~100 × $0.0036/1000 = $0.0004
- Class B operations (downloads): 10,000 × $0.00036/1000 = $0.0036
- Egress: **$0** (this is the magic!)

**Total: ~$0.08/month** 🎉

### Example: Medium Library
- **Storage:** 50 GB
- **Monthly views:** 100,000 downloads
- **Average file size:** 5 MB

**Costs:**
- Storage: 50 GB × $0.015 = $0.75/month
- Operations: ~$0.05/month
- Egress: **$0**

**Total: ~$0.80/month** 🎉

**Compare to AWS S3:**
- Same usage would cost ~$50-100/month due to egress fees!

---

## 🛡️ Security Best Practices

### 1. Bucket Security
- ✅ Public read access (for files)
- ❌ No public write access (only via Worker)
- ✅ API tokens with minimal permissions

### 2. Worker Security
- ✅ CORS headers configured
- ✅ File type validation
- ✅ File size limits
- ✅ Unique filenames (prevents overwrites)

### 3. API Token Security
- ❌ Never commit tokens to GitHub
- ✅ Store in environment variables
- ✅ Use separate tokens for dev/prod
- ✅ Rotate tokens periodically

### 4. Content Security
- ✅ Validate file types before upload
- ✅ Scan for malware (optional, advanced)
- ✅ Set appropriate CORS policies
- ✅ Use HTTPS only

---

## 🚨 Troubleshooting

### Issue: "Worker not found" error

**Solution:**
1. Check worker is deployed
2. Verify custom domain is added
3. Wait 2-3 minutes for DNS propagation
4. Clear browser cache

### Issue: "Bucket not found" error

**Solution:**
1. Check R2 binding in worker settings
2. Variable name must be exactly `R2_BUCKET`
3. Bucket must be selected in binding
4. Redeploy worker after adding binding

### Issue: "CORS error" when uploading

**Solution:**
1. Check worker has CORS headers
2. Verify `Access-Control-Allow-Origin: *` is set
3. Check browser console for exact error
4. Try in incognito mode

### Issue: Files upload but can't be accessed

**Solution:**
1. Verify public domain is connected to bucket
2. Check DNS records are propagated
3. Try accessing file directly: `https://files.3c-public-library.org/test.pdf`
4. Check bucket permissions allow public read

### Issue: "413 Payload Too Large"

**Solution:**
1. Check file size (R2 supports up to 5TB per file)
2. Worker has 100MB limit - for larger files, use direct R2 upload
3. Consider chunked uploads for very large files

---

## 🎓 Advanced Features

### 1. Custom Upload Limits

Edit `config.js`:
```javascript
r2: {
    maxFileSize: 50 * 1024 * 1024, // 50MB limit
    // ...
}
```

### 2. Folder Organization

Files are automatically organized:
```
content/
  pdf/
    1234567890-abc123.pdf
  video/
    1234567890-xyz789.mp4
thumbnails/
  1234567890-thumb.jpg
```

### 3. File Versioning

To enable versioning:
1. Go to R2 bucket settings
2. Enable "Object versioning"
3. Previous versions kept automatically

### 4. Lifecycle Rules

Auto-delete old files:
1. Go to bucket settings
2. Add lifecycle rule
3. Example: Delete files older than 365 days

### 5. Analytics

Track usage:
1. Go to R2 dashboard
2. View "Analytics" tab
3. See requests, bandwidth, storage over time

---

## 📱 Mobile Optimization

R2 automatically optimizes delivery:
- ✅ Serves from nearest edge location
- ✅ Compresses responses when possible
- ✅ Caches frequently accessed files
- ✅ Supports range requests (for video streaming)

---

## 🔄 Migration from Base64

If you have existing base64-encoded files in localStorage:

1. **Export Current Data**
   - Open admin dashboard
   - Click "Export Library"
   - Save JSON file

2. **Upload Files to R2**
   - For each base64 file in JSON:
   - Decode base64 to file
   - Upload via admin dashboard
   - Update URL in database

3. **Script for Bulk Migration** (optional)
   - See `migration-script.js` (to be created)
   - Automates the conversion process

---

## 📞 Support Resources

### Cloudflare Documentation
- [R2 Overview](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)

### Community
- [Cloudflare Community](https://community.cloudflare.com/)
- [Discord Server](https://discord.gg/cloudflaredev)

### Pricing
- [R2 Pricing Calculator](https://www.cloudflare.com/products/r2/)

---

## ✅ Checklist

Before going live, verify:

- [ ] R2 bucket created: `3c-library-files`
- [ ] Public domain connected: `files.3c-public-library.org`
- [ ] API tokens created and saved securely
- [ ] Worker deployed: `3c-library-api`
- [ ] Worker domain: `api.3c-public-library.org`
- [ ] R2 bucket bound to worker as `R2_BUCKET`
- [ ] Worker health check returns `{"status":"ok"}`
- [ ] `config.js` updated with correct URLs
- [ ] Test file upload successful
- [ ] Test file accessible via public URL
- [ ] DNS records propagated (files & api subdomains)
- [ ] Supabase configured (see SUPABASE-SETUP.md)

---

## 🎉 You're Done!

Your library now has:
- ✅ Professional file hosting
- ✅ Zero bandwidth costs
- ✅ Global CDN delivery
- ✅ Unlimited file sizes
- ✅ Automatic backups (via Supabase)
- ✅ Production-ready infrastructure

**Next Steps:**
1. Set up GitHub for version control (see GITHUB-SETUP.md)
2. Deploy to production domain
3. Add your content!

---

**Questions?** Check the troubleshooting section or create an issue on GitHub.
