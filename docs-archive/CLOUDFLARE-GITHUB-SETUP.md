# 🚀 Cloudflare Worker Setup via GitHub (Simplified)

Since you've already connected your GitHub repository to Cloudflare, this is the **easiest way** to deploy your worker!

---

## 📋 What You Need

1. ✅ GitHub repository (you already have this)
2. ✅ Cloudflare account (you already have this)
3. ✅ GitHub connected to Cloudflare (you already did this)
4. ⏳ R2 bucket created (we'll do this)

---

## Step 1: Create R2 Bucket (5 minutes)

### 1.1 Go to R2 in Cloudflare Dashboard
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** in the left sidebar
3. Click **Create bucket**

### 1.2 Configure Bucket
- **Bucket name**: `3c-library-files`
- **Location**: Choose closest to your users (or leave default)
- Click **Create bucket**

### 1.3 Enable Public Access
1. Click on your bucket `3c-library-files`
2. Go to **Settings** tab
3. Scroll to **Public access**
4. Click **Allow Access**
5. Click **Connect Domain** (optional, or use the R2.dev domain)

**Copy the public URL** - it will look like:
```
https://pub-xxxxxxxxxxxxx.r2.dev
```

---

## Step 2: Deploy Worker from GitHub (3 minutes)

### 2.1 Create Worker
1. In Cloudflare Dashboard, click **Workers & Pages** in left sidebar
2. Click **Create application**
3. Click **Create Worker**
4. Give it a name: `3c-library-upload`
5. Click **Deploy**

### 2.2 Connect to GitHub
1. After worker is created, click **Settings** tab
2. Scroll to **Build configuration**
3. Click **Connect to Git**
4. Select your repository: `personal-website-2`
5. Set **Root directory**: `Dashboard-library`
6. Click **Save**

### 2.3 Bind R2 Bucket to Worker
1. Still in Worker Settings, scroll to **Variables and Secrets**
2. Click **R2 Bucket Bindings**
3. Click **Add binding**
   - **Variable name**: `R2_BUCKET`
   - **R2 bucket**: Select `3c-library-files`
4. Click **Save**

### 2.4 Add Environment Variable
1. Still in **Variables and Secrets**
2. Click **Environment Variables**
3. Click **Add variable**
   - **Variable name**: `R2_PUBLIC_URL`
   - **Value**: Your R2 public URL (from Step 1.3)
   - Example: `https://pub-xxxxxxxxxxxxx.r2.dev`
4. Click **Save**

### 2.5 Get Worker URL
Your worker is now deployed! The URL will be:
```
https://3c-library-upload.YOUR-SUBDOMAIN.workers.dev
```

Copy this URL - you'll need it for the next step.

---

## Step 3: Update Your Config File (2 minutes)

### 3.1 Edit config.js
Open `Dashboard-library/config.js` and update these lines:

```javascript
r2: {
    publicUrl: 'https://pub-xxxxxxxxxxxxx.r2.dev',  // ← Your R2 public URL
    uploadEndpoint: 'https://3c-library-upload.YOUR-SUBDOMAIN.workers.dev/upload',  // ← Your worker URL
    // ... rest stays the same
}
```

### 3.2 Commit and Push
```bash
cd Dashboard-library
git add config.js wrangler.toml
git commit -m "Configure Cloudflare Worker and R2"
git push origin main
```

Cloudflare will automatically redeploy your worker!

---

## Step 4: Test Upload (2 minutes)

### 4.1 Open Admin Panel
1. Go to your admin panel: `https://your-site.vercel.app/admin.html`
2. Create a test folder
3. Try uploading a small PDF

### 4.2 Check Upload
If successful, you should see:
- ✅ File uploaded to R2
- ✅ URL appears in the form
- ✅ Content saved to Supabase

---

## 🎯 Summary

**What we did:**
1. ✅ Created R2 bucket for file storage
2. ✅ Deployed Worker from GitHub (no manual code editing!)
3. ✅ Connected Worker to R2 bucket
4. ✅ Updated config with URLs

**What happens now:**
- When you push to GitHub → Cloudflare auto-deploys worker
- When you upload in admin → File goes to R2 via worker
- When user views library → Files load from R2

---

## 🔧 Troubleshooting

### "Worker not found" error
- Check worker URL is correct in `config.js`
- Make sure worker is deployed (check Workers dashboard)

### "Upload failed" error
- Check R2 bucket binding is correct
- Check R2_PUBLIC_URL environment variable is set
- Check bucket has public access enabled

### "CORS error"
- Worker already has CORS headers configured
- Make sure you're using the correct worker URL

---

## 📝 Important URLs to Save

Write these down:

1. **R2 Public URL**: `https://pub-xxxxxxxxxxxxx.r2.dev`
2. **Worker URL**: `https://3c-library-upload.YOUR-SUBDOMAIN.workers.dev`
3. **Admin Panel**: `https://your-site.vercel.app/admin.html`
4. **Public Library**: `https://your-site.vercel.app/library.html`

---

## 🎉 That's It!

You now have:
- ✅ Automatic worker deployment from GitHub
- ✅ File uploads to R2 storage
- ✅ Public file access via R2 CDN
- ✅ No manual worker code editing needed!

Every time you push to GitHub, Cloudflare automatically updates your worker.

---

## 🚀 Next Steps

After this works:
1. Test uploading different file types (PDF, images, videos)
2. Check files appear in library
3. Verify files load correctly
4. Add more content!

---

**Need help?** Check the Cloudflare Workers dashboard for logs and errors.
