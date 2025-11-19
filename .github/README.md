# GitHub Screenshot Generator

Automated screenshot generation for external URLs in the 3C Library using GitHub Actions.

## 🚀 Features

- Automatically captures screenshots of external URLs
- Uploads screenshots to Cloudflare R2 storage
- Updates Supabase database with thumbnail URLs
- Runs daily via GitHub Actions
- Node.js 20+ compatible

## 📋 Prerequisites

- GitHub repository with Actions enabled
- Supabase project
- Cloudflare R2 bucket (optional, for storage)

## 🔧 Setup Instructions

### 1. Repository Structure

The files should be organized as follows:
```
.github/
├── scripts/
│   └── generate-screenshots.js
└── workflows/
    └── generate-screenshots.yml
```

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

#### Required Secrets:
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

#### Optional Secrets (for R2 upload):
- `R2_ACCOUNT_ID` - Your Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key ID
- `R2_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_BUCKET_NAME` - R2 bucket name (defaults to `3c-library-files`)

### 3. How to Add Secrets

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret"
3. Enter the name (e.g., `SUPABASE_URL`)
4. Paste the value
5. Click "Add secret"
6. Repeat for all required secrets

### 4. Finding Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on "Settings" (gear icon)
3. Go to "API" section
4. Copy:
   - **Project URL** → Use for `SUPABASE_URL`
   - **anon/public key** → Use for `SUPABASE_ANON_KEY`

### 5. Finding Your R2 Credentials (Optional)

1. Log in to Cloudflare dashboard
2. Go to R2 → Overview
3. Your Account ID is shown in the sidebar
4. Go to "Manage R2 API Tokens"
5. Create a new API token with read/write permissions
6. Copy the Access Key ID and Secret Access Key

## 🎯 Usage

### Automatic Execution
The workflow runs automatically every day at 2 AM UTC.

### Manual Execution
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Generate Screenshots for External URLs"
4. Click "Run workflow"
5. Click the green "Run workflow" button

## 📊 How It Works

1. **Fetch**: Queries Supabase for content with `external_url` but no `thumbnail_url`
2. **Capture**: Uses Puppeteer to take screenshots (1280x720, JPEG)
3. **Upload**: Uploads screenshots to Cloudflare R2
4. **Update**: Updates Supabase with the thumbnail URL

## 🐛 Troubleshooting

### Error: "Missing Supabase credentials"
- **Cause**: GitHub secrets not configured
- **Fix**: Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets (see Setup Instructions above)

### Error: "Node.js 18 and below are deprecated"
- **Cause**: Using old Node.js version
- **Fix**: Already fixed - workflow uses Node.js 20

### Error: "Missing R2 credentials"
- **Cause**: R2 secrets not configured (this is just a warning)
- **Fix**: Add R2 secrets if you want to upload screenshots, or ignore if not needed

### Workflow not running
- **Cause**: Workflow file not in correct location
- **Fix**: Ensure `generate-screenshots.yml` is in `.github/workflows/` directory

## 📝 Logs

After each run, logs are uploaded as artifacts:
1. Go to Actions tab
2. Click on the workflow run
3. Download "screenshot-logs" artifact

## 🔒 Security Notes

- Never commit secrets to the repository
- Use GitHub Secrets for all sensitive data
- The `SUPABASE_ANON_KEY` is safe to use in client-side code
- R2 credentials should be kept secure

## 📦 Dependencies

- `puppeteer` - Headless browser for screenshots
- `@supabase/supabase-js` - Supabase client
- `aws-sdk` - For R2 uploads (S3-compatible)

## 🔄 Customization

### Change Schedule
Edit `.github/workflows/generate-screenshots.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Change this cron expression
```

### Change Screenshot Settings
Edit `.github/scripts/generate-screenshots.js`:
```javascript
await page.setViewport({
  width: 1280,    // Change width
  height: 720,    // Change height
  deviceScaleFactor: 1
});
```

## 📄 License

This project is part of the 3C Library system.
