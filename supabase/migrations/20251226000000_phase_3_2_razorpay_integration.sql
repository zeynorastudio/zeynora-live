-- Phase 3.2 — Razorpay Integration Migration
-- Adds Razorpay-specific fields to orders table

-- 0. Add 'paid' to order_status enum (for Phase 3.2: order moves from CREATED → PAID)
DO $$
BEGIN
  -- Check if 'paid' already exists in enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'paid' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'z_order_status')
  ) THEN
    ALTER TYPE z_order_status ADD VALUE 'paid';
  END IF;
END$$;

-- 1. Add razorpay_order_id column (stores Razorpay order ID)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN razorpay_order_id text;
    CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
    COMMENT ON COLUMN orders.razorpay_order_id IS 'Razorpay order ID (e.g., order_xxx). Created server-side when order is created.';
  END IF;
END$$;

-- 2. Add payment_method column (stores payment method used)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method text;
    COMMENT ON COLUMN orders.payment_method IS 'Payment method used (e.g., card, netbanking, wallet, upi). Set via webhook.';
  END IF;
END$$;

-- 3. Add paid_at column (timestamp when payment was captured)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN paid_at timestamptz;
    COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was successfully captured. Set via webhook.';
  END IF;
END$$;

-- 4. Add razorpay_payment_id to payment_provider_response JSONB structure
-- Note: This is informational - the actual storage happens in application code
-- The payment_provider_response JSONB will store:
-- {
--   "razorpay_order_id": "order_xxx",
--   "razorpay_payment_id": "pay_xxx",
--   "payment_method": "card",
--   "paid_at": "2025-01-01T12:00:00Z"
-- }

-- End of Phase 3.2 Migration

