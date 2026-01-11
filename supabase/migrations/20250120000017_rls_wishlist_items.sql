/* Migration: RLS Policies for wishlist_items table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the wishlist_items table.
   Policies reference customers.auth_uid for customer-facing operations.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wishlist_items' 
    AND policyname = 'Service role full access wishlist_items'
  ) THEN
    CREATE POLICY "Service role full access wishlist_items"
      ON wishlist_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Customers can view their own wishlist items (via customers.auth_uid)
-- Note: wishlist_items.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wishlist_items' 
    AND policyname = 'Customers can view their own wishlist items'
  ) THEN
    CREATE POLICY "Customers can view their own wishlist items"
      ON wishlist_items
      FOR SELECT
      TO authenticated
      USING (
        wishlist_items.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = wishlist_items.user_id
        )
      );
  END IF;
END $$;

-- Customers can insert their own wishlist items (via customers.auth_uid)
-- Note: wishlist_items.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wishlist_items' 
    AND policyname = 'Customers can insert their own wishlist items'
  ) THEN
    CREATE POLICY "Customers can insert their own wishlist items"
      ON wishlist_items
      FOR INSERT
      TO authenticated
      WITH CHECK (
        wishlist_items.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = wishlist_items.user_id
        )
      );
  END IF;
END $$;

-- Customers can update their own wishlist items (via customers.auth_uid)
-- Note: wishlist_items.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wishlist_items' 
    AND policyname = 'Customers can update their own wishlist items'
  ) THEN
    CREATE POLICY "Customers can update their own wishlist items"
      ON wishlist_items
      FOR UPDATE
      TO authenticated
      USING (
        wishlist_items.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = wishlist_items.user_id
        )
      )
      WITH CHECK (
        wishlist_items.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = wishlist_items.user_id
        )
      );
  END IF;
END $$;

-- Customers can delete their own wishlist items (via customers.auth_uid)
-- Note: wishlist_items.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'wishlist_items' 
    AND policyname = 'Customers can delete their own wishlist items'
  ) THEN
    CREATE POLICY "Customers can delete their own wishlist items"
      ON wishlist_items
      FOR DELETE
      TO authenticated
      USING (
        wishlist_items.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = wishlist_items.user_id
        )
      );
  END IF;
END $$;

