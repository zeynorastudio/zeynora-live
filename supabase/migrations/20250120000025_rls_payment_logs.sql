/* Migration: RLS Policies for payment_logs table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the payment_logs table.
   Service role only - no public or authenticated access.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payment_logs' 
    AND policyname = 'Service role full access payment_logs'
  ) THEN
    CREATE POLICY "Service role full access payment_logs"
      ON payment_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- No policies for public or authenticated users (service_role only)

















