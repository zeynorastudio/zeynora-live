/* Migration: RLS Policies for orders table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the orders table.
   Policies reference customers.auth_uid via users table for customer-facing operations.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Service role full access orders'
  ) THEN
    CREATE POLICY "Service role full access orders"
      ON orders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Customers can view their own orders (via customers.auth_uid)
-- Note: orders.user_id references users.id, so we join users -> customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Customers can view their own orders'
  ) THEN
    CREATE POLICY "Customers can view their own orders"
      ON orders
      FOR SELECT
      TO authenticated
      USING (
        orders.user_id IS NOT NULL AND
        auth.uid() = (
          SELECT c.auth_uid 
          FROM customers c 
          JOIN users u ON u.auth_uid = c.auth_uid
          WHERE u.id = orders.user_id
        )
      );
  END IF;
END $$;

















