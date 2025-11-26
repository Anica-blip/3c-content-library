/**
 * Screenshot Generator for External URLs
 * Fetches content with external_url from Supabase, generates screenshots, uploads to R2
 * Node.js 20+ Compatible
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURATION ====================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '3c-library-files';

const LOG_FILE = 'screenshot-logs.txt';

// ==================== LOGGING ====================
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(LOG_FILE, logMessage);
}

// ==================== MAIN FUNCTION ====================
async function main() {
    log('🚀 Screenshot generator starting...');
    log(`Node.js version: ${process.version}`);
    
    // Validate environment variables
    if (!SUPABASE_URL) {
        log('❌ Missing SUPABASE_URL');
        process.exit(1);
    }
    
    // Determine which key to use - prioritize service role for GitHub Actions
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    const keyType = SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON';
    
    if (!supabaseKey) {
        log('❌ Missing both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY');
        log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
        log(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
        log(`   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
        process.exit(1);
    }
    
    log(`🔑 Using ${keyType} key for Supabase connection`);
    
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        log('⚠️ Missing R2 credentials - screenshots will not be uploaded');
    }
    
    try {
        // Initialize Supabase with the appropriate key
        const supabase = createClient(SUPABASE_URL, supabaseKey);
        log('✅ Supabase connected');
        
        // Fetch content with external_url and no thumbnail
        const { data: content, error } = await supabase
            .from('content')
            .select('*')
            .not('external_url', 'is', null)
            .is('thumbnail_url', null);
        
        if (error) {
            log('❌ Error fetching content: ' + error.message);
            process.exit(1);
        }
        
        log(`📄 Found ${content.length} items needing screenshots`);
        
        if (content.length === 0) {
            log('✅ No screenshots needed');
            return;
        }
        
        // Launch browser
        log('🌐 Launching browser...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        let successCount = 0;
        let errorCount = 0;
        
        // Process each item
        for (const item of content) {
            try {
                log(`📸 Processing: ${item.title} (${item.external_url})`);
                
                const screenshot = await captureScreenshot(browser, item.external_url);
                
                if (screenshot) {
                    // Upload to R2
                    const thumbnailUrl = await uploadToR2(screenshot, item.id);
                    
                    if (thumbnailUrl) {
                        // Update Supabase
                        const { error: updateError } = await supabase
                            .from('content')
                            .update({ thumbnail_url: thumbnailUrl })
                            .eq('id', item.id);
                        
                        if (updateError) {
                            log(`❌ Error updating ${item.title}: ${updateError.message}`);
                            errorCount++;
                        } else {
                            log(`✅ Updated ${item.title} with thumbnail`);
                            successCount++;
                        }
                    } else {
                        log(`❌ Failed to upload screenshot for ${item.title}`);
                        errorCount++;
                    }
                } else {
                    log(`❌ Failed to capture screenshot for ${item.title}`);
                    errorCount++;
                }
                
                // Wait between requests to avoid rate limiting
                await sleep(2000);
                
            } catch (error) {
                log(`❌ Error processing ${item.title}: ${error.message}`);
                errorCount++;
            }
        }
        
        await browser.close();
        
        log(`\n📊 Summary:`);
        log(`   ✅ Success: ${successCount}`);
        log(`   ❌ Errors: ${errorCount}`);
        log(`   📝 Total: ${content.length}`);
        log('🎉 Screenshot generator completed');
        
    } catch (error) {
        log('❌ Fatal error: ' + error.message);
        process.exit(1);
    }
}

// ==================== SCREENSHOT CAPTURE ====================
async function captureScreenshot(browser, url) {
    try {
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({
            width: 1280,
            height: 720,
            deviceScaleFactor: 1
        });
        
        // Set timeout
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait a bit for dynamic content
        await sleep(2000);
        
        // Take screenshot
        const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 80,
            fullPage: false
        });
        
        await page.close();
        
        return screenshot;
        
    } catch (error) {
        log(`   ⚠️ Screenshot error: ${error.message}`);
        return null;
    }
}

// ==================== R2 UPLOAD ====================
async function uploadToR2(screenshot, contentId) {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        log('   ⚠️ Skipping R2 upload - no credentials');
        return null;
    }
    
    try {
        // Use AWS SDK for S3-compatible R2
        const AWS = require('aws-sdk');
        
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
            Body: screenshot,
            ContentType: 'image/jpeg'
        };
        
        await s3.upload(params).promise();
        
        // Return public URL
        const publicUrl = `https://files.3c-public-library.org/${fileName}`;
        log(`   📤 Uploaded to: ${publicUrl}`);
        
        return publicUrl;
        
    } catch (error) {
        log(`   ❌ R2 upload error: ${error.message}`);
        return null;
    }
}

// ==================== UTILITY ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== RUN ====================
main().catch(error => {
    log('❌ Unhandled error: ' + error.message);
    process.exit(1);
});
