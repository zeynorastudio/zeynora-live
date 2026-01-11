/* Migration: RLS Policies for orders table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the orders table.
   Customers can SELECT only their own orders.
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

-- Customers can view their own orders
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
        auth.uid() IN (
          SELECT auth_uid FROM users WHERE users.id = orders.user_id
        )
      );
  END IF;
END $$;

















