/**
 * Migration: Add shipping address fields directly to orders table
 * 
 * This allows orders to store shipping address without requiring
 * a separate addresses table entry, which is critical for guest orders
 * and ensures shipping address is always available for shipment creation.
 */

-- Add shipping address fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_name text,
ADD COLUMN IF NOT EXISTS shipping_phone text,
ADD COLUMN IF NOT EXISTS shipping_email text,
ADD COLUMN IF NOT EXISTS shipping_address1 text,
ADD COLUMN IF NOT EXISTS shipping_address2 text,
ADD COLUMN IF NOT EXISTS shipping_city text,
ADD COLUMN IF NOT EXISTS shipping_state text,
ADD COLUMN IF NOT EXISTS shipping_pincode text,
ADD COLUMN IF NOT EXISTS shipping_country text DEFAULT 'India';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_shipping_pincode ON orders(shipping_pincode);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_phone ON orders(shipping_phone);

-- Add comment for documentation
COMMENT ON COLUMN orders.shipping_name IS 'Recipient name for shipping';
COMMENT ON COLUMN orders.shipping_phone IS 'Contact phone (10 digits) for shipping';
COMMENT ON COLUMN orders.shipping_email IS 'Email for shipping notifications';
COMMENT ON COLUMN orders.shipping_address1 IS 'Primary shipping address line';
COMMENT ON COLUMN orders.shipping_address2 IS 'Secondary shipping address line (optional)';
COMMENT ON COLUMN orders.shipping_city IS 'Shipping city';
COMMENT ON COLUMN orders.shipping_state IS 'Shipping state/province';
COMMENT ON COLUMN orders.shipping_pincode IS 'Shipping pincode (6 digits)';
COMMENT ON COLUMN orders.shipping_country IS 'Shipping country (default: India)';
