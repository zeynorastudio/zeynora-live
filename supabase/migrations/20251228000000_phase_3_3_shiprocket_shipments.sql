-- Phase 3.3 — Shiprocket Shipment Management
-- Adds shipment tracking fields and Shiprocket token storage

-- ============================================================================
-- 1. SHIPROCKET TOKEN STORAGE TABLE
-- ============================================================================

-- Table to store Shiprocket authentication tokens securely
CREATE TABLE IF NOT EXISTS shiprocket_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for quick token lookup
CREATE INDEX IF NOT EXISTS idx_shiprocket_tokens_expires_at ON shiprocket_tokens(expires_at);

-- RLS: Only service role can access tokens
ALTER TABLE shiprocket_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shiprocket_tokens_service_role_only"
  ON shiprocket_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. ADD SHIPMENT FIELDS TO ORDERS TABLE
-- ============================================================================

-- Add shipment tracking fields to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

-- Add comment for shipment_status enum values
COMMENT ON COLUMN orders.shipment_status IS 'Shipment status: pending, created, shipped, in_transit, delivered, failed';

-- Create index for shipment status queries
CREATE INDEX IF NOT EXISTS idx_orders_shipment_status ON orders(shipment_status);

-- ============================================================================
-- 3. UPDATE SHIPPING_STATUS ENUM (if needed)
-- ============================================================================

-- Note: shipping_status enum already exists, but we ensure SHIPMENT_FAILED is available
-- This will be handled at application level as the enum might not support adding values easily

-- ============================================================================
-- 4. FUNCTION TO GET VALID SHIPROCKET TOKEN
-- ============================================================================

-- Function to get or refresh Shiprocket token
-- This will be called by the application layer
CREATE OR REPLACE FUNCTION get_shiprocket_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_token text;
  token_expiry timestamptz;
BEGIN
  -- Get the most recent token
  SELECT token, expires_at INTO current_token, token_expiry
  FROM shiprocket_tokens
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if token exists and is still valid (with 5 minute buffer)
  IF current_token IS NOT NULL AND token_expiry > (now() + interval '5 minutes') THEN
    RETURN current_token;
  END IF;

  -- Token expired or doesn't exist - return NULL to trigger refresh
  RETURN NULL;
END;
$$;

-- ============================================================================
-- 5. FUNCTION TO STORE SHIPROCKET TOKEN
-- ============================================================================

CREATE OR REPLACE FUNCTION store_shiprocket_token(
  p_token text,
  p_expires_in_seconds integer DEFAULT 72000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete old tokens
  DELETE FROM shiprocket_tokens WHERE expires_at < now();

  -- Insert new token
  INSERT INTO shiprocket_tokens (token, expires_at, updated_at)
  VALUES (
    p_token,
    now() + (p_expires_in_seconds || ' seconds')::interval,
    now()
  );
END;
$$;











