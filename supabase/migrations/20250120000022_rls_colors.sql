/* Migration: RLS Policies for colors table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the colors table.
   Public can SELECT all colors. Writes only via service_role.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'colors' 
    AND policyname = 'Service role full access colors'
  ) THEN
    CREATE POLICY "Service role full access colors"
      ON colors
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Public can view all colors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'colors' 
    AND policyname = 'Public can view all colors'
  ) THEN
    CREATE POLICY "Public can view all colors"
      ON colors
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

















