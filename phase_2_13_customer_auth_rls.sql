/* phase_2_13_customer_auth_rls.sql */

/* Ensure users table RLS allows customer registration */

-- Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own record during registration
-- This allows the client-side register flow to create a user record
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = auth_uid);

-- Policy: Users can view their own record
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  USING (auth.uid() = auth_uid);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  USING (auth.uid() = auth_uid);

/* Note: Admin users (admin/super_admin roles) should have separate policies
   or use service_role client for admin operations. This RLS is for customer self-service. */



