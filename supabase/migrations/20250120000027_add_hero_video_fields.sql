-- Migration: Add desktop_video and mobile_video columns to homepage_hero
-- Idempotent: Can be run multiple times safely
-- Purpose: Support separate video assets for desktop and mobile hero variants

-- Add desktop_video column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_hero' 
    AND column_name = 'desktop_video'
  ) THEN
    ALTER TABLE homepage_hero ADD COLUMN desktop_video text;
  END IF;
END $$;

-- Add mobile_video column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_hero' 
    AND column_name = 'mobile_video'
  ) THEN
    ALTER TABLE homepage_hero ADD COLUMN mobile_video text;
  END IF;
END $$;

















