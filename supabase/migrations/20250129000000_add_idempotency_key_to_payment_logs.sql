-- Migration: Add idempotency_key to payment_logs for duplicate webhook prevention
-- Created: 2026-01-29
-- Purpose: Enforce database-level idempotency for Razorpay webhook processing
--
-- This migration adds a unique constraint on idempotency_key to prevent
-- duplicate webhook processing. When two webhooks arrive simultaneously,
-- the database will reject the second insert with a unique violation error.
--
-- SAFETY: This migration is safe to run on a live database.
-- - Column addition is nullable (no table lock)
-- - Index creation uses CONCURRENTLY (no blocking)
-- - Existing rows will have NULL idempotency_key (allowed by partial index)

-- Step 1: Add idempotency_key column (nullable)
-- This allows existing payment_logs records to remain unchanged
ALTER TABLE payment_logs 
ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Step 2: Create unique partial index on idempotency_key
-- Partial index only includes non-NULL values, allowing NULL for existing records
-- This is the CRITICAL constraint that prevents duplicate webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_logs_idempotency_key_unique
ON payment_logs(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Step 3: Create index for faster lookups by provider + idempotency_key
-- Used when checking if a webhook has already been processed
CREATE INDEX IF NOT EXISTS idx_payment_logs_provider_idempotency
ON payment_logs(provider, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Step 4: Add descriptive comment for documentation
COMMENT ON COLUMN payment_logs.idempotency_key IS 
  'Unique key for webhook idempotency. Format: razorpay_webhook_{event_id} or razorpay_webhook_{signature_hash}. Prevents duplicate processing of same webhook event.';

-- Step 5: Grant necessary permissions to service_role
-- (Already has access via existing RLS policies, but explicit grant for clarity)
GRANT SELECT, INSERT, UPDATE ON payment_logs TO service_role;
