/* Migration: RLS Policies for return_requests table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the return_requests table.
   Policies reference customers.auth_uid via users table for customer-facing operations.
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

-- Customers can view their own return requests (via customers.auth_uid)
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
        return_requests.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = return_requests.user_id
        )
      );
  END IF;
END $$;

-- Customers can create their own return requests (via customers.auth_uid)
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
        return_requests.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = return_requests.user_id
        )
      );
  END IF;
END $$;

















