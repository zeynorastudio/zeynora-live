-- Phase 4.3 — Returns System Migration
-- Creates return_requests and return_items tables for store-credit-only returns

-- 1. Create return status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'z_return_status') THEN
    CREATE TYPE z_return_status AS ENUM (
      'requested',        -- Customer requested return
      'approved',         -- Admin approved return
      'pickup_scheduled', -- Pickup scheduled with courier
      'in_transit',       -- Item in transit to store
      'received',         -- Item received at store
      'credited',         -- Store credit issued
      'rejected',         -- Admin rejected return
      'cancelled'         -- Return cancelled (auto or manual)
    );
  END IF;
END$$;

-- 2. Create return_requests table (drop if exists to ensure clean state)
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS return_requests CASCADE;

CREATE TABLE return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  guest_mobile text, -- For guest returns (normalized 10-digit)
  status z_return_status NOT NULL DEFAULT 'requested',
  reason text NOT NULL, -- Mandatory reason for return
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,
  admin_notes text, -- Admin internal notes
  pickup_retry_count integer NOT NULL DEFAULT 0, -- Track pickup retries (max 2)
  shiprocket_pickup_id text, -- Shiprocket reverse pickup ID
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: Either customer_id or guest_mobile must be present
  CONSTRAINT return_requests_customer_check CHECK (
    (customer_id IS NOT NULL) OR (guest_mobile IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer ON return_requests(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_return_requests_guest_mobile ON return_requests(guest_mobile) WHERE guest_mobile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_created ON return_requests(created_at DESC);

COMMENT ON TABLE return_requests IS 'Return requests for orders. Supports both logged-in customers and guests.';
COMMENT ON COLUMN return_requests.guest_mobile IS 'Normalized 10-digit phone number for guest returns';
COMMENT ON COLUMN return_requests.pickup_retry_count IS 'Number of pickup attempts. Auto-cancel after 2 failures.';
COMMENT ON COLUMN return_requests.shiprocket_pickup_id IS 'Shiprocket reverse pickup shipment ID';

-- 3. Create return_items table
CREATE TABLE return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id uuid NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: One return per order_item at a time
  -- Multiple partial returns allowed across different items
  UNIQUE(return_request_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_return_items_return_request ON return_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item ON return_items(order_item_id);

COMMENT ON TABLE return_items IS 'Items included in a return request. Supports partial returns.';
COMMENT ON COLUMN return_items.quantity IS 'Quantity to return (can be less than order quantity for partial returns)';

-- 4. Create updated_at trigger function for return_requests
CREATE OR REPLACE FUNCTION update_return_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_return_requests_updated_at
BEFORE UPDATE ON return_requests
FOR EACH ROW EXECUTE FUNCTION update_return_requests_updated_at();

-- 5. Add return_request_id to store_credit_transactions (for linking credits to returns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_credit_transactions' AND column_name = 'return_request_id'
  ) THEN
    ALTER TABLE store_credit_transactions 
    ADD COLUMN return_request_id uuid REFERENCES return_requests(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_store_credit_transactions_return ON store_credit_transactions(return_request_id);
    
    COMMENT ON COLUMN store_credit_transactions.return_request_id IS 'Links credit transaction to return request (for returns)';
  END IF;
END$$;

-- 6. RLS Policies (if RLS is enabled)
-- Note: RLS policies should be added separately if needed
-- For now, access is controlled via API routes using service role client

