-- Migration: Add description column to products table
-- Purpose: Enable product description field
-- Idempotent: Yes (uses IF NOT EXISTS)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'description'
  ) THEN
    ALTER TABLE products ADD COLUMN description TEXT;
    COMMENT ON COLUMN products.description IS 'Product description text';
  END IF;
END $$;




