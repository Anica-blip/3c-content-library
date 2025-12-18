/**
 * Screenshot Generator for External URLs
 * Uses 'screenshots' table to track generation status
 * Requires: Node.js 20+
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const AWS = require('aws-sdk');
const fs = require('fs');

// ==================== CONFIGURATION ====================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '3c-library-files';

const LOG_FILE = 'screenshot-logs.txt';
const MAX_RETRIES = 3;
const SCREENSHOT_TIMEOUT = 30000; // 30 seconds

// ==================== LOGGING ====================
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(LOG_FILE, logMessage);
}

// ==================== VALIDATION ====================
function validateEnvironment() {
    const required = [
        { name: 'SUPABASE_URL', value: SUPABASE_URL },
        { name: 'SUPABASE_SERVICE_KEY', value: SUPABASE_SERVICE_KEY },
        { name: 'R2_ACCOUNT_ID', value: R2_ACCOUNT_ID },
        { name: 'R2_ACCESS_KEY_ID', value: R2_ACCESS_KEY_ID },
        { name: 'R2_SECRET_ACCESS_KEY', value: R2_SECRET_ACCESS_KEY }
    ];

    const missing = required.filter(env => !env.value);
    
    if (missing.length > 0) {
        log('❌ Missing required environment variables:');
        missing.forEach(env => {
            log(`   - ${env.name}`);
        });
        log('\n📝 Add these in: GitHub repo → Settings → Secrets and variables → Actions');
        log('   SUPABASE_URL → Variables');
        log('   All others → Secrets');
        process.exit(1);
    }

    // Check Node.js version
    const nodeVersion = parseInt(process.version.split('.')[0].replace('v', ''));
    if (nodeVersion < 20) {
        log(`❌ Node.js 20+ required (current: ${process.version})`);
        process.exit(1);
    }

    log('✅ Environment validation passed');
}

// ==================== MAIN FUNCTION ====================
async function main() {
    log('🚀 Screenshot generator starting...');
    log(`   Node.js: ${process.version}`);
    log(`   Bucket: ${R2_BUCKET_NAME}`);
    
    validateEnvironment();
    
    try {
        // Initialize Supabase with service_role key
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
        log('✅ Supabase client initialized (service_role)');
        
        // Fetch pending screenshots from screenshots table
        const { data: screenshots, error: fetchError } = await supabase
            .from('screenshots')
            .select('*')
            .eq('status', 'pending')
            .lt('attempt_count', MAX_RETRIES)
            .order('created_at', { ascending: true })
            .limit(10); // Process 10 at a time
        
        if (fetchError) {
            log(`❌ Error fetching screenshots: ${fetchError.message}`);
            log('   Hint: Run screenshots-table-setup.sql in Supabase SQL Editor');
            process.exit(1);
        }
        
        log(`📄 Found ${screenshots.length} pending screenshots`);
        
        if (screenshots.length === 0) {
            log('✅ No screenshots to process');
            return;
        }
        
        // Launch browser
        log('🌐 Launching headless browser...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        log('✅ Browser ready');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process each screenshot
        for (const item of screenshots) {
            try {
                log(`\n📸 Processing [${item.content_id}]: ${item.external_url}`);
                
                // Update status to processing
                await supabase
                    .from('screenshots')
                    .update({ 
                        status: 'processing',
                        attempt_count: item.attempt_count + 1
                    })
                    .eq('id', item.id);
                
                // Capture screenshot
                const screenshotBuffer = await captureScreenshot(browser, item.external_url);
                
                if (!screenshotBuffer) {
                    throw new Error('Failed to capture screenshot');
                }
                
                // Upload to R2
                const thumbnailUrl = await uploadToR2(screenshotBuffer, item.content_id);
                
                if (!thumbnailUrl) {
                    throw new Error('Failed to upload to R2');
                }
                
                // Update screenshots table with success
                const { error: updateError } = await supabase
                    .from('screenshots')
                    .update({ 
                        status: 'completed',
                        thumbnail_url: thumbnailUrl,
                        last_error: null
                    })
                    .eq('id', item.id);
                
                if (updateError) {
                    throw new Error(`Database update failed: ${updateError.message}`);
                }
                
                log(`   ✅ Success: ${thumbnailUrl}`);
                successCount++;
                
                // Rate limiting
                await sleep(2000);
                
            } catch (error) {
                log(`   ❌ Error: ${error.message}`);
                
                // Update screenshots table with failure
                await supabase
                    .from('screenshots')
                    .update({ 
                        status: item.attempt_count + 1 >= MAX_RETRIES ? 'failed' : 'pending',
                        last_error: error.message
                    })
                    .eq('id', item.id);
                
                errorCount++;
            }
        }
        
        await browser.close();
        log('\n🌐 Browser closed');
        
        // Summary
        log(`\n${'='.repeat(50)}`);
        log('📊 SUMMARY');
        log(`${'='.repeat(50)}`);
        log(`   ✅ Success: ${successCount}`);
        log(`   ❌ Errors:  ${errorCount}`);
        log(`   📝 Total:   ${screenshots.length}`);
        log(`${'='.repeat(50)}`);
        log('🎉 Screenshot generator completed');
        
    } catch (error) {
        log(`❌ Fatal error: ${error.message}`);
        log(`   Stack: ${error.stack}`);
        process.exit(1);
    }
}

// ==================== SCREENSHOT CAPTURE ====================
async function captureScreenshot(browser, url) {
    let page = null;
    
    try {
        page = await browser.newPage();
        
        // Set viewport for consistent screenshots
        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1
        });
        
        // Set user agent to avoid bot detection
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        log(`   🌍 Navigating to: ${url}`);
        
        // Navigate with timeout
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: SCREENSHOT_TIMEOUT
        });
        
        // Wait for dynamic content
        await sleep(3000);
        
        log('   📷 Capturing screenshot...');
        
        // Take screenshot
        const screenshotBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 85,
            fullPage: false
        });
        
        log(`   ✅ Captured (${screenshotBuffer.length} bytes)`);
        
        return screenshotBuffer;
        
    } catch (error) {
        log(`   ⚠️ Capture failed: ${error.message}`);
        return null;
    } finally {
        if (page) {
            await page.close();
        }
    }
}

// ==================== R2 UPLOAD ====================
async function uploadToR2(screenshotBuffer, contentId) {
    try {
        log('   ☁️ Uploading to R2...');
        
        const s3 = new AWS.S3({
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
            signatureVersion: 'v4',
            region: 'auto'
        });
        
        const fileName = `thumbnails/auto-${contentId}-${Date.now()}.jpg`;
        
        const params = {
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: screenshotBuffer,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000' // 1 year cache
        };
        
        await s3.upload(params).promise();
        
        // Return public URL matching Chef's infrastructure
        const publicUrl = `https://api.3c-public-library.org/files/${fileName}`;
        log(`   ✅ Uploaded: ${publicUrl}`);
        
        return publicUrl;
        
    } catch (error) {
        log(`   ❌ R2 upload failed: ${error.message}`);
        return null;
    }
}

// ==================== UTILITY ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== RUN ====================
main().catch(error => {
    log(`❌ Unhandled error: ${error.message}`);
    log(`   Stack: ${error.stack}`);
    process.exit(1);
});
