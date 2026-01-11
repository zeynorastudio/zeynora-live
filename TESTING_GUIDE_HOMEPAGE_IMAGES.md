# Homepage Image Pipeline - Testing Guide

This guide will walk you through testing the complete homepage image upload and rendering pipeline.

---

## 🔧 PREREQUISITES

### 1. Apply Database Migrations

Open Supabase SQL Editor and run these files in order:

1. **Storage Policies for Banners:**
   ```sql
   -- Copy content from: supabase/migrations/20251201000000_storage_policies_banners.sql
   -- Paste and run in Supabase SQL Editor
   ```

2. **Storage Policies for All Buckets:**
   ```sql
   -- Copy content from: supabase/migrations/20251201000100_storage_policies_all_buckets.sql
   -- Paste and run in Supabase SQL Editor
   ```

### 2. Verify Environment Variables

Check your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Restart Development Server

```bash
# Kill existing process and restart
npm run dev
```

### 4. Run Verification Script

In Supabase SQL Editor:
```sql
-- Copy and run: verify_homepage_storage.sql
-- This checks if buckets, policies, and data are set up correctly
```

---

## 📸 TEST SEQUENCE

### TEST 1: Hero Image Upload

#### Steps:
1. Navigate to `http://localhost:3000/admin/super/homepage`
2. Login as super admin if needed
3. Go to **Hero** tab
4. Click **Upload Slide** button
5. Select a landscape image (recommended: 1920x1080 or 2560x1440)
6. Wait for upload to complete

#### Expected Results:
- ✅ Upload spinner shows briefly
- ✅ New slide appears in the list immediately
- ✅ Slide shows thumbnail preview
- ✅ No error messages in console
- ✅ In Supabase Storage, check `banners/homepage/hero/`:
  - Should see `{timestamp}-{filename}.jpg` (desktop)
  - Should see `{timestamp}-{filename}-mobile.jpg` (mobile crop)

#### Success Criteria:
```
✅ Desktop image uploaded: banners/homepage/hero/1733097600000-hero-image.jpg
✅ Mobile image uploaded: banners/homepage/hero/1733097600000-hero-image-mobile.jpg
✅ Database record created with both paths
```

---

### TEST 2: Preview Mode (Draft)

#### Steps:
1. After uploading hero image, click **Preview** button (top right)
2. New tab opens with `/?preview=1`
3. Observe the homepage

#### Expected Results:
- ✅ Hero carousel displays uploaded image
- ✅ Image is sharp and clear (not broken/404)
- ✅ On mobile viewport (resize browser), mobile-cropped image shows
- ✅ No console errors
- ✅ Network tab shows images loading from:
  ```
  https://[project].supabase.co/storage/v1/object/public/banners/homepage/hero/...
  ```

#### Success Criteria:
```
✅ Desktop: Shows full landscape image
✅ Mobile (< 768px): Shows 9:12 portrait crop
✅ No 403 or 404 errors
✅ Carousel auto-advances after 6 seconds
```

---

### TEST 3: Category Tile Upload

#### Steps:
1. Go back to admin: `/admin/super/homepage`
2. Click **Categories** tab
3. Click **+ Add Category Tile**
4. Select a category from dropdown
5. Click **Upload Image**
6. Select a square-ish image (recommended: 800x800 or 1000x1000)
7. Confirm upload

#### Expected Results:
- ✅ Upload succeeds
- ✅ Category tile appears with image preview
- ✅ In Supabase Storage: `banners/homepage/categories/{timestamp}-{filename}`
- ✅ Database `homepage_categories` table has new row with `image` field

#### Success Criteria:
```
✅ Image uploaded to correct path
✅ Category name shows on tile
✅ Hover effect works (image scales slightly)
✅ Click opens category page (or custom URL if set)
```

---

### TEST 4: Banner Upload

#### Steps:
1. Click **Banners** tab
2. Click **Add Banner** button
3. Upload a wide banner image (recommended: 1920x600 or 2560x800)
4. Wait for upload

#### Expected Results:
- ✅ Desktop and mobile variants upload
- ✅ Banner appears in list
- ✅ Storage paths:
  - `banners/homepage/banners/{timestamp}-{filename}.jpg`
  - `banners/homepage/banners/{timestamp}-{filename}-mobile.jpg`

#### Success Criteria:
```
✅ Both desktop and mobile images exist
✅ Banner title is editable
✅ Link field is editable
✅ Drag handle works for reordering
```

---

### TEST 5: Publish to Live Site

#### Steps:
1. Review all draft content (hero, categories, banners)
2. Click **Publish** button (top right, blue button)
3. Confirm publish
4. Wait for redirect
5. Navigate to homepage WITHOUT preview flag: `http://localhost:3000/`

#### Expected Results:
- ✅ Page loads with all images visible
- ✅ Hero carousel shows published slides
- ✅ Category grid displays tiles
- ✅ Banners appear in correct order
- ✅ No console errors
- ✅ All images load successfully (check Network tab)

#### Success Criteria:
```
✅ Published hero slides visible
✅ Published category tiles visible
✅ Published banners visible
✅ All images render from correct CDN paths
✅ Mobile responsive images work (test on mobile viewport)
```

---

### TEST 6: Edit and Update

#### Steps:
1. Go back to admin
2. Edit a hero slide:
   - Change title
   - Change CTA text
   - Toggle visibility
3. Save changes
4. Open preview mode again
5. Verify changes appear

#### Expected Results:
- ✅ Changes save successfully
- ✅ Preview shows updated content
- ✅ Images still render correctly

---

### TEST 7: Reorder Items

#### Steps:
1. In Hero tab, drag a slide to a different position
2. Release
3. Check preview mode

#### Expected Results:
- ✅ Slide moves to new position instantly (optimistic update)
- ✅ Order persists on page refresh
- ✅ Preview shows new order

---

### TEST 8: Delete and Republish

#### Steps:
1. Delete one hero slide
2. Confirm deletion
3. Click Publish
4. Check live site

#### Expected Results:
- ✅ Deleted slide no longer appears
- ✅ Remaining slides still show images
- ✅ No broken image placeholders

---

## 🐛 TROUBLESHOOTING

### Issue: Images Not Showing in Preview/Live Site

**Possible Causes:**
1. Storage policies not applied
2. Wrong environment variable
3. Bucket not public

**Fix:**
```sql
-- Run in Supabase SQL Editor:
SELECT * FROM storage.buckets WHERE id = 'banners';
-- Ensure public = true

-- Check policies:
SELECT policyname FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%banners%';
-- Should see 4 policies (service_role insert/update/delete, public select)
```

---

### Issue: Upload Fails with 500 Error

**Possible Causes:**
1. Service role key missing
2. Sharp not installed
3. Bucket doesn't exist

**Fix:**
```bash
# Check .env.local
echo $SUPABASE_SERVICE_ROLE_KEY

# Reinstall sharp
npm install sharp

# Check buckets exist in Supabase Dashboard > Storage
```

---

### Issue: Mobile Images Not Different from Desktop

**Possible Causes:**
1. Sharp processing failed (check server logs)
2. Mobile path not saved to DB

**Fix:**
```sql
-- Check if mobile_image is populated:
SELECT id, desktop_image, mobile_image FROM homepage_hero;

-- Should see different paths, e.g.:
-- desktop: homepage/hero/123-img.jpg
-- mobile:   homepage/hero/123-img-mobile.jpg
```

---

### Issue: 403 Errors on Image URLs

**Cause:** Storage policies missing

**Fix:**
```sql
-- Re-run storage policy migrations
-- See PREREQUISITES section above
```

---

## ✅ FINAL CHECKLIST

Before marking as complete, verify:

- [ ] All storage migrations applied
- [ ] Environment variables set correctly
- [ ] Hero images upload successfully
- [ ] Category tiles upload successfully
- [ ] Banner images upload successfully
- [ ] Preview mode shows all draft images
- [ ] Publish creates published records
- [ ] Live site shows published images
- [ ] Mobile responsive images work
- [ ] No console errors
- [ ] No 403/404 errors in Network tab
- [ ] Reordering works
- [ ] Editing works
- [ ] Deleting works
- [ ] Images persist after server restart

---

## 🎯 SUCCESS METRICS

When fully working, you should see:

1. **Admin Upload:**
   - Upload completes in < 5 seconds
   - Both desktop and mobile variants created
   - Thumbnail preview shows immediately

2. **Preview Mode:**
   - All images render on first page load
   - No loading delays
   - Responsive images switch at 768px breakpoint

3. **Published Site:**
   - Hero carousel autoplays
   - Category grid is interactive
   - Banners are clickable
   - All images optimized and fast

4. **Storage:**
   - Images organized in folders by section
   - No orphaned files (or minimal)
   - Public URLs work when pasted in browser

---

## 📞 SUPPORT

If issues persist after following this guide:

1. Check `HOMEPAGE_IMAGE_PIPELINE_FIX_SUMMARY.md` for technical details
2. Run `verify_homepage_storage.sql` to diagnose database state
3. Review server logs for Sharp errors
4. Verify Supabase project settings allow public storage

---

**Last Updated:** December 1, 2025  
**Version:** 1.0  
**Status:** ✅ All Fixes Applied



















