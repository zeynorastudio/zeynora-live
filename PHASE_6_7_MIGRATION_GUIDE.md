# PHASE 6.7 — STORE CREDIT SYSTEM MIGRATION GUIDE

## 📋 EXECUTIVE SUMMARY

This migration creates the complete Store Credit system infrastructure for ZEYNORA, including:
- **store_credits**: User wallet balances (one row per user, balance >= 0)
- **store_credit_transactions**: Complete audit trail of all credit/debit operations
- **one_time_codes**: Secure codes for in-store redemption (15-minute expiry)
- **return_requests**: Return request tracking (optional, if not exists)

The migration is **idempotent** and **non-destructive**, using `IF NOT EXISTS` clauses throughout. All tables include RLS policies, indexes, constraints, and triggers for automatic timestamp updates.

---

## 🗂️ FILES PROVIDED

1. **phase_6_7_store_credits_migration.sql** - Main migration script (tables, indexes, triggers)
2. **phase_6_7_store_credits_rls_policies.sql** - RLS policies (Variant A and B)
3. **phase_6_7_store_credits_verification.sql** - Verification queries
4. **PHASE_6_7_MIGRATION_GUIDE.md** - This document

---

## ⚠️ SAFETY CHECKLIST (REVIEW BEFORE EXECUTION)

### Pre-Migration Checklist

- [ ] **Backup**: Full database backup created
- [ ] **Environment**: Confirm you're in the correct Supabase project (dev/staging/prod)
- [ ] **Dependencies**: Verify `users` table exists with `id uuid PRIMARY KEY`
- [ ] **Dependencies**: Verify `orders` table exists (if using return_requests)
- [ ] **Permissions**: Confirm you have CREATE TABLE, CREATE INDEX, CREATE POLICY permissions
- [ ] **Extension**: Verify `pgcrypto` extension is available (or request DBA enable it)
- [ ] **RLS Variant**: Determine which RLS variant to use (A or B) — see detection method below
- [ ] **Maintenance Window**: Schedule migration during low-traffic period
- [ ] **Rollback Plan**: Document rollback steps (DROP TABLE statements)

### Detection: Which RLS Variant to Use?

Run this query in Supabase SQL Editor:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'auth_uid';
```

**Result Interpretation:**
- ✅ **Returns 'auth_uid'** → Use **VARIANT A** (RECOMMENDED for ZEYNORA)
- ❌ **Returns empty** → Use **VARIANT B** (requires code adaptation)

**ZEYNORA Default**: Based on `phase_2_1_schema.sql`, Variant A is correct.

---

## 📝 EXECUTION STEPS

### Step 1: Review Prerequisites

```sql
-- Check users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
);

-- Check users table has required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('id', 'auth_uid');
```

**Expected**: Both queries return true/rows.

### Step 2: Execute Main Migration

1. Open **Supabase SQL Editor**
2. Copy contents of `phase_6_7_store_credits_migration.sql`
3. **Review** the entire script
4. Click **Run** (or press Ctrl+Enter)

**Expected Output**: 
- "Success. No rows returned" (for CREATE statements)
- No errors

### Step 3: Execute RLS Policies

1. **Determine Variant** (see detection method above)
2. Open `phase_6_7_store_credits_rls_policies.sql`
3. **Uncomment and execute** the appropriate variant:
   - **Variant A**: If `auth_uid` exists (RECOMMENDED)
   - **Variant B**: If `auth_uid` does NOT exist (requires code changes)

**Expected Output**: 
- Policies created successfully
- No errors

### Step 4: Verify Migration

1. Open `phase_6_7_store_credits_verification.sql`
2. Run each verification query sequentially
3. Compare results with expected outputs in comments

**Critical Checks:**
- ✅ All 4 tables exist
- ✅ All indexes created
- ✅ RLS enabled on store_credits, store_credit_transactions, one_time_codes
- ✅ Policies exist (check Variant A or B)
- ✅ Foreign keys to users.id exist

---

## 🔧 POST-MIGRATION MANUAL STEPS

### 1. Grant Extension Permissions (if needed)

If `pgcrypto` extension failed, request DBA to run:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2. Update Statistics

Run ANALYZE to update query planner statistics:

```sql
ANALYZE store_credits;
ANALYZE store_credit_transactions;
ANALYZE one_time_codes;
ANALYZE return_requests;
```

### 3. Test RLS Policies

**Via Supabase Dashboard:**
1. Go to **Table Editor** → `store_credits`
2. Try to SELECT as different users
3. Verify users can only see their own records

**Via Application:**
1. Log in as a test user
2. Call `/api/wallet/balance`
3. Verify response includes user's balance
4. Verify other users' balances are not visible

### 4. Create Scheduled Job (Optional)

For automatic credit expiry cleanup, create a scheduled function:

```sql
-- Create function to process expired credits
CREATE OR REPLACE FUNCTION process_expired_credits()
RETURNS void AS $$
BEGIN
  -- This function should call the application logic
  -- Or implement SQL-based expiry processing
  -- See lib/wallet/expiry.ts for reference implementation
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (if available) or external cron job
-- Example: Run daily at 2 AM
-- SELECT cron.schedule('process-expired-credits', '0 2 * * *', 'SELECT process_expired_credits()');
```

**Note**: Supabase doesn't include pg_cron by default. Use external cron or Supabase Edge Functions.

### 5. Update Application Code (if Variant B)

If you used **Variant B** (no auth_uid), you must:

1. Update `lib/wallet/index.ts` to handle user mapping
2. Update RLS policies to match your authentication model
3. Test all wallet operations end-to-end

---

## 📊 CHANGELOG

### Version 1.0.0 — Phase 6.7 Initial Migration

- **Added**: `store_credits` table with balance tracking
- **Added**: `store_credit_transactions` table with full audit trail
- **Added**: `one_time_codes` table for in-store redemption
- **Added**: `return_requests` table (optional, if not exists)
- **Added**: RLS policies (Variant A: auth_uid mapping)
- **Added**: Indexes for performance (user_id, created_at, code, etc.)
- **Added**: Constraints (balance >= 0, unique user_id, type check)
- **Added**: Triggers for automatic timestamp updates
- **Security**: RLS enabled, service role for writes, user-level SELECT policies

---

## 🚨 ROLLBACK PROCEDURE

If migration needs to be rolled back:

```sql
-- WARNING: This will DELETE ALL DATA in these tables
-- Only run if absolutely necessary

DROP TRIGGER IF EXISTS trg_store_credits_updated_at ON store_credits;
DROP TRIGGER IF EXISTS trg_return_requests_updated_at ON return_requests;

DROP POLICY IF EXISTS "Users can view own credits" ON store_credits;
DROP POLICY IF EXISTS "Users can view own transactions" ON store_credit_transactions;
DROP POLICY IF EXISTS "Users can view own codes" ON one_time_codes;

DROP TABLE IF EXISTS return_requests CASCADE;
DROP TABLE IF EXISTS one_time_codes CASCADE;
DROP TABLE IF EXISTS store_credit_transactions CASCADE;
DROP TABLE IF EXISTS store_credits CASCADE;

DROP FUNCTION IF EXISTS update_store_credits_timestamp();
DROP FUNCTION IF EXISTS update_return_requests_timestamp();
```

**⚠️ CAUTION**: This will permanently delete all store credit data. Ensure you have backups.

---

## ✅ VERIFICATION COMMANDS (Quick Reference)

```bash
# Via Supabase CLI
supabase db diff --schema public

# Via psql
psql <connection_string> -c "\dt store_credits*"
psql <connection_string> -c "\d store_credits"

# Via Supabase Dashboard
# Go to Table Editor → Check tables exist
# Go to Authentication → Policies → Check RLS policies
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue**: `ERROR: extension "pgcrypto" does not exist`
- **Solution**: Request DBA to enable extension, or use `gen_random_uuid()` from uuid-ossp

**Issue**: `ERROR: relation "users" does not exist`
- **Solution**: Create users table first (see phase_2_1_schema.sql)

**Issue**: RLS policies not working
- **Solution**: Verify Variant A/B selection, check auth_uid mapping, test with authenticated user

**Issue**: Foreign key constraint fails
- **Solution**: Verify users.id and orders.id exist and are uuid type

---

## 🎯 NEXT STEPS AFTER MIGRATION

1. ✅ Run verification queries
2. ✅ Test RLS policies
3. ✅ Deploy application code (Phase 6.7 implementation)
4. ✅ Test wallet operations end-to-end
5. ✅ Test checkout with credits
6. ✅ Test return credit release
7. ✅ Test one-time code redemption
8. ✅ Monitor performance and adjust indexes if needed

---

## ⚠️ FINAL REMINDER

**NO EXECUTION** — This migration must be reviewed and executed manually by a DBA or authorized administrator. Do not run automatically in production.

---

**SQL GENERATED — DO NOT RUN; REVIEW THEN EXECUTE MANUALLY.**




















