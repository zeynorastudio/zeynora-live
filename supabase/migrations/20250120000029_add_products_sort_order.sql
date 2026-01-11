-- Migration: Add sort_order column to products table
-- Purpose: Enable product reordering functionality
-- Idempotent: Yes (uses IF NOT EXISTS)

-- Add sort_order column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 999;
    CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
    COMMENT ON COLUMN products.sort_order IS 'Display order for products (lower numbers appear first)';
  END IF;
END $$;

















