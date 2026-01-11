# Email Preferences Migration - Complete Guide

## SQL Migration Script

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  master_toggle boolean NOT NULL DEFAULT false,
  marketing_emails boolean NOT NULL DEFAULT true,
  new_arrivals boolean NOT NULL DEFAULT true,
  sale_announcements boolean NOT NULL DEFAULT true,
  restock_alerts boolean NOT NULL DEFAULT true,
  wishlist_alerts boolean NOT NULL DEFAULT true,
  abandoned_cart boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_preferences_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email preferences" ON email_preferences;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_uid FROM users WHERE users.id = email_preferences.user_id
    )
  );
```

---

## RLS Policy Variants

### Variant Selection

Run this query to determine which variant to use:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'auth_uid';
```

- **If result returns 'auth_uid'** → Use **VARIANT A** (already applied above)
- **If result is empty** → Use **VARIANT B** (below)

**ZEYNORA Default**: Variant A is correct based on `phase_2_1_schema.sql`

### VARIANT A (Applied Above)

```sql
CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_uid FROM users WHERE users.id = email_preferences.user_id
    )
  );
```

### VARIANT B (Alternative - Only if auth_uid doesn't exist)

```sql
DROP POLICY IF EXISTS "Users can view own email preferences" ON email_preferences;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = email_preferences.user_id
      AND users.auth_uid = auth.uid()
    )
  );
```

**Note**: Variant B requires different authentication mapping. Consult DBA if needed.

---

## Verification SQL Queries

### 1. Check Table Existence

```sql
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'email_preferences';
```

**Expected**: 1 row with table_name = 'email_preferences'

### 2. Check Columns

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'email_preferences'
ORDER BY ordinal_position;
```

**Expected**: 11 columns with correct types

### 3. Check Indexes

```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'email_preferences'
ORDER BY indexname;
```

**Expected**: Primary key index + idx_email_preferences_user

### 4. Check Foreign Key Constraint

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'email_preferences';
```

**Expected**: Foreign key to users.id

### 5. Check RLS is Enabled

```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'email_preferences';
```

**Expected**: rowsecurity = true

### 6. Check RLS Policy Exists

```sql
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
  AND tablename = 'email_preferences'
ORDER BY policyname;
```

**Expected**: At least one SELECT policy

### 7. Test Unique Constraint (DO NOT RUN IN PRODUCTION)

```sql
-- First insert (should succeed):
INSERT INTO email_preferences (user_id)
VALUES ((SELECT id FROM users LIMIT 1));

-- Second insert for same user (should fail):
INSERT INTO email_preferences (user_id)
VALUES ((SELECT id FROM users LIMIT 1));
-- Expected: ERROR: duplicate key value violates unique constraint "email_preferences_user_unique"
```

### 8. Test RLS Policy Behavior

**Via Supabase JS Client (anon key):**
```javascript
const { data, error } = await supabase
  .from('email_preferences')
  .select('*')
  .eq('user_id', '<your_user_id>');
// Expected: Returns only rows where user_id matches authenticated user
```

**Via psql (as postgres superuser, RLS is bypassed):**
```sql
SELECT * FROM email_preferences;
-- Expected: Returns all rows (superuser bypasses RLS)
```

---

## Post-Migration Checklist

### 1. Review Indexes
- [ ] Verify `idx_email_preferences_user` exists
- [ ] Check index is being used in query plans

### 2. Run ANALYZE
```sql
ANALYZE email_preferences;
```

### 3. Validate with Supabase Table Editor
- [ ] Go to Supabase Dashboard → Table Editor
- [ ] Verify `email_preferences` table appears
- [ ] Check all columns are present with correct types
- [ ] Verify default values are set correctly

### 4. Confirm RLS is Applied
- [ ] Go to Supabase Dashboard → Authentication → Policies
- [ ] Verify policy "Users can view own email preferences" exists
- [ ] Check policy is enabled

### 5. Test with Anon vs Service Role

**Test as authenticated user (anon key):**
```javascript
const { data } = await supabase
  .from('email_preferences')
  .select('*');
// Should only see own preferences
```

**Test as service role (bypasses RLS):**
```javascript
const { data } = await serviceSupabase
  .from('email_preferences')
  .select('*');
// Should see all preferences
```

### 6. Test Default Preferences Creation
- [ ] Create a new user account
- [ ] Verify default preferences are created automatically
- [ ] Check all optional categories default to `true`
- [ ] Check `master_toggle` defaults to `false`

### 7. Test Application Integration
- [ ] Navigate to `/account/email-preferences`
- [ ] Verify page loads without errors
- [ ] Test toggling preferences
- [ ] Verify changes are saved
- [ ] Test master toggle functionality

---

## Changelog

### Version 1.0.0 — Phase 6.8 Email Preferences Migration

- **Added**: `email_preferences` table with all required columns
- **Added**: Unique constraint on `user_id` (one preference record per user)
- **Added**: Foreign key constraint to `users(id)` with CASCADE delete
- **Added**: Index on `user_id` for performance
- **Added**: RLS enabled with SELECT policy (users can view own preferences)
- **Added**: Default values for all boolean fields (optional emails default to true)
- **Security**: RLS policies enforce user-level access control
- **Note**: INSERT/UPDATE/DELETE handled via service role client (bypasses RLS)

---

**SQL GENERATED — DO NOT RUN; REVIEW THEN EXECUTE MANUALLY.**




















