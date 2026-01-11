# Database Migration Guide - Homepage Image Pipeline

This guide explains which SQL migrations to run and in what order to set up the homepage image pipeline correctly.

---

## 🎯 OVERVIEW

You need to run migrations to:
1. Create homepage builder tables (if not already created)
2. Set up storage buckets and policies for images

All migrations are now **idempotent** (safe to run multiple times).

---

## 📋 MIGRATION EXECUTION ORDER

### SCENARIO 1: Fresh Database (Homepage Tables Don't Exist)

Run in this exact order in Supabase SQL Editor:

1. **Homepage Builder Tables:**
   ```sql
   -- File: supabase/migrations/20251130120500_homepage_builder_tables_fixed.sql
   -- OR (safer, idempotent version):
   -- File: supabase/migrations/20251201000200_homepage_builder_tables_safe.sql
   ```

2. **Banners Bucket Policies:**
   ```sql
   -- File: supabase/migrations/20251201000000_storage_policies_banners.sql
   ```

3. **All Buckets Policies:**
   ```sql
   -- File: supabase/migrations/20251201000100_storage_policies_all_buckets.sql
   ```

---

### SCENARIO 2: Homepage Tables Already Exist (Getting Permission Errors)

If you already ran the previous homepage migrations, just run the storage policies:

1. **Banners Bucket Policies:**
   ```sql
   -- File: supabase/migrations/20251201000000_storage_policies_banners.sql
   ```

2. **All Buckets Policies:**
   ```sql
   -- File: supabase/migrations/20251201000100_storage_policies_all_buckets.sql
   ```

---

### SCENARIO 3: Already Ran Old Storage Policies (Got DROP POLICY Error)

The new versions use DO blocks instead of DROP POLICY. Just run them again:

1. **Re-run Banners Bucket Policies:**
   ```sql
   -- File: supabase/migrations/20251201000000_storage_policies_banners.sql
   -- (Updated version - no DROP POLICY commands)
   ```

2. **Re-run All Buckets Policies:**
   ```sql
   -- File: supabase/migrations/20251201000100_storage_policies_all_buckets.sql
   -- (Updated version - no DROP POLICY commands)
   ```

---

## 🔧 HOW TO RUN MIGRATIONS IN SUPABASE

### Step-by-Step:

1. **Open Supabase Dashboard**
   - Go to your project: https://app.supabase.com
   - Navigate to: **SQL Editor**

2. **Create New Query**
   - Click: **+ New Query**

3. **Copy Migration Content**
   - Open migration file in your code editor
   - Copy entire contents
   - Paste into Supabase SQL Editor

4. **Execute**
   - Click: **Run** (or press Ctrl/Cmd + Enter)
   - Wait for "Success" message

5. **Repeat for Each Migration**
   - Follow the order specified in your scenario above

---

## ✅ VERIFICATION

After running all migrations, verify everything is set up correctly:

### 1. Check Buckets Created

```sql
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('banners', 'products', 'categories');
```

**Expected:** All 3 buckets exist with `public = true`

### 2. Check Storage Policies

```sql
SELECT 
  policyname,
  cmd,
  roles::text
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%banners%'
ORDER BY policyname;
```

**Expected:** 4 policies (service_role INSERT/UPDATE/DELETE, public SELECT)

### 3. Check Homepage Tables

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'homepage_%'
ORDER BY table_name;
```

**Expected:**
- homepage_banners
- homepage_categories
- homepage_hero
- homepage_section_products
- homepage_sections
- homepage_settings

### 4. Check RLS Policies on Tables

```sql
SELECT 
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE 'homepage_%'
ORDER BY tablename, policyname;
```

**Expected:** Each homepage table has a "Service role has full access" policy

---

## 🐛 TROUBLESHOOTING

### Error: "relation 'categories' does not exist"

**Cause:** Homepage tables reference the `categories` table which doesn't exist yet.

**Fix:** Run your main schema migrations first (phase_2_1_schema.sql or equivalent).

---

### Error: "must be owner of table objects"

**Cause:** Using old migration files with DROP POLICY commands.

**Fix:** Use the updated migration files (dated 20251201) which use DO blocks instead.

---

### Error: "policy already exists"

**Cause:** Running old migration that doesn't check for existing policies.

**Fix:** 
- Either delete the policy first in Supabase Dashboard (Storage > Policies)
- Or use the new idempotent migrations

---

### Error: "relation 'products' does not exist"

**Cause:** Homepage section products references the `products` table.

**Fix:** Ensure your main product schema is set up first.

---

## 📊 MIGRATION FILE REFERENCE

| File | Purpose | Idempotent? | Notes |
|------|---------|-------------|-------|
| `20251130120500_homepage_builder_tables_fixed.sql` | Create homepage tables | Partial | Old version, may error on re-run |
| `20251201000000_storage_policies_banners.sql` | Banners bucket policies | ✅ Yes | Updated with DO blocks |
| `20251201000100_storage_policies_all_buckets.sql` | Products/categories policies | ✅ Yes | Updated with DO blocks |
| `20251201000200_homepage_builder_tables_safe.sql` | Create homepage tables (safe) | ✅ Yes | Recommended version |

---

## 🚀 RECOMMENDED APPROACH

If you're unsure about your current database state, run this comprehensive verification query first:

```sql
-- Comprehensive Status Check
SELECT 'Buckets' as category, 
       COALESCE(COUNT(*)::text, '0') as count 
FROM storage.buckets 
WHERE id IN ('banners', 'products', 'categories')

UNION ALL

SELECT 'Storage Policies', 
       COALESCE(COUNT(DISTINCT policyname)::text, '0') 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'

UNION ALL

SELECT 'Homepage Tables', 
       COALESCE(COUNT(*)::text, '0') 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'homepage_%'

UNION ALL

SELECT 'Homepage Policies', 
       COALESCE(COUNT(*)::text, '0') 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE 'homepage_%';
```

**Ideal Output:**
```
category          | count
------------------+-------
Buckets           | 3
Storage Policies  | 12
Homepage Tables   | 6
Homepage Policies | 7
```

Then follow the appropriate scenario above based on your results.

---

## ✅ POST-MIGRATION CHECKLIST

After running all migrations:

- [ ] All 3 storage buckets exist (`banners`, `products`, `categories`)
- [ ] All buckets have `public = true`
- [ ] 12 storage policies exist (4 per bucket)
- [ ] 6 homepage tables exist
- [ ] 7 homepage RLS policies exist
- [ ] No errors when running verification queries
- [ ] Ready to test image uploads in admin panel

---

## 📞 NEXT STEPS

After successful migration:

1. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

2. **Test Upload:**
   - Go to: `http://localhost:3000/admin/super/homepage`
   - Upload a hero image
   - Verify it appears in Supabase Storage

3. **Test Preview:**
   - Click "Preview" button
   - Verify images render on homepage

4. **Test Publish:**
   - Click "Publish" button
   - Check live homepage (without preview flag)

See `TESTING_GUIDE_HOMEPAGE_IMAGES.md` for comprehensive testing procedures.

---

**Last Updated:** December 1, 2025  
**Migration Format:** PostgreSQL with DO blocks (idempotent)  
**Tested On:** Supabase PostgreSQL 15+



















