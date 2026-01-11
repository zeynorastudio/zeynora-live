/* Migration: RLS Policies for coupons table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the coupons table.
   Public can SELECT active coupons. Writes only through service_role.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coupons' 
    AND policyname = 'Service role full access coupons'
  ) THEN
    CREATE POLICY "Service role full access coupons"
      ON coupons
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Public can view active coupons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'coupons' 
    AND policyname = 'Public can view active coupons'
  ) THEN
    CREATE POLICY "Public can view active coupons"
      ON coupons
      FOR SELECT
      TO public
      USING (is_active = true);
  END IF;
END $$;

















