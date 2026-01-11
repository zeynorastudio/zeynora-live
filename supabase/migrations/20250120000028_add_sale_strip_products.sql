-- Migration: Add product selection support to sale strips
-- Idempotent: Can be run multiple times safely
-- Purpose: Allow associating products with sale strips for featured sale collections

-- Option 1: Add jsonb column for product IDs (simpler, recommended)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sale_strips' 
    AND column_name = 'product_ids'
  ) THEN
    ALTER TABLE homepage_sale_strips ADD COLUMN product_ids jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Option 2: Create separate table for product associations (if preferred over jsonb)
-- Uncomment below if you prefer a normalized table approach

-- CREATE TABLE IF NOT EXISTS homepage_sale_strip_products (
--     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--     sale_strip_id uuid NOT NULL REFERENCES homepage_sale_strips(id) ON DELETE CASCADE,
--     product_id text NOT NULL REFERENCES products(uid) ON DELETE CASCADE,
--     order_index integer NOT NULL DEFAULT 0,
--     created_at timestamptz NOT NULL DEFAULT now()
-- );

-- CREATE INDEX IF NOT EXISTS idx_sale_strip_products_sale_strip_id 
--     ON homepage_sale_strip_products(sale_strip_id);

-- CREATE INDEX IF NOT EXISTS idx_sale_strip_products_order_index 
--     ON homepage_sale_strip_products(order_index);

-- ALTER TABLE homepage_sale_strip_products ENABLE ROW LEVEL SECURITY;

-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname = 'public'
--       AND tablename = 'homepage_sale_strip_products'
--       AND policyname = 'Service role can manage sale strip products'
--   ) THEN
--     CREATE POLICY "Service role can manage sale strip products"
--     ON homepage_sale_strip_products
--     FOR ALL
--     TO service_role
--     USING (true)
--     WITH CHECK (true);
--   END IF;
-- END $$;

















