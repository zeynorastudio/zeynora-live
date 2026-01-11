-- Phase 3.4 — Global Shipping Defaults
-- Adds assumed_weight column to orders table for analytics

-- ============================================================================
-- 1. ADD ASSUMED_WEIGHT COLUMN TO ORDERS TABLE
-- ============================================================================

-- Add assumed_weight column (stores the global default weight used for this shipment)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'assumed_weight'
  ) THEN
    ALTER TABLE orders ADD COLUMN assumed_weight numeric(5,2) DEFAULT 1.5;
    COMMENT ON COLUMN orders.assumed_weight IS 'Phase 3.4: Assumed weight (kg) used for shipping calculation. Always 1.5 kg per global default.';
  END IF;
END $$;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_assumed_weight ON orders(assumed_weight);

-- ============================================================================
-- 2. UPDATE EXISTING ORDERS (OPTIONAL - FOR RETROACTIVE DATA)
-- ============================================================================

-- Set assumed_weight for existing orders that don't have it
-- Note: Historical orders retain their original values, this only sets NULL values
UPDATE orders 
SET assumed_weight = 1.5 
WHERE assumed_weight IS NULL;

-- ============================================================================
-- NOTES
-- ============================================================================
-- - assumed_weight is always 1.5 kg per Phase 3.4 requirements
-- - This field is visible to super_admin and admin, NOT to staff
-- - Used for analytics and reporting only
-- - Historical orders retain their original assumed_weight values










