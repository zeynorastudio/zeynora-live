-- Phase 4.1 — Order Tracking via OTP Migration
-- Creates tables for OTP-based order tracking without login

-- ============================================================================
-- 1. OTP REQUESTS TABLE
-- ============================================================================
-- Stores OTP requests with hashed OTPs, rate limiting, and lockout tracking

CREATE TABLE IF NOT EXISTS order_tracking_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mobile text NOT NULL, -- Normalized 10-digit phone number
  otp_hash text NOT NULL, -- Hashed OTP (never store plain OTP)
  purpose text NOT NULL DEFAULT 'ORDER_TRACKING',
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

CREATE INDEX IF NOT EXISTS idx_order_tracking_otps_order_mobile ON order_tracking_otps(order_id, mobile);
CREATE INDEX IF NOT EXISTS idx_order_tracking_otps_expires ON order_tracking_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_order_tracking_otps_verified ON order_tracking_otps(verified) WHERE verified = false;
CREATE INDEX IF NOT EXISTS idx_order_tracking_otps_locked ON order_tracking_otps(locked_until) WHERE locked_until IS NOT NULL;

COMMENT ON TABLE order_tracking_otps IS 'OTP requests for order tracking. OTPs are hashed before storage.';
COMMENT ON COLUMN order_tracking_otps.mobile IS 'Normalized 10-digit phone number (no +91 prefix)';
COMMENT ON COLUMN order_tracking_otps.otp_hash IS 'SHA-256 hash of the OTP. Never store plain OTP.';
COMMENT ON COLUMN order_tracking_otps.purpose IS 'Purpose of OTP (always ORDER_TRACKING for this feature)';
COMMENT ON COLUMN order_tracking_otps.expires_at IS 'OTP expiration (5 minutes from creation)';
COMMENT ON COLUMN order_tracking_otps.locked_until IS 'Lockout timestamp (15 minutes after max attempts)';

-- ============================================================================
-- 2. ORDER TRACKING TOKENS TABLE
-- ============================================================================
-- Stores temporary read-only access tokens for order tracking

CREATE TABLE IF NOT EXISTS order_tracking_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE, -- Secure random token
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  accessed_at timestamptz, -- Track when token was last accessed
  access_count integer NOT NULL DEFAULT 0, -- Track number of accesses
  ip_address text, -- For audit
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_tokens_token ON order_tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_order_tracking_tokens_order ON order_tracking_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_tokens_expires ON order_tracking_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_order_tracking_tokens_used ON order_tracking_tokens(used) WHERE used = false;

COMMENT ON TABLE order_tracking_tokens IS 'Temporary read-only access tokens for order tracking. Single-use, order-scoped.';
COMMENT ON COLUMN order_tracking_tokens.token IS 'Secure random token (32+ characters)';
COMMENT ON COLUMN order_tracking_tokens.expires_at IS 'Token expiration (24 hours from creation)';
COMMENT ON COLUMN order_tracking_tokens.used IS 'Whether token has been used (single-use)';

-- ============================================================================
-- 3. RATE LIMITING TABLE
-- ============================================================================
-- Tracks rate limit attempts per IP, mobile, and order_id

CREATE TABLE IF NOT EXISTS order_tracking_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address, mobile, or order_id
  identifier_type text NOT NULL CHECK (identifier_type IN ('ip', 'mobile', 'order_id')),
  action text NOT NULL CHECK (action IN ('request_otp', 'verify_otp', 'view_tracking')),
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, identifier_type, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_order_tracking_rate_limits_identifier ON order_tracking_rate_limits(identifier, identifier_type, action);
CREATE INDEX IF NOT EXISTS idx_order_tracking_rate_limits_window ON order_tracking_rate_limits(window_end);

COMMENT ON TABLE order_tracking_rate_limits IS 'Rate limiting for order tracking operations. Tracks attempts per IP, mobile, and order_id.';
COMMENT ON COLUMN order_tracking_rate_limits.identifier IS 'IP address, mobile number, or order_id';
COMMENT ON COLUMN order_tracking_rate_limits.window_end IS 'End of rate limit window (1 hour from window_start)';

-- ============================================================================
-- 4. CLEANUP FUNCTION
-- ============================================================================
-- Automatically clean up expired OTPs, tokens, and rate limit records

CREATE OR REPLACE FUNCTION cleanup_order_tracking_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired OTPs (older than 1 hour)
  DELETE FROM order_tracking_otps
  WHERE expires_at < now() - interval '1 hour';

  -- Delete expired tokens (older than 7 days)
  DELETE FROM order_tracking_tokens
  WHERE expires_at < now() - interval '7 days';

  -- Delete old rate limit records (older than 24 hours)
  DELETE FROM order_tracking_rate_limits
  WHERE window_end < now() - interval '24 hours';
END;
$$;

COMMENT ON FUNCTION cleanup_order_tracking_data IS 'Cleans up expired OTPs, tokens, and rate limit records. Should be called by cron job.';

-- ============================================================================
-- 5. RLS POLICIES (if RLS is enabled)
-- ============================================================================
-- These tables should NOT be accessible via public API
-- Only service role should access them

-- Note: RLS policies are not needed here as these tables should only be accessed
-- via service role client in API routes, not through public Supabase client

-- End of Phase 4.1 Migration










