/* ============================================================================
   PHASE 6.7 — STORE CREDIT SYSTEM RLS POLICIES
   ZEYNORA — Row Level Security Policies
   
   IMPORTANT: Choose the correct variant based on your users table structure.
   
   DETECTION METHOD:
   Run this query to check if users table has auth_uid column:
   
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'users' AND column_name = 'auth_uid';
   
   - If result returns 'auth_uid' → Use VARIANT A
   - If result is empty → Use VARIANT B
   ============================================================================ */

/* ----------------------------------------------------------------------------
   ENABLE ROW LEVEL SECURITY
   ---------------------------------------------------------------------------- */
ALTER TABLE store_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_time_codes ENABLE ROW LEVEL SECURITY;

/* ============================================================================
   VARIANT A: Users table HAS auth_uid column
   ============================================================================
   Use this variant if: users.auth_uid exists and maps to Supabase auth.uid()
   
   This is the RECOMMENDED variant for ZEYNORA based on phase_2_1_schema.sql
   ============================================================================ */

-- Store Credits Policies (Variant A)
DROP POLICY IF EXISTS "Users can view own credits" ON store_credits;
CREATE POLICY "Users can view own credits"
  ON store_credits FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_uid FROM users WHERE users.id = store_credits.user_id
    )
  );

-- Note: INSERT/UPDATE/DELETE are handled server-side via service role client
-- No policies needed for writes (service role bypasses RLS)

-- Store Credit Transactions Policies (Variant A)
DROP POLICY IF EXISTS "Users can view own transactions" ON store_credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON store_credit_transactions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_uid FROM users WHERE users.id = store_credit_transactions.user_id
    )
  );

-- One-Time Codes Policies (Variant A)
DROP POLICY IF EXISTS "Users can view own codes" ON one_time_codes;
CREATE POLICY "Users can view own codes"
  ON one_time_codes FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_uid FROM users WHERE users.id = one_time_codes.user_id
    )
  );

-- Admin Note (Variant A):
-- All INSERT/UPDATE/DELETE operations must use service role client (bypasses RLS).
-- Application code uses createServiceRoleClient() for all writes.
-- This ensures security while allowing server-side operations.

/* ============================================================================
   VARIANT B: Users table does NOT have auth_uid column
   ============================================================================
   Use this variant if: users table does NOT have auth_uid column
   
   ADAPTATION REQUIRED:
   If using Variant B, you must modify the application code to:
   1. Store Supabase auth.uid() directly in a users table column, OR
   2. Create a mapping table linking auth.users.id to users.id, OR
   3. Modify policies to use a different authentication mechanism
   
   This variant assumes users.id can be directly matched (NOT RECOMMENDED for security).
   ============================================================================ */

-- Store Credits Policies (Variant B) — COMMENTED OUT BY DEFAULT
/*
DROP POLICY IF EXISTS "Users can view own credits" ON store_credits;
CREATE POLICY "Users can view own credits"
  ON store_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = store_credits.user_id
      -- NOTE: You must add logic here to match auth.uid() to users.id
      -- This requires additional columns or a mapping table
    )
  );
*/

-- Store Credit Transactions Policies (Variant B) — COMMENTED OUT BY DEFAULT
/*
DROP POLICY IF EXISTS "Users can view own transactions" ON store_credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON store_credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = store_credit_transactions.user_id
      -- NOTE: You must add logic here to match auth.uid() to users.id
    )
  );
*/

-- One-Time Codes Policies (Variant B) — COMMENTED OUT BY DEFAULT
/*
DROP POLICY IF EXISTS "Users can view own codes" ON one_time_codes;
CREATE POLICY "Users can view own codes"
  ON one_time_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = one_time_codes.user_id
      -- NOTE: You must add logic here to match auth.uid() to users.id
    )
  );
*/

/* ============================================================================
   ADMIN POLICIES (OPTIONAL — for direct admin access via Supabase UI)
   ============================================================================
   These policies allow admins to view all records via Supabase Dashboard.
   Only enable if you want admin users to access via Supabase UI.
   
   NOTE: Application code uses service role client, so these are optional.
   ============================================================================ */

-- Admin can view all credits (requires admin_audit_logs or role check)
-- Uncomment and adapt if needed:
/*
CREATE POLICY "Admins can view all credits"
  ON store_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_uid = auth.uid() 
      AND users.role IN ('super_admin', 'admin')
    )
  );
*/

/* ============================================================================
   POLICY SUMMARY
   ============================================================================
   
   SELECT Policies:
   - Users can view their own credits, transactions, and codes
   - Variant A: Uses auth_uid mapping (RECOMMENDED)
   - Variant B: Requires adaptation (NOT RECOMMENDED)
   
   INSERT/UPDATE/DELETE:
   - NO policies needed (all writes use service role client)
   - Service role bypasses RLS automatically
   - Application code ensures proper authorization before writes
   
   SECURITY MODEL:
   - RLS provides defense-in-depth for SELECT operations
   - Service role client ensures server-side writes are secure
   - Application-level authorization checks prevent unauthorized operations
   ============================================================================ */




















