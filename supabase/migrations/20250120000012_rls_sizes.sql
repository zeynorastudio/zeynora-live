/* Migration: RLS Policies for sizes table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the sizes table.
   Public SELECT ok. Writes only through service_role.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sizes' 
    AND policyname = 'Service role full access sizes'
  ) THEN
    CREATE POLICY "Service role full access sizes"
      ON sizes
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Public can view all sizes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sizes' 
    AND policyname = 'Public can view all sizes'
  ) THEN
    CREATE POLICY "Public can view all sizes"
      ON sizes
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

















