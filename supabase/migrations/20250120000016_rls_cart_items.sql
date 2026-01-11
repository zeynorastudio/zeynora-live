/* Migration: RLS Policies for cart_items table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the cart_items table.
   Policies reference customers.auth_uid via carts table.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cart_items' 
    AND policyname = 'Service role full access cart_items'
  ) THEN
    CREATE POLICY "Service role full access cart_items"
      ON cart_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated users can view cart items in their own carts (via customers.auth_uid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cart_items' 
    AND policyname = 'Customers can view their own cart items'
  ) THEN
    CREATE POLICY "Customers can view their own cart items"
      ON cart_items
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM carts
          WHERE carts.id = cart_items.cart_id
          AND (
            (carts.user_id IS NOT NULL AND
             auth.uid() = (
               SELECT c.auth_uid 
               FROM customers c 
               JOIN users u ON u.auth_uid = c.auth_uid
               WHERE u.id = carts.user_id
             ))
            OR carts.session_id IS NOT NULL
          )
        )
      );
  END IF;
END $$;

-- Authenticated users can insert cart items into their own carts (via customers.auth_uid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cart_items' 
    AND policyname = 'Customers can insert their own cart items'
  ) THEN
    CREATE POLICY "Customers can insert their own cart items"
      ON cart_items
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM carts
          WHERE carts.id = cart_items.cart_id
          AND (
            (carts.user_id IS NOT NULL AND
             auth.uid() = (
               SELECT c.auth_uid 
               FROM customers c 
               JOIN users u ON u.auth_uid = c.auth_uid
               WHERE u.id = carts.user_id
             ))
            OR carts.session_id IS NOT NULL
          )
        )
      );
  END IF;
END $$;

-- Authenticated users can update cart items in their own carts (via customers.auth_uid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cart_items' 
    AND policyname = 'Customers can update their own cart items'
  ) THEN
    CREATE POLICY "Customers can update their own cart items"
      ON cart_items
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM carts
          WHERE carts.id = cart_items.cart_id
          AND (
            (carts.user_id IS NOT NULL AND
             auth.uid() = (
               SELECT c.auth_uid 
               FROM customers c 
               JOIN users u ON u.auth_uid = c.auth_uid
               WHERE u.id = carts.user_id
             ))
            OR carts.session_id IS NOT NULL
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM carts
          WHERE carts.id = cart_items.cart_id
          AND (
            (carts.user_id IS NOT NULL AND
             auth.uid() = (
               SELECT c.auth_uid 
               FROM customers c 
               JOIN users u ON u.auth_uid = c.auth_uid
               WHERE u.id = carts.user_id
             ))
            OR carts.session_id IS NOT NULL
          )
        )
      );
  END IF;
END $$;

-- Authenticated users can delete cart items from their own carts (via customers.auth_uid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cart_items' 
    AND policyname = 'Customers can delete their own cart items'
  ) THEN
    CREATE POLICY "Customers can delete their own cart items"
      ON cart_items
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM carts
          WHERE carts.id = cart_items.cart_id
          AND (
            (carts.user_id IS NOT NULL AND
             auth.uid() = (
               SELECT c.auth_uid 
               FROM customers c 
               JOIN users u ON u.auth_uid = c.auth_uid
               WHERE u.id = carts.user_id
             ))
            OR carts.session_id IS NOT NULL
          )
        )
      );
  END IF;
END $$;

