# Zeynora Backend & Database Schema Report

> **Generated:** December 25, 2024  
> **Status:** Factual overview of current implementation

---

## Table of Contents

1. [Database Tables](#1-database-tables)
2. [Auth Setup](#2-auth-setup)
3. [Order-Related Tables](#3-order-related-tables)
4. [Cart & Wishlist Persistence](#4-cart--wishlist-persistence)
5. [Shipping-Related Fields](#5-shipping-related-fields)
6. [Payment-Related Fields (Razorpay)](#6-payment-related-fields-razorpay)
7. [API / Server Actions](#7-api--server-actions)

---

## 1. Database Tables

### Core Product Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`products`** | Master product catalog | `uid` (PK, text), `name`, `slug`, `category_id`, `super_category`, `subcategory`, `style`, `occasion`, `season`, `featured`, `best_selling`, `new_launch`, `active`, `price`, `strike_price`, `sale_price`, `on_sale`, `cost_price`, `profit_percent`, `profit_amount`, `tags[]`, `main_image_path`, `sort_order`, `description`, `category_override`, `metadata` | FK → `categories.id` |
| **`product_variants`** | SKU-level variants (color + size) | `id` (PK), `product_uid`, `sku` (unique), `color_id`, `size_id`, `stock`, `price`, `cost`, `active`, `images` (JSONB), `tags[]`, `metadata` | FK → `products.uid`, `colors.id`, `sizes.id` |
| **`product_images`** | Product gallery images | `id` (PK), `product_uid`, `image_path`, `type`, `display_order`, `alt_text`, `variant_sku` | FK → `products.uid` |
| **`product_colors`** | Join table for product ↔ color | `id`, `product_uid`, `color_id` | FK → `products.uid`, `colors.id` |
| **`categories`** | Hierarchical categories | `id` (PK), `name`, `slug`, `parent_id`, `description`, `is_featured`, `hero_image_path`, `tile_image_path`, `banner_image_path`, `sort_order` | Self-referencing FK → `categories.id` |
| **`colors`** | Master color reference | `id` (PK), `name`, `slug`, `hex_code` | None |
| **`sizes`** | Master size reference | `id` (PK), `code`, `label` | None |
| **`collections`** | Curated product groupings | `id` (PK), `name`, `slug`, `description`, `banner_image_path`, `is_seasonal`, `is_active`, `product_uids[]`, `metadata` | None |

---

### User & Auth Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`users`** | Admin/staff users (internal) — **used for admin login and roles** | `id` (PK), `auth_uid` (→ Supabase auth), `email`, `full_name`, `phone`, `role` (enum: `super_admin`, `admin`, `staff`, `customer`), `is_active`, `metadata` | FK `auth_uid` → `auth.users.id` |
| **`customers`** | Customer accounts (storefront) | `id` (PK), `auth_uid`, `email`, `first_name`, `last_name`, `phone` | FK `auth_uid` → `auth.users.id` |

> **Note:** The `user_roles` table exists in the schema but is **NOT used**. All admin login and role management uses the `users.role` column directly.

---

### Order & Commerce Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`orders`** | Order records | `id` (PK), `order_number` (unique, format: `ZYN-YYYYMMDD-XXXX`), `user_id`, `billing_address_id`, `shipping_address_id`, `payment_status` (enum), `shipping_status` (enum), `currency`, `subtotal`, `shipping_fee`, `tax_amount`, `discount_amount`, `total_amount`, `coupon_code`, `shiprocket_shipment_id`, `payment_provider`, `payment_provider_response` (JSONB), `metadata` | FK → `users.id`, `addresses.id` |
| **`order_items`** | Line items per order | `id`, `order_id`, `product_uid`, `variant_id`, `sku`, `name`, `quantity`, `price`, `subtotal` | FK → `orders.id`, `products.uid`, `product_variants.id` |
| **`addresses`** | User shipping/billing addresses | `id` (PK), `user_id`, `full_name`, `phone`, `line1`, `line2`, `city`, `state`, `pincode`, `country`, `is_default` | FK → `users.id` |
| **`coupons`** | Discount codes | `id`, `code` (unique), `description`, `discount_type`, `discount_value`, `min_order_amount`, `usage_limit`, `used_count`, `starts_at`, `expires_at`, `is_active`, `created_by` | FK → `users.id` |
| **`return_requests`** | Return tracking | `id`, `order_id`, `user_id`, `status` (enum: `requested`, `approved`, `received`, `completed`, `rejected`) | FK → `orders.id`, `users.id` |

---

### Cart & Wishlist Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`carts`** | Persisted cart | `id` (PK), `session_id` (unique), `user_id`, `currency`, `subtotal` | FK → `users.id` |
| **`cart_items`** | Cart line items | `id`, `cart_id`, `product_variant_id`, `quantity`, `price_snapshot` | FK → `carts.id`, `product_variants.id` |
| **`wishlist_items`** | User wishlists | `id`, `user_id`, `product_uid`, `variant_sku` | FK → `users.id` (uses `user_id` column, not `auth_uid`) |

---

### Store Credits / Wallet Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`store_credits`** | Wallet balance per user | `id`, `user_id` (unique), `balance` (≥0 constraint) | FK → `users.id` |
| **`store_credit_transactions`** | Credit/debit transaction log | `id`, `user_id`, `type` (credit/debit), `amount`, `reference`, `notes` | FK → `users.id` |
| **`one_time_codes`** | In-store redemption codes | `id`, `user_id`, `code` (unique), `amount`, `expires_at`, `used`, `used_at` | FK → `users.id` |

---

### Logging & Audit Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`audit_logs`** | General audit logging | `id`, `actor_id`, `event`, `details` (JSONB) | FK → `users.id` |
| **`admin_audit_logs`** | Admin role/permission audit | `id`, `actor_user_id`, `target_user_id`, `action`, `detail` (JSONB) | FK → `auth.users.id` |
| **`payment_logs`** | Payment event logging | `id`, `order_id`, `provider`, `provider_response` (JSONB), `status` | FK → `orders.id` |
| **`inventory_log`** | Stock change tracking | `id`, `product_variant_id`, `change`, `reason`, `reference_id`, `created_by` | FK → `product_variants.id`, `users.id` |

---

### Import / Bulk Upload Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`import_runs`** | Bulk import tracking | `id`, `batch_id` (unique), `started_at`, `completed_at`, `status`, `products_file_hash`, `variants_file_hash`, `summary` (JSONB), `errors` (JSONB), `created_by` | FK → `users.id` |
| **`import_row_tracking`** | Idempotent row tracking | `id`, `import_run_id`, `file_type`, `file_hash`, `row_index`, `product_uid`, `variant_sku` | FK → `import_runs.id` |

---

### Homepage Builder Tables

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| **`homepage_hero`** | Hero carousel slides | `id`, `title`, `subtitle`, `cta_text`, `cta_url`, `desktop_image`, `desktop_video`, `mobile_image`, `mobile_video`, `order_index`, `visible`, `status` | None |
| **`homepage_categories`** | Featured category tiles | `id`, `category_id`, `image`, `title_override`, `url_override`, `order_index`, `visible`, `status` | FK → `categories.id` |
| **`homepage_sections`** | Product sections | `id`, `title`, `subtitle`, `source_type` (automatic/manual), `source_meta` (JSONB), `product_count`, `sort_order`, `order_index`, `visible`, `status` | None |
| **`homepage_section_products`** | Manual section ↔ product join | `id`, `section_id`, `product_id`, `order_index` | FK → `homepage_sections.id`, `products.uid` |
| **`homepage_banners`** | Promotional banners | `id`, `title`, `desktop_image`, `mobile_image`, `link`, `order_index`, `visible`, `status` | None |
| **`homepage_settings`** | Global homepage config | `id`, `hero_max_height_desktop`, `hero_max_height_mobile`, `page_padding`, `bg_color`, `lazy_load_enabled`, `section_dividers_enabled` | None |
| **`homepage_sale_strips`** | Sale announcement strips | `id`, `sale_text`, `status`, `visible`, `product_ids` (JSONB) | None |

---

### Other Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **`admin_invites`** | Pending admin invitations | `id`, `email`, `role`, `token` (unique), `invited_by`, `accepted`, `accepted_at` |
| **`email_preferences`** | User email opt-in settings | `id`, `user_id` (unique), `master_toggle`, `marketing_emails`, `new_arrivals`, `sale_announcements`, `restock_alerts`, `wishlist_alerts`, `abandoned_cart` |

---

### Enums (PostgreSQL Types)

| Enum | Values |
|------|--------|
| `z_role_type` | `super_admin`, `admin`, `staff`, `customer` |
| `z_payment_status` | `pending`, `paid`, `failed`, `refunded` |
| `z_shipping_status` | `pending`, `processing`, `shipped`, `in_transit`, `out_for_delivery`, `delivered`, `rto`, `returned`, `cancelled` |
| `z_occasion` | `wedding`, `festive`, `casual`, `party`, `formal`, `semi_formal`, `daily`, `premium` |
| `z_season` | `summer`, `winter`, `spring`, `autumn`, `all_seasons` |
| `z_fabric_type` | `pure_silk`, `cotton_silk`, `georgette`, `chiffon`, `crepe`, `banarasi_silk`, `kanjivaram_silk`, `chanderi_cotton`, `lawn`, `velvet`, `cotton`, `organza`, `net`, `satin`, `silk` |
| `z_work_type` | `zari_work`, `embroidery`, `print`, `hand_painted`, `block_print`, `kalamkari`, `bandhani`, `sequin_work`, `mirror_work`, `thread_work` |
| `z_product_status` | `active`, `draft`, `archived` |

---

### Database Views

| View | Purpose |
|------|---------|
| `vw_products_min_variant_price` | Returns `uid`, `name`, `display_price` (minimum variant price or product base price) |

---

## 2. Auth Setup

### Supabase `auth.users` Usage

- Supabase Auth handles authentication (email/password, magic link, OAuth)
- Two separate tables map to `auth.users`:
  - **`users`** table: For admin/staff users (`auth_uid` → `auth.users.id`)
  - **`customers`** table: For storefront customers (`auth_uid` → `auth.users.id`)

### Admin vs Customer Distinction

| User Type | Table | Role Field | Login Flow |
|-----------|-------|------------|------------|
| **Super Admin** | `users` | `role = 'super_admin'` | Admin portal (`/admin`) |
| **Admin** | `users` | `role = 'admin'` | Admin portal (`/admin`) |
| **Staff** | `users` | `role = 'staff'` | Admin portal (`/admin`) |
| **Customer** | `customers` | N/A (separate table) | Storefront (`/account`) |

### Role Checking Flow

```
1. User authenticates via Supabase Auth → gets auth.users.id
2. lib/auth/getAdminSession.ts queries `users` table by auth_uid
3. Returns { user, role } where role is from users.role column
4. Guard functions (requireAdmin, requireSuperAdmin) enforce authorization
```

### Key Auth Files

| File | Purpose |
|------|---------|
| `lib/auth/getAdminSession.ts` | Gets admin session and role from `users` table |
| `lib/auth/customers.ts` | Customer helpers: `findCustomerByAuthUid()`, `createCustomer()`, `isAdminEmail()` |
| `lib/auth/requireAdmin.ts` | Guard: ensures user has admin/super_admin role |
| `lib/auth/requireSuperAdmin.ts` | Guard: ensures user has super_admin role |
| `lib/auth/guards.ts` | Additional authorization guards |

### Role Types (TypeScript)

```typescript
// types/roles.ts
export type UserRole = "super_admin" | "admin" | "customer";
```

> **Note:** The database enum includes `staff`, but TypeScript types currently only use `super_admin`, `admin`, `customer`.

---

## 3. Order-Related Tables

### Orders Table Schema

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `order_number` | text | Unique, format: `ZYN-YYYYMMDD-XXXX` |
| `user_id` | uuid | FK → `users.id` |
| `billing_address_id` | uuid | FK → `addresses.id` |
| `shipping_address_id` | uuid | FK → `addresses.id` |
| `payment_status` | enum | `pending`, `paid`, `failed`, `refunded` |
| `shipping_status` | enum | `pending`, `processing`, `shipped`, `in_transit`, `out_for_delivery`, `delivered`, `rto`, `returned`, `cancelled` |
| `currency` | text | Default: `INR` |
| `subtotal` | numeric(12,2) | Sum of items |
| `shipping_fee` | numeric(12,2) | Shipping cost |
| `tax_amount` | numeric(12,2) | Tax |
| `discount_amount` | numeric(12,2) | Discount applied |
| `total_amount` | numeric(12,2) | Final total |
| `coupon_code` | text | Applied coupon |
| `shiprocket_shipment_id` | text | Shiprocket integration |
| `payment_provider` | text | e.g., `razorpay` |
| `payment_provider_response` | jsonb | Razorpay order/payment IDs, credits info |
| `metadata` | jsonb | Customer info, address snapshot, shipping details |

### Order Items Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `order_id` | uuid | FK → `orders.id` |
| `product_uid` | text | FK → `products.uid` |
| `variant_id` | uuid | FK → `product_variants.id` |
| `sku` | text | Variant SKU (snapshot) |
| `name` | text | Product name (snapshot) |
| `quantity` | integer | Quantity ordered |
| `price` | numeric(12,2) | Unit price (snapshot) |
| `subtotal` | numeric(12,2) | quantity × price |

### SKU/Variant Linking

```
order_items.variant_id → product_variants.id
order_items.sku → stores variant SKU directly (snapshot)
order_items.product_uid → products.uid
```

### Order Status Flow

```
Payment: pending → paid → (failed/refunded)
Shipping: pending → processing → shipped → in_transit → out_for_delivery → delivered
                                                      → rto → returned
                                                      → cancelled
```

---

## 4. Cart & Wishlist Persistence

### Cart Architecture

#### Database Layer (`carts` + `cart_items`)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `carts` | `id`, `session_id`, `user_id`, `currency`, `subtotal` | Cart header |
| `cart_items` | `cart_id`, `product_variant_id`, `quantity`, `price_snapshot` | Cart items |

#### Guest vs Logged-In Handling

| User Type | Cart ID Source | Persistence |
|-----------|---------------|-------------|
| **Guest** | `session_id` from cookie `z_session` | Database via session ID |
| **Logged-in** | `user_id` from authenticated user | Database via user ID |

#### Client-Side Store

```typescript
// lib/store/cart.ts
const CART_KEY = "zeynora_cart_v1";  // localStorage key

// Zustand store with persist middleware
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: CartItem[],
      addItem, removeItem, updateQty, clearCart,
      getTotalItems, getTotalPrice,
      isOpen, openCart, closeCart
    }),
    { name: CART_KEY }
  )
);
```

### Wishlist Architecture

#### Database Layer (`wishlist_items`)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `users.id` (**not auth_uid**) |
| `product_uid` | text | FK → `products.uid` |
| `variant_sku` | text | Optional variant |

#### Guest vs Logged-In Handling

| User Type | Persistence | Method |
|-----------|-------------|--------|
| **Guest** | localStorage only | Zustand store (`zeynora_wishlist_v1`) |
| **Logged-in** | Database (`wishlist_items`) | Server action `toggleWishlistAction` |

#### Client-Side Store

```typescript
// lib/store/wishlist.ts
const WISHLIST_KEY = "zeynora_wishlist_v1";

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlist: string[],  // array of product_uids
      toggleWishlist, isInWishlist
    }),
    { name: WISHLIST_KEY }
  )
);
```

---

## 5. Shipping-Related Fields

### Orders Table — Shipping Fields

| Column | Type | Purpose |
|--------|------|---------|
| `shipping_address_id` | uuid | FK → `addresses.id` |
| `shipping_fee` | numeric(12,2) | Calculated shipping cost |
| `shipping_status` | enum | Current shipping state |
| `shiprocket_shipment_id` | text | Shiprocket shipment reference |

### Addresses Table Schema

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → `users.id` |
| `full_name` | text | Recipient name |
| `phone` | text | Contact phone |
| `line1` | text | Street address |
| `line2` | text | Apt/Suite (optional) |
| `city` | text | City |
| `state` | text | State/Province |
| `pincode` | text | PIN/ZIP code |
| `country` | text | Default: `India` |
| `is_default` | boolean | Default address flag |

### Order Metadata — Shipping Details

```json
{
  "metadata": {
    "shipping_address": { /* current address */ },
    "address_snapshot": {
      "recipient_name": "...",
      "phone": "...",
      "address_line_1": "...",
      "address_line_2": "...",
      "city": "...",
      "state": "...",
      "pincode": "...",
      "country": "...",
      "snapshot_taken_at": "2024-12-25T..."
    },
    "shipping": {
      "estimated_delivery": {
        "min_days": 3,
        "max_days": 7
      },
      "serviceability_checked": true,
      "available_couriers": [...]
    }
  }
}
```

### Shiprocket Integration

#### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SHIPROCKET_BASE_URL` | API base URL (default: `https://apiv2.shiprocket.in/v1`) |
| `SHIPROCKET_EMAIL` | Account email |
| `SHIPROCKET_PASSWORD` | Account password |
| `SHIPROCKET_API_KEY` | API key (optional) |
| `SHIPROCKET_API_SECRET` | API secret (optional) |
| `SHIPROCKET_WEBHOOK_SECRET` | Webhook signature verification |

#### Key Functions (`lib/shipping/shiprocket-client.ts`)

| Function | Purpose |
|----------|---------|
| `authenticate()` | Get/cache auth token |
| `createShiprocketOrder(payload)` | Create order in Shiprocket |
| `generateAWB(shipmentId)` | Generate airway bill |
| `getShipmentTracking(shipmentId)` | Fetch tracking details |
| `verifyWebhookSignature(payload, signature)` | Verify webhook |

---

## 6. Payment-Related Fields (Razorpay)

### Orders Table — Payment Fields

| Column | Type | Content |
|--------|------|---------|
| `payment_provider` | text | `"razorpay"` |
| `payment_status` | enum | `pending`, `paid`, `failed`, `refunded` |
| `payment_provider_response` | jsonb | See below |

### `payment_provider_response` JSONB Structure

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_hash",
  "credits_applied": 500,
  "credits_locked": true,
  "credits_deducted_at": "2024-12-25T...",
  "verified_at": "2024-12-25T...",
  "payment_attempts": 1,
  "pending_expires_at": "2024-12-25T..."
}
```

### Payment Logs Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `order_id` | uuid | FK → `orders.id` |
| `provider` | text | `razorpay` |
| `provider_response` | jsonb | Raw response data |
| `status` | text | Payment status |

### Razorpay Environment Variables

| Variable | Purpose |
|----------|---------|
| `RAZORPAY_KEY_ID` | API Key ID (server) |
| `RAZORPAY_KEY_SECRET` | API Key Secret (server) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | API Key ID (client) |

### Razorpay Library Functions (`lib/payments/razorpay.ts`)

| Function | Purpose |
|----------|---------|
| `getRazorpayInstance()` | Get configured Razorpay client |
| `createRazorpayOrder(amount, currency, receipt, notes)` | Create payment order |
| `verifyPaymentSignature(paymentId, orderId, signature)` | Verify payment callback |
| `verifyWebhookSignature(payload, signature)` | Verify webhook |

### Payment Flow

```
1. /api/payments/create-order
   - Validate cart items and stock
   - Create database order (payment_status: pending)
   - Create Razorpay order
   - Return razorpay_order_id to client

2. Client: Razorpay checkout popup

3. /api/payments/verify
   - Verify signature
   - Update order (payment_status: paid)
   - Deduct store credits if applied
   - Decrement stock
   - Send confirmation email

4. /api/payments/webhook (backup)
   - Handle Razorpay webhook events
```

---

## 7. API / Server Actions

### Product APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/products` | GET | Public product listing |
| `GET /api/product/[slug]` | GET | Public product detail |
| `GET /api/products/[uid]/variants` | GET | Get product variants |
| `GET /api/admin/products` | GET | Admin: list products |
| `POST /api/admin/products/create` | POST | Admin: create product |
| `GET /api/admin/products/[uid]` | GET | Admin: get product |
| `POST /api/admin/products/[uid]/update` | POST | Admin: update product |
| `POST /api/admin/products/reorder` | POST | Admin: reorder products |
| `POST /api/admin/products/bulk-upload-csv` | POST | Admin: CSV import |
| `POST /api/admin/variants/batch-update` | POST | Admin: batch update variants |
| `GET /api/admin/variants/list` | GET | Admin: list variants |
| `POST /api/admin/products/[uid]/variants/[sku]/stock` | POST | Admin: update stock |

### Cart APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/cart/add` | POST | Add item to cart |
| `GET /api/cart/get` | GET | Get cart contents |

### Order APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/orders/create` | POST | Create order |
| `POST /api/orders/cancel` | POST | Cancel order |
| `POST /api/orders/return` | POST | Request return |
| `GET /api/orders/get/[order_id]` | GET | Get order details |
| `GET /api/admin/orders/export` | GET | Admin: export orders |
| `GET /api/admin/orders/[id]/invoice` | GET | Admin: generate invoice |

### Payment APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/payments/create-order` | POST | Create Razorpay order |
| `POST /api/payments/verify` | POST | Verify payment |
| `GET /api/payments/status` | GET | Check payment status |
| `POST /api/payments/retry` | POST | Retry failed payment |
| `POST /api/payments/webhook` | POST | Razorpay webhook |
| `POST /api/payments/razorpay/create-order` | POST | Alternative create endpoint |
| `POST /api/payments/razorpay/verify` | POST | Alternative verify endpoint |

### Wishlist APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/wishlist/get` | GET | Get wishlist items |
| Server Action: `toggleWishlistAction` | - | Toggle wishlist item |
| Server Action: `fetchWishlistAction` | - | Fetch wishlist |

### Wallet/Credits APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/wallet/balance` | GET | Get user balance |
| `GET /api/wallet/transactions` | GET | Get transaction history |
| `POST /api/admin/wallet/add` | POST | Admin: add credits |
| `POST /api/admin/wallet/deduct` | POST | Admin: deduct credits |
| `POST /api/wallet/code/create` | POST | Create one-time code |
| `POST /api/wallet/code/redeem` | POST | Redeem one-time code |
| `GET /api/admin/wallet/transactions` | GET | Admin: view transactions |

### Shipping APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/shipping/calculate` | POST | Calculate shipping cost |
| `POST /api/shipping/serviceability` | POST | Check pincode |
| `POST /api/shipping/shiprocket/create-order` | POST | Create Shiprocket order |
| `POST /api/shipping/update` | POST | Update shipping status |
| `POST /api/shipping/webhook` | POST | Shiprocket webhook |
| `POST /api/webhooks/shiprocket` | POST | Alternative webhook |

### Address APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/addresses/list` | GET | List user addresses |
| `POST /api/addresses/create` | POST | Create address |
| `POST /api/addresses/update` | POST | Update address |
| `POST /api/addresses/delete` | POST | Delete address |
| `POST /api/addresses/set-default` | POST | Set default address |
| `POST /api/addresses/upsert` | POST | Create or update |
| `GET /api/addresses/get` | GET | Get single address |

### Admin User Management APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/admin/users/list` | GET | List admin users |
| `POST /api/admin/users/[id]/role` | POST | Change user role |
| `POST /api/admin/users/[id]/freeze` | POST | Freeze user |
| `POST /api/admin/users/[id]/unfreeze` | POST | Unfreeze user |
| `POST /api/admin/invite` | POST | Send admin invite |
| `POST /api/admin/invite/accept` | POST | Accept invite |
| `GET /api/admin/check-role` | GET | Check current role |
| `GET /api/admin/audit/list` | GET | List audit logs |

### Category APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/admin/categories/list` | GET | List categories |
| `POST /api/admin/categories/create` | POST | Create category |
| `POST /api/admin/categories/[id]/update` | POST | Update category |
| `POST /api/admin/categories/[id]/delete` | POST | Delete category |
| `POST /api/admin/categories/reorder` | POST | Reorder categories |

### Collection APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/admin/collections/list` | GET | List collections |
| `POST /api/admin/collections/create` | POST | Create collection |
| `POST /api/admin/collections/[id]/update` | POST | Update collection |
| `POST /api/admin/collections/[id]/delete` | POST | Delete collection |
| `POST /api/admin/collections/[id]/assign` | POST | Assign products |
| `POST /api/admin/collections/import` | POST | Import collection |

### Media APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/admin/media/upload` | POST | Upload media |
| `POST /api/admin/media/upload-main` | POST | Upload main image |
| `POST /api/admin/media/upload-gallery` | POST | Upload gallery images |
| `GET /api/admin/media/list` | GET | List media |
| `GET /api/admin/media/get` | GET | Get media details |
| `POST /api/admin/media/delete` | POST | Delete media |
| `POST /api/admin/media/reorder` | POST | Reorder media |
| `POST /api/admin/media/replace` | POST | Replace media |
| `POST /api/admin/media/detect` | POST | Detect media type |

### Homepage APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/homepage/publish` | POST | Publish homepage |
| `POST /api/homepage/reorder` | POST | Reorder sections |
| `POST /api/homepage/upload` | POST | Upload homepage media |

### Other APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/fulfillment/on-payment` | POST | Trigger fulfillment |
| `POST /api/fulfillment/retry` | POST | Retry fulfillment |
| `POST /api/notifications/shipping` | POST | Send shipping notification |
| `POST /api/support/create` | POST | Create support ticket |
| `GET /api/email-preferences/get` | GET | Get email preferences |
| `POST /api/email-preferences/update` | POST | Update email preferences |
| `POST /api/auth/merge-guest` | POST | Merge guest cart/wishlist |
| `POST /api/cron/cleanup-pending-orders` | POST | Cleanup stale orders |
| `POST /api/admin/import/run` | POST | Run import |

---

### Key Service Functions

#### Products (`lib/products/service.ts`)

| Function | Purpose |
|----------|---------|
| `insertProduct(product, actorId)` | Insert new product |
| `upsertVariantsBatch(variants, actorId)` | Batch upsert variants |
| `getProductsList(opts)` | Get paginated products |
| `updateProduct(uid, updates, actorId)` | Update product |
| `updateVariantStock(sku, newStock, actorId, reason)` | Update stock with logging |
| `setMainImage(uid, path, actorId)` | Set main product image |
| `addProductImage(productUid, imagePath, options)` | Add gallery image |
| `createProduct(input, actorId)` | Create product wrapper |

#### Cart (`lib/store/cart.ts`)

| Function | Purpose |
|----------|---------|
| `getCart()` | Get current cart items |
| `addToCart(item)` | Add item to cart |
| `removeFromCart(sku)` | Remove item by SKU |
| `clearCart()` | Clear all items |
| `openCartDrawer()` | Open cart UI |

#### Wishlist (`lib/store/wishlist.ts`)

| Function | Purpose |
|----------|---------|
| `toggleWishlist(uid)` | Toggle product in wishlist |
| `getWishlist()` | Get wishlist product UIDs |

#### Wallet (`lib/wallet/index.ts`)

| Function | Purpose |
|----------|---------|
| `getBalance(userId)` | Get wallet balance + expiring credits |
| `addCredits(userId, amount, reference, notes, performedBy)` | Add credits |
| `deductCredits(userId, amount, reference, notes, performedBy)` | Deduct credits |
| `getTransactions(userId, limit)` | Get transaction history |

#### Customers (`lib/auth/customers.ts`)

| Function | Purpose |
|----------|---------|
| `findCustomerByAuthUid(authUid)` | Find customer by auth ID |
| `findCustomerByEmail(email)` | Find customer by email |
| `createCustomer(data)` | Create customer record |
| `isAdminEmail(email)` | Check if email is admin |
| `mapEmailToAuthUid(email, authUid)` | Link email to auth |
| `findOrCreateCustomerForAuthUid(authUid, email)` | Get or create customer |

---

## Summary

### Database Architecture

- **49 migration files** in `supabase/migrations/`
- **~35 tables** across products, orders, users, cart, wishlist, wallet, homepage, logging
- **Row Level Security (RLS)** enabled on most tables
- **PostgreSQL enums** for type safety on status fields

### Authentication

- Supabase Auth for authentication
- `users` table for admin/staff (role in `users.role` column)
- `customers` table for storefront customers
- `user_roles` table exists but is **NOT used**

### Payment Integration

- Razorpay as primary payment provider
- Store credits system with wallet functionality
- Payment verification via signature check

### Shipping Integration

- Shiprocket for fulfillment
- Pincode serviceability checking
- Webhook handlers for tracking updates

### Storage

- Supabase Storage for images
- Buckets: `products`, `categories`, `banners`, `homepage`

---

*End of Report*












