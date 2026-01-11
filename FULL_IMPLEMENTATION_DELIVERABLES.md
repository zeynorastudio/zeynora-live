# ZEYNORA - Complete Implementation Deliverables
## Date: January 22, 2025

**IMPORTANT:** All SQL migrations are TEXT ONLY - DO NOT APPLY until reviewed.

---

## PART 1: SQL MIGRATIONS (TEXT ONLY)

### Migration 1: Add Sale Fields to Products
**File:** `supabase/migrations/20250122000001_add_sale_fields_to_products.sql`

```sql
-- Migration: Add sale pricing fields to products table
-- Purpose: Enable strike_price, sale_price, and on_sale functionality
-- Idempotent: Yes (uses IF NOT EXISTS)

-- Add strike_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'strike_price'
  ) THEN
    ALTER TABLE products ADD COLUMN strike_price numeric(12,2);
    COMMENT ON COLUMN products.strike_price IS 'Original price shown with strikethrough when on_sale is true';
  END IF;
END $$;

-- Add sale_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE products ADD COLUMN sale_price numeric(12,2);
    COMMENT ON COLUMN products.sale_price IS 'Sale price displayed when on_sale is true. If NULL, uses regular price.';
  END IF;
END $$;

-- Add on_sale column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'on_sale'
  ) THEN
    ALTER TABLE products ADD COLUMN on_sale boolean DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_products_on_sale ON products(on_sale);
    COMMENT ON COLUMN products.on_sale IS 'Flag indicating if product is currently on sale';
  END IF;
END $$;

-- Add check constraint to ensure sale_price <= strike_price when on_sale is true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_sale_price_check'
    AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
    ADD CONSTRAINT products_sale_price_check
    CHECK (
      (on_sale = false) OR 
      (on_sale = true AND (strike_price IS NULL OR sale_price IS NULL OR sale_price <= strike_price))
    );
  END IF;
END $$;
```

**Justification:** Enables inline editing of sale pricing on products list page.
**Impact:** Low risk - adds nullable columns, no data loss.

---

### Migration 2: Sort Order (Already Exists)
**File:** `supabase/migrations/20250120000029_add_products_sort_order.sql`
**Status:** ✅ Already exists - idempotent

---

### Migration 3: Variant SKU (Already Exists)
**File:** `supabase/migrations/20250121000002_add_variant_sku_to_product_images.sql`
**Status:** ✅ Already exists - idempotent

---

### Migration 4: Storage Policies (Already Exists)
**File:** `supabase/migrations/20251201000100_storage_policies_all_buckets.sql`
**Status:** ✅ Already exists - includes public read for products bucket

---

## PART 2: FULL FILE REPLACEMENTS

---

## A. ALL PRODUCTS PAGE

### File 1: lib/products/list.ts (ENHANCED)
