/* Migration: RLS Policies for order_items table
   ZEYNORA - Row Level Security
   
   This migration enables RLS and creates policies for the order_items table.
   Customers can SELECT items belonging to their orders.
   Idempotent - safe to re-run.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items' 
    AND policyname = 'Service role full access order_items'
  ) THEN
    CREATE POLICY "Service role full access order_items"
      ON order_items
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Customers can view order items belonging to their orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items' 
    AND policyname = 'Customers can view their own order items'
  ) THEN
    CREATE POLICY "Customers can view their own order items"
      ON order_items
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
          AND auth.uid() IN (
            SELECT auth_uid FROM users WHERE users.id = orders.user_id
          )
        )
      );
  END IF;
END $$;

















