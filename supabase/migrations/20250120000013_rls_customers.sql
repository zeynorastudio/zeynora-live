/* Migration: RLS Policies for customers table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the customers table.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Service role full access (service_role bypasses RLS automatically, but we add explicit policy for clarity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Service role full access customers'
  ) THEN
    CREATE POLICY "Service role full access customers"
      ON customers
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Customers can view their own record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Customers can view their own record'
  ) THEN
    CREATE POLICY "Customers can view their own record"
      ON customers
      FOR SELECT
      TO authenticated
      USING (auth.uid() = auth_uid);
  END IF;
END $$;

-- Customers can update their own record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'customers' 
    AND policyname = 'Customers can update their own record'
  ) THEN
    CREATE POLICY "Customers can update their own record"
      ON customers
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = auth_uid)
      WITH CHECK (auth.uid() = auth_uid);
  END IF;
END $$;

















