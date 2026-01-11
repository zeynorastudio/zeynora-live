/* Migration: RLS Policies for inventory_log table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the inventory_log table.
   Service role only - no public or authenticated access.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'inventory_log' 
    AND policyname = 'Service role full access inventory_log'
  ) THEN
    CREATE POLICY "Service role full access inventory_log"
      ON inventory_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Note: No policies for public or authenticated roles
-- This ensures only service_role can access inventory_log

















