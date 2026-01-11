-- Phase 3.1 — Checkout + Order Creation Migration
-- Adds customer_id column and order_status enum for guest checkout support

-- 1. Create order_status enum (tracks order lifecycle separate from payment)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'z_order_status') THEN
    CREATE TYPE z_order_status AS ENUM (
      'created',      -- Order created, awaiting payment
      'confirmed',    -- Payment confirmed
      'processing',   -- Order being processed
      'completed',    -- Order fulfilled
      'cancelled'     -- Order cancelled
    );
  END IF;
END$$;

-- 2. Add customer_id column to orders (nullable for guest checkout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    COMMENT ON COLUMN orders.customer_id IS 'Links to customers table. Nullable for guest checkout.';
  END IF;
END$$;

-- 3. Add order_status column (defaults to 'created')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_status'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_status z_order_status DEFAULT 'created';
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
    COMMENT ON COLUMN orders.order_status IS 'Order lifecycle status (created/confirmed/processing/completed/cancelled)';
  END IF;
END$$;

-- 4. Add phone column to orders for guest order tracing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'guest_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN guest_phone text;
    CREATE INDEX IF NOT EXISTS idx_orders_guest_phone ON orders(guest_phone);
    COMMENT ON COLUMN orders.guest_phone IS 'Phone number for guest orders (for order tracking)';
  END IF;
END$$;

-- 5. Add guest_email column for guest checkout
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'guest_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN guest_email text;
    COMMENT ON COLUMN orders.guest_email IS 'Email for guest orders';
  END IF;
END$$;

-- 6. Add internal_shipping_cost column (what we pay to carrier, not charged to customer)
-- Note: shipping_fee already exists for charged amount; this is the actual cost
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'internal_shipping_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN internal_shipping_cost numeric(12,2) DEFAULT 0;
    COMMENT ON COLUMN orders.internal_shipping_cost IS 'Internal shipping cost from carrier (Shiprocket). Not charged to customer.';
  END IF;
END$$;

-- 7. Add cost_price column to order_items for margin calculation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN cost_price numeric(12,2) DEFAULT 0;
    COMMENT ON COLUMN order_items.cost_price IS 'Cost price of item at time of order (for margin calculation)';
  END IF;
END$$;

-- 8. Update RLS policy for orders to allow customers to view their own orders
-- (Only if RLS is enabled on orders)
DO $$
BEGIN
  -- Drop existing customer policy if exists
  DROP POLICY IF EXISTS orders_customer_select ON orders;
  
  -- Create policy for customers to select their own orders
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders' AND rowsecurity = true) THEN
    CREATE POLICY orders_customer_select ON orders
      FOR SELECT
      TO authenticated
      USING (
        -- Match by customer_id
        customer_id IN (
          SELECT id FROM customers WHERE auth_uid = auth.uid()
        )
        OR
        -- Match by user_id (legacy)
        user_id IN (
          SELECT id FROM users WHERE auth_uid = auth.uid()
        )
      );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Policy might already exist or RLS not enabled, continue
    NULL;
END$$;

-- End of Phase 3.1 Migration












