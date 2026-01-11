# Comprehensive Database Schema Scan Report

## STEP A: SCHEMA SCAN RESULTS

### 1. `customers` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `auth_uid` uuid NULL UNIQUE (links to Supabase Auth)
- `email` text NOT NULL UNIQUE
- `first_name` text NOT NULL
- `last_name` text NOT NULL
- `phone` text NULL (format: +91XXXXXXXXXX)
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:** None

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Links to Supabase Auth via `auth_uid` column. This is the primary customer table.

---

### 2. `addresses` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` uuid REFERENCES users(id) ON DELETE CASCADE
- `customer_id` uuid REFERENCES customers(id) ON DELETE CASCADE (added in migration 20250120000001)
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

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `user_id` → `users(id)`
- `customer_id` → `customers(id)` (if migration applied)

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** References both `users.id` (for backward compatibility) and `customers.id` (new customer flow). RLS policies should check via `customers.auth_uid`.

---

### 3. `carts` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `session_id` text UNIQUE (guest session id)
- `user_id` uuid REFERENCES users(id) ON DELETE SET NULL
- `customer_id` uuid REFERENCES customers(id) ON DELETE SET NULL (added in migration 20250120000001)
- `currency` text DEFAULT 'INR'
- `subtotal` numeric(12,2) DEFAULT 0
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `user_id` → `users(id)`
- `customer_id` → `customers(id)` (if migration applied)

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Supports both authenticated users (via `user_id`) and guests (via `session_id`). RLS policies should allow authenticated users to access their own carts via `customers.auth_uid`.

---

### 4. `cart_items` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `cart_id` uuid REFERENCES carts(id) ON DELETE CASCADE
- `product_variant_id` uuid REFERENCES product_variants(id) ON DELETE RESTRICT
- `quantity` integer NOT NULL DEFAULT 1
- `price_snapshot` numeric(12,2) NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `cart_id` → `carts(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Access controlled via `carts` table. RLS policies should join through `carts` to `customers.auth_uid`.

---

### 5. `wishlist_items` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `user_id` uuid REFERENCES users(id) ON DELETE CASCADE
- `customer_id` uuid REFERENCES customers(id) ON DELETE CASCADE (added in migration 20250120000001)
- `product_uid` text REFERENCES products(uid) ON DELETE CASCADE
- `variant_sku` text NULL
- `created_at` timestamptz NOT NULL DEFAULT now()
- UNIQUE (user_id, product_uid, variant_sku)

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `user_id` → `users(id)`
- `customer_id` → `customers(id)` (if migration applied)
- `product_uid` → `products(uid)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** References both `users.id` and `customers.id`. RLS policies should check via `customers.auth_uid`.

---

### 6. `orders` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `order_number` text UNIQUE NOT NULL
- `user_id` uuid REFERENCES users(id) ON DELETE SET NULL
- `billing_address_id` uuid REFERENCES addresses(id) ON DELETE SET NULL
- `shipping_address_id` uuid REFERENCES addresses(id) ON DELETE SET NULL
- `payment_status` z_payment_status DEFAULT 'pending'
- `shipping_status` z_shipping_status DEFAULT 'pending'
- `currency` text DEFAULT 'INR'
- `subtotal` numeric(12,2) DEFAULT 0
- `shipping_fee` numeric(12,2) DEFAULT 0
- `tax_amount` numeric(12,2) DEFAULT 0
- `discount_amount` numeric(12,2) DEFAULT 0
- `total_amount` numeric(12,2) DEFAULT 0
- `coupon_code` text NULL
- `shiprocket_shipment_id` text NULL
- `payment_provider` text NULL
- `payment_provider_response` jsonb NULL
- `metadata` jsonb DEFAULT '{}'::jsonb
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `user_id` → `users(id)`
- `billing_address_id` → `addresses(id)`
- `shipping_address_id` → `addresses(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Customers can SELECT only their own orders. RLS policies should join `orders.user_id` → `users.id` → `users.auth_uid` → `customers.auth_uid`.

---

### 7. `order_items` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `order_id` uuid REFERENCES orders(id) ON DELETE CASCADE
- `product_uid` text REFERENCES products(uid) ON DELETE RESTRICT
- `variant_id` uuid REFERENCES product_variants(id) ON DELETE RESTRICT
- `sku` text NULL
- `name` text NULL
- `quantity` number NOT NULL
- `price` number NOT NULL
- `subtotal` number NOT NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `order_id` → `orders(id)`
- `product_uid` → `products(uid)`
- `variant_id` → `product_variants(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Access controlled via `orders` table. RLS policies should join through `orders` to `customers.auth_uid`.

---

### 8. `return_requests` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `order_id` uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE
- `user_id` uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `status` text NOT NULL CHECK (status IN ('requested', 'approved', 'received', 'completed', 'rejected'))
- `created_at` timestamptz NOT NULL DEFAULT now()
- `updated_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `order_id` → `orders(id)`
- `user_id` → `users(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Customers can CREATE and SELECT their own return requests. RLS policies should check via `customers.auth_uid`.

---

### 9. `coupons` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `code` text UNIQUE NOT NULL
- `description` text NULL
- `discount_type` text NOT NULL ('percentage' or 'flat')
- `discount_value` numeric(12,2) NOT NULL
- `min_order_amount` numeric(12,2) DEFAULT 0
- `usage_limit` integer DEFAULT NULL
- `used_count` integer DEFAULT 0
- `starts_at` timestamptz DEFAULT now()
- `expires_at` timestamptz NULL
- `is_active` boolean DEFAULT true
- `created_by` uuid REFERENCES users(id) ON DELETE SET NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `created_by` → `users(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Public should be able to SELECT active coupons (`is_active = true`). Writes only via service_role.

---

### 10. `colors` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `name` text NOT NULL UNIQUE
- `slug` text NOT NULL UNIQUE
- `hex_code` text NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:** None

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Reference table. Public SELECT ok.

---

### 11. `sizes` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `code` text NOT NULL UNIQUE
- `label` text NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:** None

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Reference table. Public SELECT ok.

---

### 12. `product_colors` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `product_uid` text REFERENCES products(uid) ON DELETE CASCADE
- `color_id` uuid REFERENCES colors(id) ON DELETE RESTRICT
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `product_uid` → `products(uid)`
- `color_id` → `colors(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Join table. Public SELECT ok.

---

### 13. `payment_logs` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `order_id` uuid REFERENCES orders(id) ON DELETE SET NULL
- `provider` text NULL
- `provider_response` jsonb NULL
- `status` text NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `order_id` → `orders(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Service role only. No public or authenticated access.

---

### 14. `inventory_log` Table

**Columns:**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `product_variant_id` uuid REFERENCES product_variants(id) ON DELETE SET NULL
- `change` integer NOT NULL (+ or - change)
- `reason` text NULL
- `reference_id` text NULL (order_id / admin_action_id)
- `created_by` uuid REFERENCES users(id) ON DELETE SET NULL
- `created_at` timestamptz NOT NULL DEFAULT now()

**Primary Key:** `id` (uuid)

**Foreign Keys:**
- `product_variant_id` → `product_variants(id)`
- `created_by` → `users(id)`

**RLS Status:** NOT ENABLED

**Existing Policies:** None

**Notes:** Service role only. No public or customer access.

---

## SUMMARY

**Tables Scanned:** 14
**Tables with RLS Enabled:** 0
**Tables with Existing Policies:** 0

**Action Required:** 
1. Generate RLS policies for all 14 tables according to the specified rules
2. Ensure policies reference `customers.auth_uid` for customer-facing operations
3. Update all API routes/server actions to use service-role client for writes

















