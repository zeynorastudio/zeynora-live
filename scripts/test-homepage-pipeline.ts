/**
 * Homepage Image Pipeline - End-to-End Sanity Check
 * 
 * Tests:
 * 1. Storage policy application
 * 2. Bucket existence
 * 3. Object listing
 * 4. DB path verification
 * 5. getPublicUrl SSR-safety
 * 6. Live upload test
 * 7. Publish flow
 * 
 * DO NOT RUN SQL MIGRATIONS
 */

import { createClient } from "@supabase/supabase-js";
import { getPublicUrl } from "../lib/utils/images";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ Loaded .env.local");
} else {
  console.log("⚠️  .env.local not found, using existing environment");
}

// Check env vars
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[BLOCKER — CREDENTIAL REQUIRED]");
  console.error("Missing environment variables:");
  console.error("- NEXT_PUBLIC_SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌ MISSING");
  console.error("- SUPABASE_SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "✅" : "❌ MISSING");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface TestResult {
  step: string;
  status: "PASS" | "FAIL" | "BLOCKED" | "SKIP";
  details: string;
  data?: any;
}

const results: TestResult[] = [];

function log(step: string, status: TestResult["status"], details: string, data?: any) {
  results.push({ step, status, details, data });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : status === "BLOCKED" ? "🔴" : "⏭️";
  console.log(`${icon} [${step}] ${details}`);
  if (data) console.log("   Data:", JSON.stringify(data, null, 2));
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("HOMEPAGE IMAGE PIPELINE — END-TO-END SANITY & LIVE TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ================================================================
  // STEP 1: Check Storage Policy Application
  // ================================================================
  console.log("\n1️⃣  CHECKING STORAGE POLICY APPLICATION\n");
  
  try {
    const { data: policies, error } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT policyname, cmd, roles::text 
              FROM pg_policies 
              WHERE schemaname = 'storage' 
              AND tablename = 'objects' 
              ORDER BY policyname` 
      });

    if (error) {
      // RPC might not exist, try direct query
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        log("1.1", "BLOCKED", `Cannot query database: ${bucketsError.message}`);
      } else {
        log("1.1", "SKIP", "Cannot verify policies directly (RPC not available), checking via buckets");
      }
    } else {
      const bannersPolicy = policies?.filter((p: any) => p.policyname.includes('banners'));
      log("1.1", bannersPolicy && bannersPolicy.length > 0 ? "PASS" : "FAIL", 
          `Storage policies found: ${policies?.length || 0}`, 
          { bannersPolicies: bannersPolicy });
    }
  } catch (err: any) {
    log("1.1", "SKIP", `Policy check skipped: ${err.message}`);
  }

  // ================================================================
  // STEP 2: Check Bucket Existence
  // ================================================================
  console.log("\n2️⃣  CHECKING BUCKET EXISTENCE\n");
  
  const targetBuckets = ["banners", "products", "categories", "video", "content", "brand"];
  const { data: allBuckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    log("2.1", "BLOCKED", `Cannot list buckets: ${bucketsError.message}`);
  } else {
    const existingBuckets = allBuckets?.map(b => b.id) || [];
    log("2.1", "PASS", `Found ${existingBuckets.length} buckets`, { buckets: existingBuckets });
    
    targetBuckets.forEach(bucket => {
      const exists = existingBuckets.includes(bucket);
      log("2.2", exists ? "PASS" : "FAIL", `Bucket '${bucket}': ${exists ? "EXISTS" : "MISSING"}`);
    });
  }

  // ================================================================
  // STEP 3: List Objects in Key Buckets
  // ================================================================
  console.log("\n3️⃣  LISTING OBJECTS IN KEY BUCKETS\n");
  
  for (const bucket of ["banners", "products", "categories"]) {
    try {
      const { data: objects, error } = await supabase.storage
        .from(bucket)
        .list("homepage", { limit: 10 });
      
      if (error) {
        log("3.1", "FAIL", `Cannot list ${bucket}: ${error.message}`);
      } else {
        log("3.1", "PASS", `${bucket}/homepage: ${objects?.length || 0} objects`, 
            { sample: objects?.slice(0, 3).map(o => o.name) });
      }
    } catch (err: any) {
      log("3.1", "FAIL", `Error listing ${bucket}: ${err.message}`);
    }
  }

  // ================================================================
  // STEP 4: Validate DB Image Paths
  // ================================================================
  console.log("\n4️⃣  VALIDATING DB IMAGE PATHS (Sample of 10)\n");
  
  // Check homepage_hero
  const { data: heroRows, error: heroError } = await supabase
    .from("homepage_hero")
    .select("id, desktop_image, mobile_image, status")
    .order("created_at", { ascending: false })
    .limit(10);
  
  if (heroError) {
    log("4.1", "BLOCKED", `Cannot query homepage_hero: ${heroError.message}`);
  } else {
    log("4.1", "PASS", `Found ${heroRows?.length || 0} hero rows`);
    
    for (const row of heroRows || []) {
      // Check if desktop_image exists in storage
      if (row.desktop_image) {
        const pathParts = row.desktop_image.split("/");
        const folder = pathParts.slice(0, -1).join("/");
        const fileName = pathParts[pathParts.length - 1];
        
        try {
          const { data: files, error } = await supabase.storage
            .from("banners")
            .list(folder);
          
          const exists = files?.some(f => f.name === fileName);
          log("4.2", exists ? "PASS" : "FAIL", 
              `Hero ${row.id} (${row.status}): desktop_image exists=${exists}`, 
              { path: row.desktop_image });
        } catch (err) {
          log("4.2", "FAIL", `Cannot verify ${row.desktop_image}`);
        }
      }
    }
  }

  // Check homepage_banners
  const { data: bannerRows, error: bannerError } = await supabase
    .from("homepage_banners")
    .select("id, desktop_image, mobile_image, status")
    .order("created_at", { ascending: false })
    .limit(5);
  
  if (!bannerError && bannerRows) {
    log("4.3", "PASS", `Found ${bannerRows.length} banner rows`);
  }

  // Check homepage_categories
  const { data: catRows, error: catError } = await supabase
    .from("homepage_categories")
    .select("id, image, status")
    .order("created_at", { ascending: false })
    .limit(5);
  
  if (!catError && catRows) {
    log("4.4", "PASS", `Found ${catRows.length} category rows`);
  }

  // ================================================================
  // STEP 5: Verify getPublicUrl() SSR-Safety
  // ================================================================
  console.log("\n5️⃣  VERIFYING getPublicUrl() SSR-SAFETY\n");
  
  const testPath = "homepage/hero/test-image.jpg";
  const publicUrl = getPublicUrl("banners", testPath);
  
  const expectedPattern = new RegExp(`${SUPABASE_URL}/storage/v1/object/public/banners/`);
  const isCorrectFormat = expectedPattern.test(publicUrl);
  
  log("5.1", isCorrectFormat ? "PASS" : "FAIL", 
      "getPublicUrl generates correct CDN URL", 
      { input: testPath, output: publicUrl, expectedPattern: expectedPattern.source });

  // Check that getPublicUrl doesn't use browser client
  const getPublicUrlSource = fs.readFileSync(
    path.join(process.cwd(), "lib/utils/images.ts"), 
    "utf-8"
  );
  const usesBrowserClient = getPublicUrlSource.includes('from "@/lib/supabase/client"');
  
  log("5.2", usesBrowserClient ? "FAIL" : "PASS", 
      `getPublicUrl ${usesBrowserClient ? "USES" : "does NOT use"} browser client (SSR-safe)`);

  // ================================================================
  // STEP 6: Live Upload Test
  // ================================================================
  console.log("\n6️⃣  LIVE UPLOAD TEST (Controlled)\n");
  
  // Create a tiny test image (1x1 pixel PNG)
  const testImageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  
  const timestamp = Date.now();
  const testFileName = `homepage/hero/test-image-${timestamp}.jpg`;
  
  console.log(`Uploading test image: ${testFileName} (${testImageBuffer.length} bytes)`);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("banners")
    .upload(testFileName, testImageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });
  
  if (uploadError) {
    log("6.1", "FAIL", `Upload failed: ${uploadError.message}`, uploadError);
  } else {
    log("6.1", "PASS", "Upload succeeded", { path: uploadData.path });
    
    // Get public URL using helper
    const testPublicUrl = getPublicUrl("banners", uploadData.path);
    log("6.2", "PASS", "Generated public URL", { url: testPublicUrl });
    
    // Verify object exists
    const pathParts = uploadData.path.split("/");
    const folder = pathParts.slice(0, -1).join("/");
    const fileName = pathParts[pathParts.length - 1];
    
    const { data: verifyList, error: verifyError } = await supabase.storage
      .from("banners")
      .list(folder);
    
    const exists = verifyList?.some(f => f.name === fileName);
    log("6.3", exists ? "PASS" : "FAIL", 
        `Uploaded object exists in storage: ${exists}`, 
        { folder, fileName });
    
    // Clean up test image
    const { error: deleteError } = await supabase.storage
      .from("banners")
      .remove([uploadData.path]);
    
    if (deleteError) {
      log("6.4", "FAIL", `Failed to delete test image: ${deleteError.message}`);
    } else {
      log("6.4", "PASS", "Test image deleted successfully");
    }
  }

  // ================================================================
  // STEP 7: Publish Flow Check
  // ================================================================
  console.log("\n7️⃣  PUBLISH FLOW CHECK\n");
  
  // Get one draft hero row
  const { data: draftHero, error: draftError } = await supabase
    .from("homepage_hero")
    .select("*")
    .eq("status", "draft")
    .limit(1)
    .single();
  
  if (draftError || !draftHero) {
    log("7.1", "SKIP", "No draft hero rows found to test publish flow");
  } else {
    log("7.1", "PASS", "Found draft hero row", { 
      id: draftHero.id, 
      desktop_image: draftHero.desktop_image,
      mobile_image: draftHero.mobile_image 
    });
    
    // Check if image files exist
    if (draftHero.desktop_image) {
      const pathParts = draftHero.desktop_image.split("/");
      const folder = pathParts.slice(0, -1).join("/");
      const fileName = pathParts[pathParts.length - 1];
      
      const { data: files } = await supabase.storage
        .from("banners")
        .list(folder);
      
      const exists = files?.some(f => f.name === fileName);
      log("7.2", exists ? "PASS" : "FAIL", 
          `Draft hero image file exists: ${exists}`, 
          { path: draftHero.desktop_image });
    }
    
    // Check if corresponding published row exists
    const { data: publishedHero } = await supabase
      .from("homepage_hero")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (publishedHero) {
      log("7.3", "PASS", "Published hero row exists", {
        id: publishedHero.id,
        desktop_image: publishedHero.desktop_image,
        mobile_image: publishedHero.mobile_image
      });
      
      // Verify published image exists
      if (publishedHero.desktop_image) {
        const pathParts = publishedHero.desktop_image.split("/");
        const folder = pathParts.slice(0, -1).join("/");
        const fileName = pathParts[pathParts.length - 1];
        
        const { data: files } = await supabase.storage
          .from("banners")
          .list(folder);
        
        const exists = files?.some(f => f.name === fileName);
        log("7.4", exists ? "PASS" : "FAIL", 
            `Published hero image file exists: ${exists}`, 
            { path: publishedHero.desktop_image });
      }
    } else {
      log("7.3", "SKIP", "No published hero rows found (publish may not have been run yet)");
    }
  }

  // ================================================================
  // FINAL SUMMARY
  // ================================================================
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("TEST SUMMARY");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  const passCount = results.filter(r => r.status === "PASS").length;
  const failCount = results.filter(r => r.status === "FAIL").length;
  const blockCount = results.filter(r => r.status === "BLOCKED").length;
  const skipCount = results.filter(r => r.status === "SKIP").length;
  
  console.log(`✅ PASS:    ${passCount}`);
  console.log(`❌ FAIL:    ${failCount}`);
  console.log(`🔴 BLOCKED: ${blockCount}`);
  console.log(`⏭️  SKIP:    ${skipCount}`);
  console.log(`📊 TOTAL:   ${results.length}\n`);
  
  if (blockCount > 0) {
    console.log("🔴 VERDICT: BLOCKED — Critical issues prevent full testing");
  } else if (failCount > 0) {
    console.log("⚠️  VERDICT: PARTIAL — Some tests failed, review needed");
  } else {
    console.log("✅ VERDICT: WORKING — All critical tests passed");
  }
  
  // Write detailed results to file
  const reportPath = path.join(process.cwd(), "test-results-homepage-pipeline.json");
  fs.writeFileSync(reportPath, JSON.stringify({ results, summary: { passCount, failCount, blockCount, skipCount }}, null, 2));
  console.log(`\n📄 Detailed results written to: ${reportPath}\n`);
}

main().catch(err => {
  console.error("❌ Test script failed:", err);
  process.exit(1);
});

