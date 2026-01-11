/* ============================================================================
   PHASE 6.7 — STORE CREDIT SYSTEM VERIFICATION QUERIES
   ZEYNORA — Post-Migration Verification Script
   
   Run these queries after migration to verify successful creation.
   ============================================================================ */

/* ----------------------------------------------------------------------------
   VERIFICATION 1: Check table existence
   ---------------------------------------------------------------------------- */
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'store_credits',
    'store_credit_transactions',
    'one_time_codes',
    'return_requests'
  )
ORDER BY table_name;

-- Expected: 4 rows (or 3 if return_requests already existed)

/* ----------------------------------------------------------------------------
   VERIFICATION 2: Check columns and constraints
   ---------------------------------------------------------------------------- */
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'store_credits',
    'store_credit_transactions',
    'one_time_codes',
    'return_requests'
  )
ORDER BY table_name, ordinal_position;

-- Expected: Multiple rows showing all columns with correct types

/* ----------------------------------------------------------------------------
   VERIFICATION 3: Check indexes
   ---------------------------------------------------------------------------- */
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'store_credits',
    'store_credit_transactions',
    'one_time_codes',
    'return_requests'
  )
ORDER BY tablename, indexname;

-- Expected: Multiple indexes including primary keys and custom indexes

/* ----------------------------------------------------------------------------
   VERIFICATION 4: Check foreign key constraints
   ---------------------------------------------------------------------------- */
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'store_credits',
    'store_credit_transactions',
    'one_time_codes',
    'return_requests'
  )
ORDER BY tc.table_name;

-- Expected: Foreign keys to users.id (and orders.id for return_requests)

/* ----------------------------------------------------------------------------
   VERIFICATION 5: Check RLS is enabled
   ---------------------------------------------------------------------------- */
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'store_credits',
    'store_credit_transactions',
    'one_time_codes'
  )
ORDER BY tablename;

-- Expected: rowsecurity = true for all three tables

/* ----------------------------------------------------------------------------
   VERIFICATION 6: Check RLS policies exist
   ---------------------------------------------------------------------------- */
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'store_credits',
    'store_credit_transactions',
    'one_time_codes'
  )
ORDER BY tablename, policyname;

-- Expected: At least one SELECT policy per table (Variant A or B)

/* ----------------------------------------------------------------------------
   VERIFICATION 7: Check triggers
   ---------------------------------------------------------------------------- */
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'store_credits',
    'return_requests'
  )
ORDER BY event_object_table, trigger_name;

-- Expected: Triggers for updated_at on store_credits and return_requests

/* ----------------------------------------------------------------------------
   VERIFICATION 8: Test constraint (balance >= 0)
   ----------------------------------------------------------------------------
   This should FAIL if constraint is working:
   ---------------------------------------------------------------------------- */
-- DO NOT RUN IN PRODUCTION — This is a test that should fail
/*
INSERT INTO store_credits (user_id, balance)
VALUES (
  (SELECT id FROM users LIMIT 1),
  -100
);
-- Expected: ERROR: new row violates check constraint "store_credits_balance_check"
*/

/* ----------------------------------------------------------------------------
   VERIFICATION 9: Test unique constraint (one wallet per user)
   ----------------------------------------------------------------------------
   This should FAIL if constraint is working:
   ---------------------------------------------------------------------------- */
-- DO NOT RUN IN PRODUCTION — This is a test that should fail
/*
-- First insert (should succeed):
INSERT INTO store_credits (user_id, balance)
VALUES (
  (SELECT id FROM users LIMIT 1),
  100
);

-- Second insert for same user (should fail):
INSERT INTO store_credits (user_id, balance)
VALUES (
  (SELECT id FROM users LIMIT 1),
  200
);
-- Expected: ERROR: duplicate key value violates unique constraint "store_credits_user_unique"
*/

/* ----------------------------------------------------------------------------
   VERIFICATION 10: Test RLS policy (requires authenticated user)
   ----------------------------------------------------------------------------
   Run this as an authenticated user via Supabase client:
   ---------------------------------------------------------------------------- */
-- Via Supabase JS Client (anon key):
/*
const { data, error } = await supabase
  .from('store_credits')
  .select('*')
  .eq('user_id', '<your_user_id>');

// Expected: Returns only rows where user_id matches authenticated user
// If no match, returns empty array (not error)
*/

-- Via psql (as postgres superuser, RLS is bypassed):
-- SELECT * FROM store_credits;
-- Expected: Returns all rows (superuser bypasses RLS)

/* ============================================================================
   SUPABASE CLI VERIFICATION COMMANDS
   ============================================================================
   
   1. Check tables exist:
      supabase db diff --schema public
   
   2. Connect to database:
      supabase db connect
   
   3. Run verification queries above
   
   4. Test RLS via Supabase Dashboard:
      - Go to Table Editor
      - Try to SELECT from store_credits as different users
      - Verify users can only see their own records
   ============================================================================ */




















