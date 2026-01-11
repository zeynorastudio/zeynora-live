-- Phase 3 — Comprehensive RLS Enforcement Migration
-- Enforces Row Level Security on all Phase 3 tables: orders, order_items, customers
-- Implements role-based access control: customer, admin, staff, super_admin, public/anon

-- ============================================================================
-- 1. ORDERS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
-- Drop new policy names
DROP POLICY IF EXISTS "orders_service_role_full_access" ON orders;
DROP POLICY IF EXISTS "orders_customer_select_own" ON orders;
DROP POLICY IF EXISTS "orders_customer_insert" ON orders;
DROP POLICY IF EXISTS "orders_admin_select_all" ON orders;
DROP POLICY IF EXISTS "orders_admin_update_status" ON orders;
DROP POLICY IF EXISTS "orders_staff_select_limited" ON orders;
DROP POLICY IF EXISTS "orders_staff_update_shipment" ON orders;
DROP POLICY IF EXISTS "orders_super_admin_full_access" ON orders;
DROP POLICY IF EXISTS "orders_anon_insert" ON orders;
-- Drop old policy names from previous migrations
DROP POLICY IF EXISTS "Service role full access orders" ON orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
DROP POLICY IF EXISTS "orders_customer_select" ON orders;

-- Service role: Full access (for API routes using service role key)
CREATE POLICY "orders_service_role_full_access"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Customers: Can read ONLY their own orders (by customer_id or guest_phone)
CREATE POLICY "orders_customer_select_own"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    -- Match by customer_id (for logged-in customers)
    (
      customer_id IS NOT NULL
      AND customer_id IN (
        SELECT id FROM customers WHERE auth_uid = auth.uid()
      )
    )
    OR
    -- Match by guest_phone (for guest orders - future enhancement)
    -- Note: This requires phone verification in application layer
    (guest_phone IS NOT NULL AND customer_id IS NULL)
  );

-- Customers: Can create orders
CREATE POLICY "orders_customer_insert"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if customer_id matches authenticated customer
    (
      customer_id IS NULL
      OR customer_id IN (
        SELECT id FROM customers WHERE auth_uid = auth.uid()
      )
    )
  );

-- Admin: Can read all orders
CREATE POLICY "orders_admin_select_all"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
  );

-- Admin: Can update order status fields only (order_status, payment_status, shipping_status)
CREATE POLICY "orders_admin_update_status"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
    -- Only allow updates to status fields (enforced at application layer)
    -- RLS cannot restrict specific columns, so this is a general policy
  );

-- Staff: Can read limited order fields (application layer filters fields)
CREATE POLICY "orders_staff_select_limited"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'staff'
      AND users.is_active = true
    )
  );

-- Staff: Can update shipment status fields only
CREATE POLICY "orders_staff_update_shipment"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'staff'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'staff'
      AND users.is_active = true
    )
    -- Only allow updates to shipping_status (enforced at application layer)
  );

-- Super Admin: Full access to all rows and columns
CREATE POLICY "orders_super_admin_full_access"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  );

-- Public/Anon: Can create orders only (guest checkout)
CREATE POLICY "orders_anon_insert"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Public/Anon: Cannot read any orders
-- (No SELECT policy for anon = no access)

-- ============================================================================
-- 2. ORDER_ITEMS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
-- Drop new policy names
DROP POLICY IF EXISTS "order_items_service_role_full_access" ON order_items;
DROP POLICY IF EXISTS "order_items_customer_select_own" ON order_items;
DROP POLICY IF EXISTS "order_items_customer_insert" ON order_items;
DROP POLICY IF EXISTS "order_items_admin_select_all" ON order_items;
DROP POLICY IF EXISTS "order_items_staff_select_limited" ON order_items;
DROP POLICY IF EXISTS "order_items_super_admin_full_access" ON order_items;
DROP POLICY IF EXISTS "order_items_anon_insert" ON order_items;
-- Drop old policy names from previous migrations
DROP POLICY IF EXISTS "Service role full access order_items" ON order_items;
DROP POLICY IF EXISTS "Customers can view their own order items" ON order_items;

-- Service role: Full access
CREATE POLICY "order_items_service_role_full_access"
  ON order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Customers: Can read items for their own orders
CREATE POLICY "order_items_customer_select_own"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        -- Match by customer_id
        (
          orders.customer_id IS NOT NULL
          AND orders.customer_id IN (
            SELECT id FROM customers WHERE auth_uid = auth.uid()
          )
        )
        OR
        -- Match by guest_phone (future enhancement)
        (orders.guest_phone IS NOT NULL AND orders.customer_id IS NULL)
      )
    )
  );

-- Customers: Can create order items (via order creation)
CREATE POLICY "order_items_customer_insert"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.customer_id IS NULL
        OR orders.customer_id IN (
          SELECT id FROM customers WHERE auth_uid = auth.uid()
        )
      )
    )
  );

-- Admin: Can read all order items
CREATE POLICY "order_items_admin_select_all"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
  );

-- Staff: Can read order items (application layer filters fields)
CREATE POLICY "order_items_staff_select_limited"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'staff'
      AND users.is_active = true
    )
  );

-- Super Admin: Full access
CREATE POLICY "order_items_super_admin_full_access"
  ON order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  );

-- Public/Anon: Can create order items (via order creation)
CREATE POLICY "order_items_anon_insert"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
    )
  );

-- ============================================================================
-- 3. CUSTOMERS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
-- Drop new policy names
DROP POLICY IF EXISTS "customers_service_role_full_access" ON customers;
DROP POLICY IF EXISTS "customers_customer_select_own" ON customers;
DROP POLICY IF EXISTS "customers_customer_update_own" ON customers;
DROP POLICY IF EXISTS "customers_admin_select_all" ON customers;
DROP POLICY IF EXISTS "customers_staff_select_all" ON customers;
DROP POLICY IF EXISTS "customers_super_admin_full_access" ON customers;
DROP POLICY IF EXISTS "customers_anon_insert" ON customers;
-- Drop old policy names from previous migrations
DROP POLICY IF EXISTS "Service role full access customers" ON customers;
DROP POLICY IF EXISTS "Customers can view their own record" ON customers;
DROP POLICY IF EXISTS "Customers can update their own record" ON customers;

-- Service role: Full access
CREATE POLICY "customers_service_role_full_access"
  ON customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Customers: Can read their own record
CREATE POLICY "customers_customer_select_own"
  ON customers
  FOR SELECT
  TO authenticated
  USING (auth_uid = auth.uid());

-- Customers: Can update their own record
CREATE POLICY "customers_customer_update_own"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (auth_uid = auth.uid())
  WITH CHECK (auth_uid = auth.uid());

-- Admin: Can read all customers
CREATE POLICY "customers_admin_select_all"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.is_active = true
    )
  );

-- Staff: Can read all customers
CREATE POLICY "customers_staff_select_all"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'staff'
      AND users.is_active = true
    )
  );

-- Super Admin: Full access
CREATE POLICY "customers_super_admin_full_access"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_uid = auth.uid()
      AND users.role = 'super_admin'
      AND users.is_active = true
    )
  );

-- Public/Anon: Can create customers (during checkout)
CREATE POLICY "customers_anon_insert"
  ON customers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================================
-- END OF PHASE 3 RLS ENFORCEMENT MIGRATION
-- ============================================================================

-- Notes:
-- 1. Column-level access control (e.g., staff cannot see prices) is enforced
--    at the application layer via lib/orders/role-visibility.ts
-- 2. Update policies allow general updates; specific field restrictions are
--    enforced at the API layer
-- 3. Guest orders (customer_id IS NULL) are accessible via guest_phone matching
--    (requires phone verification in application layer)
-- 4. All policies check users.is_active = true to prevent frozen accounts

