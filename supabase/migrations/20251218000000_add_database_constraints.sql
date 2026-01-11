-- Migration: Database Safeguards
-- Purpose: Add CHECK constraints and verify FK constraints for data integrity
-- Phase 0 of Zeynora Production Stabilization

-- 1. Add CHECK constraint to ensure stock is never negative
-- This prevents invalid stock values at the database level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stock_non_negative' 
    AND conrelid = 'product_variants'::regclass
  ) THEN
    ALTER TABLE product_variants 
    ADD CONSTRAINT stock_non_negative CHECK (stock IS NULL OR stock >= 0);
  END IF;
END $$;

-- 2. Verify FK constraint: product_variants.product_uid -> products.uid
-- Add if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'product_variants_product_uid_fkey' 
    AND conrelid = 'product_variants'::regclass
  ) THEN
    ALTER TABLE product_variants 
    ADD CONSTRAINT product_variants_product_uid_fkey 
    FOREIGN KEY (product_uid) REFERENCES products(uid) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Verify FK constraint: homepage_section_products.product_id -> products.uid
-- Add if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'homepage_section_products_product_id_fkey' 
    AND conrelid = 'homepage_section_products'::regclass
  ) THEN
    ALTER TABLE homepage_section_products 
    ADD CONSTRAINT homepage_section_products_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(uid) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Verify FK constraint: homepage_section_products.section_id -> homepage_sections.id
-- Add if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'homepage_section_products_section_id_fkey' 
    AND conrelid = 'homepage_section_products'::regclass
  ) THEN
    ALTER TABLE homepage_section_products 
    ADD CONSTRAINT homepage_section_products_section_id_fkey 
    FOREIGN KEY (section_id) REFERENCES homepage_sections(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Verify FK constraint: homepage_categories.category_id -> categories.id
-- Add if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'homepage_categories_category_id_fkey' 
    AND conrelid = 'homepage_categories'::regclass
  ) THEN
    ALTER TABLE homepage_categories 
    ADD CONSTRAINT homepage_categories_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON CONSTRAINT stock_non_negative ON product_variants IS 
  'Ensures stock can never be negative. NULL is allowed for "unlimited" stock scenarios.';
