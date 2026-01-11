/* phase_2_2_rls.sql

   Zeynora — Phase 2.2: Safe RLS Configuration
   
   Objectives:
   1. Enable RLS on public-facing catalog tables (products, variants, images, categories, collections).
   2. Create strict PUBLIC READ policies (filtering for active items).
   3. Ensure writes are blocked for PUBLIC (implicit deny by default RLS behavior).
   4. Service Role bypasses RLS automatically.
   5. Placeholder comments for future Admin policies.

   Run this file in Supabase SQL Editor.
*/

/* ---------- 1. ENABLE ROW LEVEL SECURITY ---------- */

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Product Variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Product Images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;


/* ---------- 2. PUBLIC READ POLICIES (anon) ---------- */
-- Note: 'anon' role is the default public unauthenticated role in Supabase.
-- We use 'public' role name in policies which covers both 'anon' and 'authenticated' (if logged in users browse catalog).
-- or specifically 'anon'. Usually for a storefront, 'public' (Postgres role) covers everyone including anon.

/* 
   Policy: products_read_public
   Condition: active = true
*/
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
ON products
FOR SELECT
TO public
USING (active = true);


/* 
   Policy: product_variants_read_public
   Condition: active = true AND parent product is active
   Note: Requires join/exists check against products table.
*/
DROP POLICY IF EXISTS "Public can view active variants of active products" ON product_variants;
CREATE POLICY "Public can view active variants of active products"
ON product_variants
FOR SELECT
TO public
USING (
  active = true 
  AND 
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.uid = product_variants.product_uid 
    AND products.active = true
  )
);


/* 
   Policy: product_images_read_public
   Condition: Parent product is active
*/
DROP POLICY IF EXISTS "Public can view images of active products" ON product_images;
CREATE POLICY "Public can view images of active products"
ON product_images
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.uid = product_images.product_uid 
    AND products.active = true
  )
);


/* 
   Policy: categories_read_public
   Condition: All categories are visible (no active flag in schema, assuming all are public or filtered by app logic if needed)
*/
DROP POLICY IF EXISTS "Public can view all categories" ON categories;
CREATE POLICY "Public can view all categories"
ON categories
FOR SELECT
TO public
USING (true);


/* 
   Policy: collections_read_public
   Condition: is_active = true
*/
DROP POLICY IF EXISTS "Public can view active collections" ON collections;
CREATE POLICY "Public can view active collections"
ON collections
FOR SELECT
TO public
USING (is_active = true);


/* ---------- 3. BLOCK PUBLIC WRITES (IMPLICIT) ---------- */

/*
   NOTE ON WRITES:
   By enabling RLS and ONLY providing FOR SELECT policies for the 'public' role,
   PostgreSQL implicitly DENIES all INSERT, UPDATE, and DELETE operations for the 'public' role.
   
   No explicit "DENY" policy is needed or available in standard RLS to block writes 
   when no "ALLOW" policy exists. The absence of a CREATE/UPDATE/DELETE policy 
   effectively secures the tables against public modification.
*/


/* ---------- 4. SERVICE ROLE ACCESS ---------- */

/*
   NOTE: 
   The Supabase 'service_role' (used by backend functions/scripts) automatically 
   bypasses RLS. No specific policy is required for the service_role to read/write 
   to these tables.
*/


/* ---------- 5. ADMIN POLICIES (PLACEHOLDERS) ---------- */

/*
   -----------------------------------------------------------------------
   TODO: Phase 3/4 - Admin Panel Security
   
   When the Admin Panel is implemented, we will add policies for authenticated
   users with specific roles (super_admin, admin, staff).
   
   Examples of future policies:
   
   -- CREATE POLICY "Admins can view all products" 
   -- ON products FOR SELECT 
   -- TO authenticated 
   -- USING ( 
   --   auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')) 
   -- );

   -- CREATE POLICY "Admins can update products" 
   -- ON products FOR UPDATE 
   -- TO authenticated 
   -- USING ( ... ) WITH CHECK ( ... );
   -----------------------------------------------------------------------
*/

/* ---------- END OF PHASE 2.2 RLS CONFIGURATION ---------- */



