/* Migration: RLS Policies for product_colors table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the product_colors table.
   Public can SELECT all product colors. Writes only via service_role.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'product_colors' 
    AND policyname = 'Service role full access product_colors'
  ) THEN
    CREATE POLICY "Service role full access product_colors"
      ON product_colors
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Public can view all product colors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'product_colors' 
    AND policyname = 'Public can view all product colors'
  ) THEN
    CREATE POLICY "Public can view all product colors"
      ON product_colors
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

















