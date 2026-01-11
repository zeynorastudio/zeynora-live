/* Migration: RLS Policies for carts table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the carts table.
   Policies reference customers.auth_uid for customer-facing operations.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'carts' 
    AND policyname = 'Service role full access carts'
  ) THEN
    CREATE POLICY "Service role full access carts"
      ON carts
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated users can view their own carts (via customers.auth_uid)
-- Note: carts.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'carts' 
    AND policyname = 'Customers can view their own carts'
  ) THEN
    CREATE POLICY "Customers can view their own carts"
      ON carts
      FOR SELECT
      TO authenticated
      USING (
        (carts.user_id IS NOT NULL AND
         auth.uid() = (
           SELECT c.auth_uid 
           FROM customers c 
           JOIN users u ON u.auth_uid = c.auth_uid
           WHERE u.id = carts.user_id
         ))
        OR carts.session_id IS NOT NULL
      );
  END IF;
END $$;

-- Authenticated users can insert their own carts (via customers.auth_uid)
-- Note: carts.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'carts' 
    AND policyname = 'Customers can insert their own carts'
  ) THEN
    CREATE POLICY "Customers can insert their own carts"
      ON carts
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (carts.user_id IS NOT NULL AND
         auth.uid() = (
           SELECT c.auth_uid 
           FROM customers c 
           JOIN users u ON u.auth_uid = c.auth_uid
           WHERE u.id = carts.user_id
         ))
        OR carts.session_id IS NOT NULL
      );
  END IF;
END $$;

-- Authenticated users can update their own carts (via customers.auth_uid)
-- Note: carts.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'carts' 
    AND policyname = 'Customers can update their own carts'
  ) THEN
    CREATE POLICY "Customers can update their own carts"
      ON carts
      FOR UPDATE
      TO authenticated
      USING (
        (carts.user_id IS NOT NULL AND
         auth.uid() = (
           SELECT c.auth_uid 
           FROM customers c 
           JOIN users u ON u.auth_uid = c.auth_uid
           WHERE u.id = carts.user_id
         ))
        OR carts.session_id IS NOT NULL
      )
      WITH CHECK (
        (carts.user_id IS NOT NULL AND
         auth.uid() = (
           SELECT c.auth_uid 
           FROM customers c 
           JOIN users u ON u.auth_uid = c.auth_uid
           WHERE u.id = carts.user_id
         ))
        OR carts.session_id IS NOT NULL
      );
  END IF;
END $$;

-- Authenticated users can delete their own carts (via customers.auth_uid)
-- Note: carts.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'carts' 
    AND policyname = 'Customers can delete their own carts'
  ) THEN
    CREATE POLICY "Customers can delete their own carts"
      ON carts
      FOR DELETE
      TO authenticated
      USING (
        (carts.user_id IS NOT NULL AND
         auth.uid() = (
           SELECT c.auth_uid 
           FROM customers c 
           JOIN users u ON u.auth_uid = c.auth_uid
           WHERE u.id = carts.user_id
         ))
        OR carts.session_id IS NOT NULL
      );
  END IF;
END $$;

