-- Storage Policies for ALL Buckets (products, categories)
-- Ensures all storage buckets have proper policies for service_role and public access
-- Safe to run multiple times (idempotent)

-- Enable RLS on storage.objects (safe to run multiple times)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PRODUCTS BUCKET
-- ============================================

-- 1. Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create policies using DO blocks (idempotent)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can upload to products'
  ) THEN
    CREATE POLICY "Service role can upload to products"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'products');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can update products'
  ) THEN
    CREATE POLICY "Service role can update products"
    ON storage.objects
    FOR UPDATE
    TO service_role
    USING (bucket_id = 'products')
    WITH CHECK (bucket_id = 'products');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can delete from products'
  ) THEN
    CREATE POLICY "Service role can delete from products"
    ON storage.objects
    FOR DELETE
    TO service_role
    USING (bucket_id = 'products');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view products'
  ) THEN
    CREATE POLICY "Public can view products"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'products');
  END IF;
END $$;

-- ============================================
-- CATEGORIES BUCKET
-- ============================================

-- 1. Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('categories', 'categories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create policies using DO blocks (idempotent)

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can upload to categories'
  ) THEN
    CREATE POLICY "Service role can upload to categories"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'categories');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can update categories'
  ) THEN
    CREATE POLICY "Service role can update categories"
    ON storage.objects
    FOR UPDATE
    TO service_role
    USING (bucket_id = 'categories')
    WITH CHECK (bucket_id = 'categories');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can delete from categories'
  ) THEN
    CREATE POLICY "Service role can delete from categories"
    ON storage.objects
    FOR DELETE
    TO service_role
    USING (bucket_id = 'categories');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view categories'
  ) THEN
    CREATE POLICY "Public can view categories"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'categories');
  END IF;
END $$;

