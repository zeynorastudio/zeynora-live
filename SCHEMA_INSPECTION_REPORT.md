# Database Schema Inspection Report

## 1. `users` Table Schema

**Primary Key:** `id` (uuid, DEFAULT gen_random_uuid())

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `auth_uid` uuid UNIQUE (links to Supabase Auth user.id)
- `email` text NOT NULL
- `full_name` text NULL
- `phone` text NULL
- `role` z_role_type DEFAULT 'customer' (enum: 'super_admin', 'admin', 'staff', 'customer')
- `is_active` boolean DEFAULT true
- `metadata` jsonb DEFAULT '{}'::jsonb
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

**Sample Admin Rows (to be queried):**
- Query needed: `SELECT id, email, role FROM users WHERE role IN ('super_admin', 'admin', 'staff') LIMIT 3;`

## 2. `addresses` Table Schema

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` uuid REFERENCES users(id) ON DELETE CASCADE
- `full_name` text NULL
- `phone` text NULL
- `line1` text NULL
- `line2` text NULL
- `city` text NULL
- `state` text NULL
- `pincode` text NULL
- `country` text DEFAULT 'India'
- `is_default` boolean DEFAULT false
- `created_at` timestamptz NOT NULL DEFAULT now()

**Note:** Currently references `users.id`. For customers, we'll need to query addresses via customer -> user mapping or add customer_id column. However, per requirements, we should keep addresses table as-is and enforce max 3 in server actions.

## 3. `carts` Table Schema

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `session_id` text UNIQUE (guest session id)
- `user_id` uuid REFERENCES users(id) ON DELETE SET NULL
- `currency` text DEFAULT 'INR'
- `subtotal` numeric(12,2) DEFAULT 0
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

**Note:** Currently references `users.id`. For guest merge, we'll reassign `session_id` carts to customer's user_id.

## 4. `wishlist_items` Table Schema

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` uuid REFERENCES users(id) ON DELETE CASCADE
- `product_uid` text REFERENCES products(uid) ON DELETE CASCADE
- `variant_sku` text NULL
- `created_at` timestamptz NOT NULL DEFAULT now()
- UNIQUE (user_id, product_uid, variant_sku)

**Note:** Currently references `users.id`. For guest merge, we'll need to reassign wishlist items to customer's user_id.

## 5. `customers` Table Status

**Status:** DOES NOT EXIST

**Required Migration:** See `migrations/create_customers_table.sql`

## Schema Compatibility Analysis

**ISSUE:** 
- `addresses.user_id` references `users.id` (uuid)
- `carts.user_id` references `users.id` (uuid)  
- `wishlist_items.user_id` references `users.id` (uuid)

**SOLUTION:**
Since we cannot modify existing tables per requirements, we have two options:
1. Keep using `users.id` for addresses/carts/wishlist, but ensure customers have corresponding users rows
2. Add `customer_id` columns to these tables (requires migration approval)

**RECOMMENDATION:** 
For Phase 1, we'll create customers table and map customers to users via auth_uid. When a customer signs up, we'll:
- Create auth user
- Create customer row with auth_uid
- Optionally create/update users row for backward compatibility (but mark role as 'customer')

However, per requirements, we should NOT modify users table. So we'll:
- Create customers table separately
- For addresses/carts/wishlist, we'll query via customer -> auth_uid -> users.id mapping
- OR we'll need to add customer_id columns (requires migration)

**BLOCKER:** Need to decide on addresses/carts/wishlist foreign key strategy.

















