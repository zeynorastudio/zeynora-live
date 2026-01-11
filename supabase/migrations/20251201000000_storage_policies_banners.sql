-- Storage Policies for Banners Bucket
-- This migration ensures the 'banners' bucket exists and has proper policies
-- Safe to run multiple times (idempotent)

-- 1. Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on storage.objects (safe to run multiple times)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policies using DO blocks (idempotent - drops if exists, then creates)

-- Service Role INSERT Policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can upload to banners'
  ) THEN
    CREATE POLICY "Service role can upload to banners"
    ON storage.objects
    FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'banners');
  END IF;
END $$;

-- Service Role UPDATE Policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can update banners'
  ) THEN
    CREATE POLICY "Service role can update banners"
    ON storage.objects
    FOR UPDATE
    TO service_role
    USING (bucket_id = 'banners')
    WITH CHECK (bucket_id = 'banners');
  END IF;
END $$;

-- Service Role DELETE Policy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Service role can delete from banners'
  ) THEN
    CREATE POLICY "Service role can delete from banners"
    ON storage.objects
    FOR DELETE
    TO service_role
    USING (bucket_id = 'banners');
  END IF;
END $$;

-- Public SELECT Policy (Read Access)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view banners'
  ) THEN
    CREATE POLICY "Public can view banners"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'banners');
  END IF;
END $$;

