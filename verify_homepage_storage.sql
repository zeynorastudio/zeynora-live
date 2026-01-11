-- Verification Script for Homepage Image Storage Pipeline
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check if banners bucket exists and is public
SELECT 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets 
WHERE id IN ('banners', 'products', 'categories');

-- Expected: All 3 buckets should exist with public = true


-- 2. Check storage policies for banners bucket
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%banners%' 
    OR policyname LIKE '%products%'
    OR policyname LIKE '%categories%'
  )
ORDER BY policyname;

-- Expected: Should see policies for service_role (INSERT, UPDATE, DELETE) and public (SELECT)


-- 3. Check uploaded images in banners bucket
SELECT 
  name,
  bucket_id,
  created_at,
  updated_at,
  last_accessed_at,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type
FROM storage.objects 
WHERE bucket_id = 'banners'
  AND name LIKE 'homepage/%'
ORDER BY created_at DESC 
LIMIT 20;

-- Expected: Should see uploaded hero, category, and banner images


-- 4. Check homepage_hero table with images
SELECT 
  id,
  title,
  desktop_image,
  mobile_image,
  status,
  visible,
  order_index,
  created_at
FROM homepage_hero 
ORDER BY order_index, created_at DESC
LIMIT 10;

-- Expected: See hero slides with both desktop_image and mobile_image paths


-- 5. Check homepage_categories with images
SELECT 
  hc.id,
  hc.image,
  c.name as category_name,
  hc.status,
  hc.visible,
  hc.order_index
FROM homepage_categories hc
LEFT JOIN categories c ON c.id = hc.category_id
ORDER BY hc.order_index
LIMIT 10;

-- Expected: See category tiles with image paths


-- 6. Check homepage_banners with images
SELECT 
  id,
  title,
  desktop_image,
  mobile_image,
  link,
  status,
  visible,
  order_index,
  created_at
FROM homepage_banners 
ORDER BY order_index, created_at DESC
LIMIT 10;

-- Expected: See banners with both desktop_image and mobile_image paths


-- 7. Verify draft vs published counts
SELECT 
  'hero' as section,
  status,
  COUNT(*) as count
FROM homepage_hero
GROUP BY status
UNION ALL
SELECT 
  'categories' as section,
  status,
  COUNT(*)
FROM homepage_categories
GROUP BY status
UNION ALL
SELECT 
  'banners' as section,
  status,
  COUNT(*)
FROM homepage_banners
GROUP BY status
ORDER BY section, status;

-- Expected: See counts for both 'draft' and 'published' status


-- 8. Test public URL generation for a sample image
-- (Replace with actual image path from your uploads)
SELECT 
  name as storage_path,
  concat(
    current_setting('app.settings.supabase_url', true),
    '/storage/v1/object/public/',
    bucket_id,
    '/',
    name
  ) as public_url
FROM storage.objects 
WHERE bucket_id = 'banners'
  AND name LIKE 'homepage/%'
LIMIT 5;

-- Expected: Should see full public URLs that match the format used in getPublicUrl


-- 9. Check for any orphaned images (not referenced in DB)
WITH used_images AS (
  SELECT desktop_image as path FROM homepage_hero
  UNION
  SELECT mobile_image FROM homepage_hero WHERE mobile_image IS NOT NULL
  UNION
  SELECT image FROM homepage_categories
  UNION
  SELECT desktop_image FROM homepage_banners
  UNION
  SELECT mobile_image FROM homepage_banners WHERE mobile_image IS NOT NULL
)
SELECT 
  o.name,
  o.created_at,
  CASE 
    WHEN ui.path IS NULL THEN 'ORPHANED (not in DB)'
    ELSE 'IN USE'
  END as status
FROM storage.objects o
LEFT JOIN used_images ui ON o.name = ui.path
WHERE o.bucket_id = 'banners'
  AND o.name LIKE 'homepage/%'
ORDER BY o.created_at DESC
LIMIT 20;

-- Expected: Most images should be 'IN USE'. Some 'ORPHANED' is OK if you deleted items.


-- 10. Final Status Summary
SELECT 
  'BUCKETS CONFIGURED' as check_item,
  COUNT(*) as count,
  CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM storage.buckets 
WHERE id IN ('banners', 'products', 'categories') AND public = true

UNION ALL

SELECT 
  'STORAGE POLICIES',
  COUNT(DISTINCT policyname),
  CASE WHEN COUNT(DISTINCT policyname) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%banners%'

UNION ALL

SELECT 
  'HERO IMAGES UPLOADED',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '⚠️ NO DATA' END
FROM homepage_hero

UNION ALL

SELECT 
  'PUBLISHED HERO SLIDES',
  COUNT(*),
  CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '⚠️ NOT PUBLISHED YET' END
FROM homepage_hero 
WHERE status = 'published';

-- Expected: All checks should PASS (except published if you haven't published yet)



















