# ZEYNORA - Complete Implementation Files
## Full File Replacements for Three Major Systems

**Note:** All SQL migrations are text-only and NOT applied. All file implementations are complete replacements.

---

# PART 1: SQL MIGRATIONS (TEXT ONLY - DO NOT APPLY)

## Migration 1: Add Sale Fields
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

---

# PART 2: FULL FILE IMPLEMENTATIONS

## A. ALL PRODUCTS PAGE

### File 1: lib/products/list.ts (ENHANCED WITH SALE FIELDS)
