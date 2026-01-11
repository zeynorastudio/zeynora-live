-- Customer Authentication OTP Migration
-- Creates table for OTP-based customer authentication
-- Reuses pattern from order_tracking_otps but scoped to mobile only (no order_id)

CREATE TABLE IF NOT EXISTS customer_auth_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile text NOT NULL, -- Normalized 10-digit phone number
  otp_hash text NOT NULL, -- Hashed OTP (never store plain OTP)
  purpose text NOT NULL DEFAULT 'CUSTOMER_AUTH',
  expires_at timestamptz NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  locked_until timestamptz, -- Lockout timestamp
  ip_address text, -- For rate limiting
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_mobile ON customer_auth_otps(mobile);
CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_expires ON customer_auth_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_verified ON customer_auth_otps(verified) WHERE verified = false;
CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_locked ON customer_auth_otps(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_auth_otps_mobile_purpose ON customer_auth_otps(mobile, purpose);

COMMENT ON TABLE customer_auth_otps IS 'OTP requests for customer authentication. OTPs are hashed before storage.';
COMMENT ON COLUMN customer_auth_otps.mobile IS 'Normalized 10-digit phone number (no +91 prefix)';
COMMENT ON COLUMN customer_auth_otps.otp_hash IS 'SHA-256 hash of the OTP. Never store plain OTP.';
COMMENT ON COLUMN customer_auth_otps.purpose IS 'Purpose of OTP (always CUSTOMER_AUTH for this feature)';
COMMENT ON COLUMN customer_auth_otps.expires_at IS 'OTP expiration (5 minutes from creation)';
COMMENT ON COLUMN customer_auth_otps.locked_until IS 'Lockout timestamp (15 minutes after max attempts)';

-- Add index on customers.phone for mobile lookup (if phone column exists)
-- Note: This assumes customers table has a phone column
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;

-- Cleanup function for expired customer auth OTPs
CREATE OR REPLACE FUNCTION cleanup_customer_auth_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired OTPs (older than 1 hour)
  DELETE FROM customer_auth_otps
  WHERE expires_at < now() - interval '1 hour';
END;
$$;

COMMENT ON FUNCTION cleanup_customer_auth_otps IS 'Cleans up expired customer auth OTPs. Should be called by cron job.';









