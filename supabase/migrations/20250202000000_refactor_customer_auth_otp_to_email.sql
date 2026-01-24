-- Refactor Customer Auth OTP from Mobile to Email
-- Changes customer_auth_otps table to use email as primary identifier
-- This aligns with database schema where email is PRIMARY and UNIQUE

-- ============================================================================
-- 1. ADD EMAIL COLUMN
-- ============================================================================
ALTER TABLE customer_auth_otps ADD COLUMN IF NOT EXISTS email text;

-- ============================================================================
-- 2. MIGRATE EXISTING DATA (if any)
-- ============================================================================
-- Note: This is ephemeral data (expires in 1 hour), safe to drop if migration fails
-- Attempt to migrate existing mobile-based OTPs to email by looking up customer email
-- If customer doesn't exist or has no email, the OTP record will be invalid
-- This is acceptable as OTPs expire quickly

UPDATE customer_auth_otps
SET email = (
  SELECT customers.email
  FROM customers
  WHERE customers.phone = CONCAT('+91', customer_auth_otps.mobile)
  LIMIT 1
)
WHERE email IS NULL AND mobile IS NOT NULL;

-- Delete any OTPs that couldn't be migrated (no matching customer email)
-- These are expired/invalid anyway
DELETE FROM customer_auth_otps WHERE email IS NULL;

-- ============================================================================
-- 3. MAKE EMAIL NOT NULL
-- ============================================================================
ALTER TABLE customer_auth_otps ALTER COLUMN email SET NOT NULL;

-- ============================================================================
-- 4. DROP MOBILE COLUMN
-- ============================================================================
ALTER TABLE customer_auth_otps DROP COLUMN IF EXISTS mobile;

-- ============================================================================
-- 5. UPDATE INDEXES
-- ============================================================================
-- Drop old mobile-based indexes
DROP INDEX IF EXISTS idx_customer_auth_otps_mobile;
DROP INDEX IF EXISTS idx_customer_auth_otps_mobile_purpose;

-- Create new email-based indexes
CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_email ON customer_auth_otps(email);
CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_email_purpose ON customer_auth_otps(email, purpose);

-- Keep existing indexes (expires, verified, locked)
-- These remain unchanged

-- ============================================================================
-- 6. UPDATE RATE LIMITS TABLE
-- ============================================================================
-- Add "email" as valid identifier_type for rate limiting
ALTER TABLE order_tracking_rate_limits 
  DROP CONSTRAINT IF EXISTS order_tracking_rate_limits_identifier_type_check;

ALTER TABLE order_tracking_rate_limits 
  ADD CONSTRAINT order_tracking_rate_limits_identifier_type_check 
  CHECK (identifier_type IN ('ip', 'mobile', 'order_id', 'email'));

-- ============================================================================
-- 7. UPDATE COMMENTS
-- ============================================================================
COMMENT ON COLUMN customer_auth_otps.email IS 'Email address for OTP delivery and lookup (normalized, lowercase)';
COMMENT ON TABLE customer_auth_otps IS 'OTP requests for customer authentication. OTPs are hashed before storage. Uses email as primary identifier.';
