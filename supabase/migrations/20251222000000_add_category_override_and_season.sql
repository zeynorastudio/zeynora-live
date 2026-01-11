-- Migration: Add category_override field and ensure season field exists
-- Purpose: Phase 1.1 - Unified Product Data Model
-- Date: 2025-12-22

-- Add category_override column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'category_override'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN category_override TEXT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN products.category_override IS 
      'Optional manual category override. When set, this takes precedence over the auto-derived category from subcategory.';
  END IF;
END $$;

-- Ensure season column exists (it should from initial schema, but defensive check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'season'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN season z_season NULL;
    
    COMMENT ON COLUMN products.season IS 
      'Product season classification. Used for seasonal collections and tag generation.';
  END IF;
END $$;
















