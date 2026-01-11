-- Migration: Add variant_sku column to product_images table
-- Purpose: Allow assigning images to specific product variants
-- Idempotent: Yes (uses IF NOT EXISTS)

-- Add variant_sku column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_images' AND column_name = 'variant_sku'
  ) THEN
    ALTER TABLE product_images ADD COLUMN variant_sku text;
    
    -- Add index for faster variant-specific queries
    CREATE INDEX IF NOT EXISTS idx_product_images_variant_sku 
    ON product_images(variant_sku);
    
    -- Add foreign key constraint (optional, but ensures data integrity)
    -- Note: This references product_variants.sku, not id
    -- We skip explicit FK since we can't reference text columns with FK easily
    -- Application code should validate variant_sku exists
    
    COMMENT ON COLUMN product_images.variant_sku IS 
    'Optional: SKU of the product variant this image belongs to. NULL means product-level image.';
  END IF;
END $$;












