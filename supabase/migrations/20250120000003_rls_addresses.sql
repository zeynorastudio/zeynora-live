/* Migration: RLS Policies for addresses table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the addresses table.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Service role full access addresses'
  ) THEN
    CREATE POLICY "Service role full access addresses"
      ON addresses
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Customers can view their own addresses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Customers can view their own addresses'
  ) THEN
    CREATE POLICY "Customers can view their own addresses"
      ON addresses
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = addresses.user_id
        )
      );
  END IF;
END $$;

-- Customers can insert their own addresses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Customers can insert their own addresses'
  ) THEN
    CREATE POLICY "Customers can insert their own addresses"
      ON addresses
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = addresses.user_id
        )
      );
  END IF;
END $$;

-- Customers can update their own addresses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Customers can update their own addresses'
  ) THEN
    CREATE POLICY "Customers can update their own addresses"
      ON addresses
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = addresses.user_id
        )
      )
      WITH CHECK (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = addresses.user_id
        )
      );
  END IF;
END $$;

-- Customers can delete their own addresses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'addresses' 
    AND policyname = 'Customers can delete their own addresses'
  ) THEN
    CREATE POLICY "Customers can delete their own addresses"
      ON addresses
      FOR DELETE
      TO authenticated
      USING (
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = addresses.user_id
        )
      );
  END IF;
END $$;

















