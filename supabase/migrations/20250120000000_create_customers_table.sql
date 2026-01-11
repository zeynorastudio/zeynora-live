/* Migration: Create customers table
   ZEYNORA - Customer Authentication Flow
   
   This migration creates a separate customers table for customer authentication,
   keeping it completely separate from the admin users table.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid NULL UNIQUE,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Phone validation constraint (if provided, must match +91XXXXXXXXXX format)
  CONSTRAINT customers_phone_format CHECK (
    phone IS NULL OR phone ~ '^\+91[0-9]{10}$'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_auth_uid ON customers(auth_uid);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Add comment
COMMENT ON TABLE customers IS 'Customer accounts separate from admin users table';
COMMENT ON COLUMN customers.auth_uid IS 'Link to Supabase Auth user.id';
COMMENT ON COLUMN customers.phone IS 'Optional phone number. If provided, must match format: +91 followed by 10 digits';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_customers_updated_at();

-- RLS Policies (if needed - review based on your RLS strategy)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Customers can view their own record"
--   ON customers FOR SELECT
--   USING (auth.uid() = auth_uid);
-- 
-- CREATE POLICY "Customers can update their own record"
--   ON customers FOR UPDATE
--   USING (auth.uid() = auth_uid);

















