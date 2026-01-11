-- Migration: Add UNIQUE constraints to products.uid and product_variants.sku
-- Purpose: Ensure data integrity for import operations
-- Idempotent: Yes (checks for existing constraints before adding)
-- Safety: Checks for duplicates before applying constraints

-- Step 1: Check for duplicate UIDs in products table
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT uid, COUNT(*) as cnt
    FROM products
    WHERE uid IS NOT NULL
    GROUP BY uid
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add UNIQUE constraint: Found % duplicate UIDs in products table. Please resolve duplicates first.', duplicate_count;
  END IF;
END $$;

-- Step 2: Add UNIQUE constraint to products.uid (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_uid_unique'
    AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_uid_unique UNIQUE (uid);
    
    RAISE NOTICE 'Added UNIQUE constraint products_uid_unique on products.uid';
  ELSE
    RAISE NOTICE 'UNIQUE constraint products_uid_unique already exists on products.uid';
  END IF;
END $$;

-- Step 3: Create index for products.uid if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_uid_unique ON products(uid);

-- Step 4: Check for duplicate SKUs in product_variants table
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT sku, COUNT(*) as cnt
    FROM product_variants
    WHERE sku IS NOT NULL
    GROUP BY sku
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add UNIQUE constraint: Found % duplicate SKUs in product_variants table. Please resolve duplicates first.', duplicate_count;
  END IF;
END $$;

-- Step 5: Add UNIQUE constraint to product_variants.sku (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_variants_sku_unique'
    AND conrelid = 'product_variants'::regclass
  ) THEN
    ALTER TABLE product_variants
    ADD CONSTRAINT product_variants_sku_unique UNIQUE (sku);
    
    RAISE NOTICE 'Added UNIQUE constraint product_variants_sku_unique on product_variants.sku';
  ELSE
    RAISE NOTICE 'UNIQUE constraint product_variants_sku_unique already exists on product_variants.sku';
  END IF;
END $$;

-- Step 6: Create index for product_variants.sku if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_product_variants_sku_unique ON product_variants(sku);

COMMENT ON CONSTRAINT products_uid_unique ON products IS 'Ensures product UIDs are unique for import operations';
COMMENT ON CONSTRAINT product_variants_sku_unique ON product_variants IS 'Ensures variant SKUs are unique for import operations';













