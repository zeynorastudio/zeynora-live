/* Migration: RLS Policies for return_requests table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the return_requests table.
   Customers can CREATE and SELECT their own return requests.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'return_requests' 
    AND policyname = 'Service role full access return_requests'
  ) THEN
    CREATE POLICY "Service role full access return_requests"
      ON return_requests
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Customers can view their own return requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'return_requests' 
    AND policyname = 'Customers can view their own return requests'
  ) THEN
    CREATE POLICY "Customers can view their own return requests"
      ON return_requests
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = return_requests.user_id
        )
      );
  END IF;
END $$;

-- Customers can create their own return requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'return_requests' 
    AND policyname = 'Customers can create their own return requests'
  ) THEN
    CREATE POLICY "Customers can create their own return requests"
      ON return_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = return_requests.user_id
        )
      );
  END IF;
END $$;

















