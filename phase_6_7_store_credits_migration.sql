/* ============================================================================
   PHASE 6.7 — STORE CREDIT SYSTEM MIGRATION
   ZEYNORA — Supabase / PostgreSQL Migration Script
   
   SUMMARY:
   This migration creates the complete Store Credit system infrastructure:
   - store_credits: User wallet balances (one row per user)
   - store_credit_transactions: All credit/debit transaction logs
   - one_time_codes: Secure codes for in-store redemption (15-min expiry)
   - return_requests: Return request tracking (if not exists)
   
   Includes RLS policies, indexes, constraints, and verification queries.
   
   IMPORTANT: This script is IDEMPOTENT and NON-DESTRUCTIVE.
   Review all sections before execution. DO NOT RUN automatically.
   ============================================================================ */

/* ----------------------------------------------------------------------------
   PREREQUISITE CHECK
   ----------------------------------------------------------------------------
   Before running, verify these tables exist:
   - users (with id uuid PRIMARY KEY)
   - orders (with id uuid PRIMARY KEY) — only if return_requests is needed
   
   If users table does NOT exist, STOP and report:
   [MISSING — PRE-EXISTING TABLE REQUIRED: users]
   
   If orders table does NOT exist but return_requests is needed, list:
   [MISSING — PRE-EXISTING TABLE REQUIRED: orders]
   ---------------------------------------------------------------------------- */

/* ----------------------------------------------------------------------------
   EXTENSION: pgcrypto
   ----------------------------------------------------------------------------
   Required for gen_random_uuid() function.
   Note: Supabase typically has this enabled. If you get a permission error,
   contact your DBA to enable the extension at the database level.
   ---------------------------------------------------------------------------- */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* ----------------------------------------------------------------------------
   TABLE 1: store_credits
   ----------------------------------------------------------------------------
   Stores wallet balance per user. One row per user (enforced by UNIQUE constraint).
   Balance is stored as numeric(12,2) to support precise decimal calculations.
   ---------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS store_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_credits_user_unique UNIQUE (user_id)
);

COMMENT ON TABLE store_credits IS 'User wallet balances for store credits. One row per user.';
COMMENT ON COLUMN store_credits.balance IS 'Current wallet balance. Must be >= 0.';
COMMENT ON COLUMN store_credits.updated_at IS 'Last balance update timestamp.';

CREATE INDEX IF NOT EXISTS idx_store_credits_user ON store_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_store_credits_updated ON store_credits(updated_at DESC);

/* ----------------------------------------------------------------------------
   TABLE 2: store_credit_transactions
   ----------------------------------------------------------------------------
   Transaction log for all credit additions and deductions.
   Each transaction records: type (credit/debit), amount, reference (order/return ID),
   and optional notes. Used for audit trail and expiry calculation.
   ---------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS store_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reference text, -- order_id or return_id
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE store_credit_transactions IS 'Transaction log for all store credit operations.';
COMMENT ON COLUMN store_credit_transactions.type IS 'credit = added, debit = deducted';
COMMENT ON COLUMN store_credit_transactions.reference IS 'Optional reference to order_id or return_id';
COMMENT ON COLUMN store_credit_transactions.created_at IS 'Transaction timestamp. Used for 12-month expiry calculation.';

CREATE INDEX IF NOT EXISTS idx_store_credit_transactions_user ON store_credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_store_credit_transactions_created ON store_credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_credit_transactions_reference ON store_credit_transactions(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_credit_transactions_type ON store_credit_transactions(type);

/* ----------------------------------------------------------------------------
   TABLE 3: one_time_codes
   ----------------------------------------------------------------------------
   Secure one-time codes for in-store redemption.
   Codes expire after 15 minutes and can only be used once.
   Used by store staff to redeem customer credits at physical locations.
   ---------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS one_time_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE one_time_codes IS 'One-time secure codes for in-store redemption. Expires in 15 minutes.';
COMMENT ON COLUMN one_time_codes.code IS 'Unique alphanumeric code (8 characters, uppercase)';
COMMENT ON COLUMN one_time_codes.expires_at IS 'Code expiration timestamp (15 minutes from creation)';
COMMENT ON COLUMN one_time_codes.used IS 'Whether code has been redeemed';

CREATE INDEX IF NOT EXISTS idx_one_time_codes_code ON one_time_codes(code);
CREATE INDEX IF NOT EXISTS idx_one_time_codes_user ON one_time_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_codes_expires ON one_time_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_one_time_codes_used ON one_time_codes(used) WHERE used = false;

/* ----------------------------------------------------------------------------
   TABLE 4: return_requests (OPTIONAL — only if not already exists)
   ----------------------------------------------------------------------------
   Tracks return requests and their status.
   Used by the "Release Credits" feature after warehouse verification.
   ---------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('requested', 'approved', 'received', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE return_requests IS 'Return request tracking. Used for credit release workflow.';
COMMENT ON COLUMN return_requests.status IS 'Return workflow status: requested -> approved -> received -> completed';

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user ON return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);

/* ----------------------------------------------------------------------------
   TRIGGER: Update store_credits.updated_at on balance change
   ----------------------------------------------------------------------------
   Automatically updates updated_at timestamp when balance changes.
   ---------------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION update_store_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_store_credits_updated_at ON store_credits;
CREATE TRIGGER trg_store_credits_updated_at
BEFORE UPDATE ON store_credits
FOR EACH ROW
EXECUTE FUNCTION update_store_credits_timestamp();

/* ----------------------------------------------------------------------------
   TRIGGER: Update return_requests.updated_at on status change
   ----------------------------------------------------------------------------
   Automatically updates updated_at timestamp when status changes.
   ---------------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION update_return_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_return_requests_updated_at ON return_requests;
CREATE TRIGGER trg_return_requests_updated_at
BEFORE UPDATE ON return_requests
FOR EACH ROW
EXECUTE FUNCTION update_return_requests_timestamp();

/* ============================================================================
   END OF TABLE CREATION
   ============================================================================ */




















