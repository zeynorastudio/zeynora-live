# TODO_FINAL — Zeynora System Recovery Report

**Generated:** 2025-01-22  
**Audit Scope:** Complete repository scan  
**Platform:** Next.js 15 + Supabase + Razorpay + Shiprocket + SendGrid

---

## 1. Executive Reality Check

Zeynora is a partially functional ecommerce platform built on Next.js 15 with Supabase as the backend. The system demonstrates ambitious architecture with admin/storefront separation, homepage builder, bulk import, payment processing, and shipping integration. However, the codebase shows signs of rapid development with incomplete wiring, disconnected systems, and numerous placeholder implementations. Core flows (product creation, checkout, fulfillment) exist but are fragile. The admin panel has extensive UI but many routes are stubbed with TODO comments. The storefront can display products and process payments, but order fulfillment automation is incomplete. Database schema is mostly sound but missing critical relationships and has inconsistent RLS policies. The system is salvageable but requires systematic stabilization before production use. It will not function reliably as-is without addressing broken connections between payment verification, inventory decrement, order fulfillment, and email notifications.

---

## 2. System Inventory (Truth Table)

### Admin Authentication & Roles

**Purpose:** Secure admin access with role-based permissions (admin vs super_admin)

**Current Status:** Working

**Files involved:**
- `middleware.ts` - Route protection
- `lib/auth/getAdminSession.ts` - Session retrieval
- `lib/auth/requireAdmin.ts` - Admin guard
- `lib/auth/requireSuperAdmin.ts` - Super admin guard
- `app/api/admin/check-role/route.ts` - Role API
- `types/roles.ts` - Type definitions

**Database tables involved:**
- `users` (role column, auth_uid link)

**Known issues:**
- Type assertions used extensively (`as { role: string }`) due to TypeScript strict mode
- No session timeout/refresh mechanism
- Role checks happen in middleware but also duplicated in route handlers

**Hidden risks:**
- If `users` table row missing for authenticated user, access denied (correct behavior but may confuse)
- No audit trail for role changes
- `is_active` flag exists but middleware doesn't check it consistently

---

### Product Core (products, variants)

**Purpose:** Product catalog with variants (color × size), pricing, inventory

**Current Status:** Partial

**Files involved:**
- `lib/products/index.ts` - Core product operations
- `lib/products/service.ts` - Product service layer
- `lib/products/list.ts` - Product listing
- `app/(admin)/admin/super/products/page.tsx` - Admin product list
- `app/(admin)/admin/super/products/add/AddProductClient.tsx` - Add product UI
- `app/(admin)/admin/super/products/add/actions.ts` - Add product actions
- `app/api/admin/products/create/route.ts` - Product creation API
- `app/api/admin/products/[uid]/variants/generate/route.ts` - Variant generation

**Database tables involved:**
- `products` (uid as PK, slug, price, main_image_path)
- `product_variants` (id as PK, product_uid FK, sku, color_id, size_id, stock, price)
- `colors` (id, name, slug)
- `sizes` (id, code, label)
- `product_images` (id, product_uid FK, image_path, variant_sku, display_order)

**Known issues:**
- UID generation exists (`generateNextZYNUID()`) but uses table scan strategy (slow at scale)
- Variant SKU generation inconsistent: sometimes `ZYN-XXXX-COLOR-SIZE`, sometimes `ZYN-XXXX-SIZE`
- Product creation can succeed but variant creation can fail (no rollback)
- `sort_order` column exists (migration 20250120000029) but not consistently used
- Sale fields (`strike_price`, `sale_price`, `on_sale`) exist but UI editing incomplete
- Product-variant relationship: variants can exist without products (orphaned if product deleted)
- Variant images stored in `product_images.variant_sku` but also in `product_variants.images` JSONB (duplication)

**Hidden risks:**
- No unique constraint on product slug (migration 20250121000000 adds it but may not be applied)
- Variant price can be null, falls back to product price (logic exists but not everywhere)
- Stock decrement uses RPC functions but has fallback that's not atomic (race conditions possible)
- Product deletion cascades to variants but not to images in storage (orphaned files)

---

### Media Manager

**Purpose:** Upload, organize, and assign product images with variant-specific grouping

**Current Status:** Partial

**Files involved:**
- `app/(admin)/admin/media/page.tsx` - Media manager UI
- `app/(admin)/admin/media/components/MediaPanel.tsx` - Media panel component
- `app/api/admin/media/upload/route.ts` - Upload endpoint
- `app/api/admin/media/upload-main/route.ts` - Main image upload
- `app/api/admin/media/upload-gallery/route.ts` - Gallery upload
- `app/api/admin/media/replace/route.ts` - Image replacement
- `lib/media/index.ts` - Media utilities
- `lib/media/variant-sync.ts` - Variant image sync

**Database tables involved:**
- `product_images` (id, product_uid, image_path, variant_sku, display_order, type, alt_text)
- `products.main_image_path` (text field)

**Known issues:**
- Multiple upload endpoints with overlapping functionality
- Storage path structure: `products/{uid}/{type}/{filename}` but some code uses `supabase://products/` prefix inconsistently
- Variant SKU assignment exists but UI unclear on how to assign images to specific variants
- Image replacement deletes old file but doesn't update all references
- No bulk delete functionality
- Display order can be set but drag-to-reorder UI incomplete
- Main image update doesn't always trigger homepage revalidation

**Hidden risks:**
- Storage bucket policies exist (migration 20251201000100) but may not be applied
- Image paths stored as text, no validation that file exists in storage
- No cleanup job for orphaned images
- Variant images in JSONB (`product_variants.images`) can desync from `product_images` table

---

### Category Hierarchy

**Purpose:** Hierarchical category system (super categories → subcategories) for navigation and product organization

**Current Status:** Working

**Files involved:**
- `lib/data/categories.ts` - Category tree builder
- `app/(admin)/admin/categories/page.tsx` - Category management
- `components/admin/CategoryTree.tsx` - Category tree UI
- `components/navigation/MegaMenu.tsx` - Navigation menu (has placeholder data)
- `components/navigation/MobileMenuDrawer.tsx` - Mobile menu

**Database tables involved:**
- `categories` (id, name, slug, parent_id FK, is_featured, tile_image_path, sort_order)

**Known issues:**
- MegaMenu component has hardcoded subcategories instead of fetching from DB
- Category tree UI exists but drag-to-reorder not fully functional
- `tile_image_path` exists but no upload UI for category images
- Category deletion doesn't check for products using it (orphaned products)

**Hidden risks:**
- Circular parent_id references possible (no validation)
- Category slug uniqueness enforced but not validated on creation
- Products can reference deleted categories (category_id nullable, no FK constraint enforcement if category deleted)

---

### Inventory & Stock

**Purpose:** Track variant stock levels, decrement on orders, admin stock editing

**Current Status:** Working (with risks)

**Files involved:**
- `app/(admin)/admin/inventory/page.tsx` - Inventory UI
- `components/admin/inventory/AdminInventoryTable.tsx` - Inventory table
- `components/admin/inventory/VariantStockRow.tsx` - Stock editing
- `app/api/admin/products/[uid]/variants/[sku]/stock/route.ts` - Stock update API
- `supabase/migrations/20250116000000_decrement_stock_functions.sql` - RPC functions
- `lib/products/service.ts` - Stock operations

**Database tables involved:**
- `product_variants.stock` (integer, nullable, defaults to 0)
- `inventory_log` (audit table, exists but not consistently used)

**Known issues:**
- Stock decrement RPC functions exist (`decrement_stock`, `decrement_stock_by_sku`) but some code paths use fallback direct update (not atomic)
- Inventory log table exists but stock updates don't always write to it
- Admin can edit stock but no validation for negative values (RPC prevents it, direct update doesn't)
- Stock editing UI shows all products but TODO comment says "should allow editing inactive products"

**Hidden risks:**
- Race conditions in stock decrement if RPC not used (fallback in `app/api/orders/create/route.ts`)
- No stock reservation system (cart doesn't reserve stock)
- No low stock alerts
- Inventory log not queried anywhere (audit trail exists but unused)

---

### Homepage Builder

**Purpose:** Visual homepage editor with hero, categories, sections, banners, sale strip

**Current Status:** Partial

**Files involved:**
- `app/(admin)/admin/super/homepage/page.tsx` - Homepage builder UI
- `app/(admin)/admin/super/homepage/hero/HeroManagerClient.tsx` - Hero manager
- `app/(admin)/admin/super/homepage/sections/SectionsManagerClient.tsx` - Sections manager
- `app/(admin)/admin/super/homepage/banners/BannersManagerClient.tsx` - Banners manager
- `app/(admin)/admin/super/homepage/categories/CategoriesManagerClient.tsx` - Categories manager
- `app/(admin)/admin/super/homepage/sale-strip/SaleStripManagerClient.tsx` - Sale strip manager
- `lib/homepage/preview.ts` - Homepage config fetcher
- `lib/homepage/types.ts` - Type definitions
- `app/api/homepage/publish/route.ts` - Publish endpoint
- `components/homepage/PageWrapper.tsx` - Homepage renderer
- `app/(storefront)/page.tsx` - Storefront homepage

**Database tables involved:**
- `homepage_hero` (id, desktop_image, mobile_image, video_path, status, visible, order_index)
- `homepage_categories` (id, category_id FK, order_index, visible, status)
- `homepage_sections` (id, title, subtitle, source_type, source_meta, product_count, sort_order, order_index, visible, status)
- `homepage_section_products` (id, section_id FK, product_id FK → products.uid, order_index)
- `homepage_banners` (id, title, desktop_image, mobile_image, link, order_index, visible, status)
- `homepage_settings` (id, metadata JSONB)
- `homepage_sale_strips` (id, text, link_url, visible, order_index, status)

**Known issues:**
- Draft/published status system exists but publish endpoint may not handle all edge cases
- Product selection in sections works but order synchronization unclear
- Homepage preview mode exists but may not show all draft content correctly
- Sale strip products field exists (migration 20250120000028) but UI not implemented
- Hero video support exists but mobile variant generation only for images
- Banners link URL exists but no validation
- Sections with `source_type: 'automatic'` need product selection logic (incomplete)

**Hidden risks:**
- Homepage publish doesn't validate that all referenced products exist
- Section products can reference deleted products (orphaned records)
- No revalidation of Next.js cache after publish (may show stale data)
- Homepage settings table has single row assumption (no multi-tenant support)

---

### Storefront (shop, product pages)

**Purpose:** Public-facing product browsing, search, product detail pages

**Current Status:** Working (with gaps)

**Files involved:**
- `app/(storefront)/page.tsx` - Homepage
- `app/(storefront)/product/[slug]/page.tsx` - Product detail page
- `app/(storefront)/collections/[slug]/page.tsx` - Collection/category page
- `app/(storefront)/search/page.tsx` - Search page
- `components/product/ProductCard.tsx` - Product card
- `lib/data/products.ts` - Product queries
- `lib/data/categories.ts` - Category queries

**Database tables involved:**
- `products`, `product_variants`, `product_images`, `categories`

**Known issues:**
- Product detail page shows variants but variant selection UI incomplete
- Search page exists but search logic basic (no full-text search, no filters)
- Collection page can show category or collection but logic unclear
- Product images displayed but variant-specific images not always shown correctly
- No product reviews/ratings
- No "related products" section
- SEO metadata exists but sitemap generation not implemented
- No robots.txt

**Hidden risks:**
- Product pages can show products with no active variants (should show "sold out" but may error)
- Category pages can show empty categories
- Search may return inactive products
- No pagination on product listings (may break with large catalogs)

---

### Checkout Flow

**Purpose:** Cart → Checkout → Payment → Order creation

**Current Status:** Working (fragile)

**Files involved:**
- `app/(storefront)/cart/page.tsx` - Cart page
- `app/(storefront)/checkout/page.tsx` - Checkout page
- `app/api/payments/create-order/route.ts` - Order creation
- `app/api/payments/razorpay/create-order/route.ts` - Razorpay order creation
- `app/api/payments/verify/route.ts` - Payment verification
- `lib/store/cart.ts` - Cart state management
- `lib/shipping/serviceability.ts` - Shipping calculation

**Database tables involved:**
- `carts`, `cart_items`, `orders`, `order_items`, `addresses`, `customers`, `users`

**Known issues:**
- Checkout creates order before payment (pending status) - correct but fragile
- Payment verification decrements stock but if verification fails, order stays pending (stock not reserved)
- Shipping fee calculation exists but may not be called in all checkout paths
- Credits can be applied but deduction happens in verification (race condition possible)
- Address validation exists but not enforced
- Cart persistence uses localStorage + database but can desync
- Checkout form has many fields but validation incomplete

**Hidden risks:**
- Order created with pending payment, if user abandons, order stays in DB forever
- Stock decremented on payment verification, but if webhook arrives before user callback, double decrement possible (idempotency exists but not everywhere)
- Shipping address stored in order metadata but also in addresses table (duplication, can desync)
- No order timeout/cleanup for abandoned pending orders

---

### Payments (Razorpay)

**Purpose:** Process payments via Razorpay, handle webhooks, verify signatures

**Current Status:** Working

**Files involved:**
- `lib/payments/razorpay.ts` - Razorpay client
- `lib/razorpay/client.ts` - Razorpay SDK wrapper
- `lib/payments/hash.ts` - Signature verification
- `app/api/payments/webhook/route.ts` - Webhook handler
- `app/api/payments/verify/route.ts` - Payment verification
- `app/api/payments/status/route.ts` - Payment status check

**Database tables involved:**
- `orders` (payment_status, payment_provider, payment_provider_response)
- `payment_logs` (id, order_id, provider, provider_response, status)

**Known issues:**
- Payment verification happens client-side (checkout page) and server-side (webhook) - both can trigger stock decrement (idempotency exists but fragile)
- Webhook signature verification exists but may not validate all events
- Payment logs written but not consistently queried
- Credits-only orders handled but flow complex (order created, credits deducted in verification)
- Razorpay order creation can fail but order already created in DB (orphaned pending orders)

**Hidden risks:**
- Webhook can arrive before user redirects to success page (order marked paid twice - idempotency check exists but may miss edge cases)
- Payment verification uses signature but if Razorpay key compromised, no additional validation
- Payment logs table exists but no cleanup (grows indefinitely)
- Failed payments leave orders in pending state forever (no timeout)

---

### Shipping (Shiprocket)

**Purpose:** Create shipments, generate AWB, track deliveries, handle webhooks

**Current Status:** Partial

**Files involved:**
- `lib/shipping/shiprocket-client.ts` - Shiprocket API client
- `lib/shipping/fulfillment.ts` - Fulfillment logic
- `lib/shipping/serviceability.ts` - Serviceability check
- `lib/shipping/timeline.ts` - Shipping timeline
- `app/api/shipping/shiprocket/create-order/route.ts` - Create shipment
- `app/api/fulfillment/on-payment/route.ts` - Auto-fulfillment on payment
- `app/api/webhooks/shiprocket/route.ts` - Shiprocket webhook
- `app/api/shipping/webhook/route.ts` - Shipping webhook handler
- `app/(admin)/admin/orders/[id]/fulfillment/page.tsx` - Manual fulfillment UI

**Database tables involved:**
- `orders` (shipping_status, shiprocket_shipment_id, metadata.shipping JSONB)

**Known issues:**
- Fulfillment triggered on payment but can fail silently (error logged but order not marked)
- Shiprocket order creation requires weight/dimensions but fallback values used if missing (may cause incorrect shipping costs)
- Webhook handlers exist but may not process all Shiprocket events
- Manual fulfillment UI exists but may not show all errors
- Serviceability check exists but not always called before checkout
- Pickup location hardcoded as "Primary" (TODO in code)
- Billing/shipping emails hardcoded as empty (TODO in code)

**Hidden risks:**
- Fulfillment can fail but order marked as paid (customer paid but shipment not created)
- Shiprocket webhook can update order status but if webhook fails, status desyncs
- Weight/dimensions fallback may cause incorrect shipping charges
- No retry mechanism for failed fulfillment (manual intervention required)
- AWB generation can succeed but tracking URL not always set

---

### Email (SendGrid)

**Purpose:** Send order confirmations, shipping notifications, transactional emails

**Current Status:** Partial

**Files involved:**
- `app/api/notifications/shipping/route.ts` - Shipping email notifications
- `lib/email-preferences/index.ts` - Email preference checking
- `app/(storefront)/account/email-preferences/page.tsx` - User preferences UI
- `app/(admin)/admin/email-preferences/[user]/page.tsx` - Admin preferences UI

**Database tables involved:**
- `email_preferences` (user_id, order_confirmation, shipping_updates, marketing, etc.)

**Known issues:**
- Order confirmation emails not implemented (only shipping notifications exist)
- Email preferences checked but not all email sends respect preferences
- SendGrid API key required but emails fail silently if not set (returns false, no error)
- Shipping notification emails sent but template basic (HTML exists but not branded)
- No email queue/retry mechanism (if SendGrid fails, email lost)
- Email preferences UI exists but may not be checked in all email paths

**Hidden risks:**
- Order confirmations not sent (customer may not receive order details)
- Email preferences may not be checked before sending (GDPR/compliance risk)
- SendGrid failures silent (no alerting, no retry)
- No email delivery tracking
- Email templates not customizable

---

### SEO (metadata, sitemap)

**Purpose:** Generate SEO metadata, sitemaps, robots.txt

**Current Status:** Broken

**Files involved:**
- `app/(storefront)/product/[slug]/page.tsx` - Product metadata (generateMetadata)
- `app/(storefront)/collections/[slug]/page.tsx` - Collection metadata
- `app/(storefront)/page.tsx` - Homepage metadata
- `app/(admin)/admin/super/seo/page.tsx` - SEO admin page (TODO placeholder)

**Database tables involved:**
- `products` (seo_title, seo_description fields exist but may not be used)

**Known issues:**
- Sitemap generation not implemented (no `/sitemap.xml` route)
- Robots.txt not implemented (no `/robots.txt` route)
- SEO admin page is placeholder (TODO comment)
- Product metadata uses basic template (`${name} | Zeynora`) but seo_title field not always used
- No structured data (JSON-LD) for products
- No Open Graph images for collections
- Meta descriptions may be missing for some pages

**Hidden risks:**
- Search engines cannot discover all products (no sitemap)
- Robots.txt missing may cause indexing issues
- SEO fields exist in DB but not always populated
- No canonical URLs
- No hreflang tags (if multi-language planned)

---

### Logging / Error handling

**Purpose:** Audit trails, error logging, monitoring

**Current Status:** Partial

**Files involved:**
- `lib/audit/log.ts` - Audit logging
- `app/(admin)/admin/activity/page.tsx` - Activity log UI
- `app/api/admin/audit/list/route.ts` - Audit log API
- `app/(admin)/admin/super/logs/page.tsx` - Log viewer (TODO placeholder)

**Database tables involved:**
- `audit_logs` (id, actor_id, event, details, created_at)
- `admin_audit_logs` (may exist, referenced in code)
- `payment_logs` (id, order_id, provider, provider_response, status)
- `inventory_log` (id, variant_id, change_type, quantity, reason)

**Known issues:**
- Audit logging exists but not consistently used (many operations don't log)
- Error handling inconsistent (some errors logged, some only console.error)
- No centralized error tracking (Sentry/LogRocket not integrated)
- Activity log UI exists but may not show all events
- Log viewer page is placeholder (TODO)
- Payment logs written but not queried anywhere
- Inventory log exists but stock updates don't always write to it

**Hidden risks:**
- Errors can occur without alerting (no monitoring)
- Audit trail incomplete (cannot trace all admin actions)
- Payment failures may not be logged
- No log rotation/cleanup (tables grow indefinitely)
- Console.error used but not captured in production

---

## 3. Broken Connections Map

### Product ↔ Variant

**Status:** Weak

**Issue:** Variants can be created without products (orphaned if product deleted). Variant creation can fail after product creation (no rollback). Variant price can be null, falls back to product price, but logic not consistent everywhere.

**Why:** Product creation and variant creation are separate operations. No transaction wrapper. Variant price nullable by design but fallback logic missing in some code paths.

**Files:** `lib/products/index.ts` (createProductWithVariants), `app/api/admin/products/[uid]/variants/generate/route.ts`

---

### Product ↔ Media

**Status:** Disconnected

**Issue:** Images stored in `product_images` table but also referenced in `product_variants.images` JSONB. Main image stored in `products.main_image_path` but also in `product_images`. Variant-specific images assigned via `variant_sku` but UI unclear. Image deletion doesn't clean up all references.

**Why:** Multiple storage strategies evolved over time. No unified image management layer. Variant images stored in two places (table + JSONB) for different use cases but not synchronized.

**Files:** `lib/media/index.ts`, `app/api/admin/media/upload/route.ts`, `lib/products/service.ts`

---

### Homepage ↔ Product/Category

**Status:** Partial

**Issue:** Homepage sections reference products via `homepage_section_products.product_id` but if product deleted, orphaned records. Homepage publish doesn't validate product existence. Product updates don't trigger homepage revalidation. Category references in homepage_categories but category deletion doesn't check homepage usage.

**Why:** Foreign key constraints exist but CASCADE not always set. No validation before publish. No cache invalidation hooks.

**Files:** `app/api/homepage/publish/route.ts`, `lib/homepage/preview.ts`

---

### Order ↔ Inventory

**Status:** Fragile

**Issue:** Stock decremented on payment verification, but if verification called twice (webhook + user callback), double decrement possible. Stock decrement uses RPC functions (atomic) but fallback direct update exists (not atomic). No stock reservation for cart items. Inventory log not consistently written.

**Why:** Payment verification happens in two places (client callback + webhook). Idempotency exists but may miss edge cases. Fallback exists for when RPC not available but not safe.

**Files:** `app/api/payments/verify/route.ts`, `app/api/orders/create/route.ts`, `supabase/migrations/20250116000000_decrement_stock_functions.sql`

---

### Payment ↔ Order confirmation

**Status:** Missing

**Issue:** Order confirmation emails not implemented. Payment success triggers fulfillment but no email to customer. Email preferences checked but order confirmation path doesn't exist.

**Why:** Email system exists for shipping notifications but order confirmation not built. SendGrid integration exists but not used for confirmations.

**Files:** `app/api/payments/verify/route.ts` (should trigger email but doesn't), `app/api/notifications/shipping/route.ts` (only shipping, not confirmations)

---

### Payment ↔ Fulfillment

**Status:** Weak

**Issue:** Fulfillment triggered on payment (`app/api/fulfillment/on-payment/route.ts`) but can fail silently. If fulfillment fails, order marked paid but shipment not created. No retry mechanism. Manual fulfillment exists but may not be used.

**Why:** Fulfillment is separate API call after payment. If it fails, order already marked paid. No queue/retry system. Errors logged but not actionable.

**Files:** `app/api/payments/verify/route.ts` (should call fulfillment), `app/api/fulfillment/on-payment/route.ts`

---

### Shipping ↔ Email notifications

**Status:** Partial

**Issue:** Shipping notifications sent via `app/api/notifications/shipping/route.ts` but not automatically triggered on AWB generation. Webhook can update shipping status but may not trigger email. Email preferences checked but may not be respected.

**Why:** Email sending is separate API call. Not automatically called on fulfillment success. Webhook updates status but doesn't trigger email.

**Files:** `lib/shipping/fulfillment.ts` (should trigger email but doesn't), `app/api/webhooks/shiprocket/route.ts`

---

### Cart ↔ Inventory

**Status:** Missing

**Issue:** Cart doesn't reserve stock. User can add to cart, checkout, but if stock depleted between add and checkout, order fails. No "only X left" warnings. No cart expiration.

**Why:** Stock reservation not implemented. Cart is stateless (localStorage + DB) but doesn't check availability on add.

**Files:** `lib/store/cart.ts`, `app/api/cart/add/route.ts`

---

### Admin ↔ Audit

**Status:** Partial

**Issue:** Many admin operations don't write to audit log. Product creation logs, but variant updates may not. Stock updates don't always log. User role changes may not log.

**Why:** Audit logging exists but not consistently called. Some operations log, some don't. No enforcement.

**Files:** `lib/audit/log.ts` (exists but underused)

---

## 4. Immediate TODOs (No Refactors)

- [ ] **Fix stock decrement race condition:** Remove fallback direct update in `app/api/orders/create/route.ts`, always use RPC
- [ ] **Add order confirmation emails:** Implement email send in `app/api/payments/verify/route.ts` after payment success
- [ ] **Fix payment verification idempotency:** Add order status check before decrementing stock (prevent double decrement)
- [ ] **Wire fulfillment to email:** Call shipping notification API in `lib/shipping/fulfillment.ts` after AWB generation
- [ ] **Add product existence validation:** Validate all referenced products exist before homepage publish
- [ ] **Fix variant creation rollback:** If variant creation fails after product creation, delete product (or use transaction)
- [ ] **Add sitemap route:** Create `app/sitemap.xml/route.ts` to generate sitemap
- [ ] **Add robots.txt route:** Create `app/robots.txt/route.ts`
- [ ] **Fix MegaMenu data:** Replace hardcoded subcategories with DB query in `components/navigation/MegaMenu.tsx`
- [ ] **Add order timeout:** Clean up pending orders older than 24 hours (cron job or scheduled function)
- [ ] **Fix image path consistency:** Standardize on `supabase://products/` prefix or remove it everywhere
- [ ] **Add inventory log writes:** Write to `inventory_log` table on all stock updates
- [ ] **Fix fulfillment error handling:** Mark order as `fulfillment_failed` if Shiprocket call fails, don't leave as paid
- [ ] **Add email preference checks:** Verify email preferences before sending all emails (not just shipping)
- [ ] **Fix homepage revalidation:** Trigger Next.js revalidation after homepage publish
- [ ] **Add product deletion validation:** Check for homepage references before allowing product deletion
- [ ] **Fix category deletion validation:** Check for products and homepage usage before allowing category deletion
- [ ] **Add audit logging:** Add audit log calls to all admin write operations (variant updates, stock changes, etc.)

---

## 5. Recovery Phases (Correct Order)

### Phase 0: Freeze & Safeguards

**Goal:** Prevent further data corruption and system degradation

**Systems touched:**
- Database: Add missing foreign key constraints, add check constraints for stock >= 0
- Code: Add try-catch wrappers around critical operations (payment verification, fulfillment)
- Monitoring: Add error logging to all API routes (at minimum console.error, ideally structured logs)

**What must NOT be touched:**
- Existing data (no migrations that modify data)
- User-facing UI (no changes to storefront)
- Payment processing (don't change Razorpay integration)

**Exit criteria:**
- All critical operations have error handling
- Database constraints prevent invalid data
- Error logging in place for all API routes
- No new broken connections introduced

---

### Phase 1: Data & Relationship Locking

**Goal:** Ensure data integrity and fix broken relationships

**Systems touched:**
- Products/Variants: Add transaction wrapper for product+variant creation, fix rollback
- Orders/Inventory: Fix stock decrement to always use RPC, add idempotency checks
- Homepage: Add validation before publish (check product existence)
- Media: Standardize image path format, fix variant image sync

**What must NOT be touched:**
- UI/UX (no design changes)
- Payment flow (don't change checkout process)
- Database schema (no new tables, only add constraints/indexes)

**Exit criteria:**
- Product creation with variants is atomic (all succeed or all fail)
- Stock decrement is always atomic and idempotent
- Homepage publish validates all references
- Image paths consistent across codebase

---

### Phase 2: Admin System Stabilization

**Goal:** Make admin panel reliable and complete missing functionality

**Systems touched:**
- Product management: Fix variant generation, add bulk operations
- Media manager: Complete image assignment UI, add bulk delete
- Inventory: Add low stock alerts, complete stock editing for inactive products
- Homepage builder: Complete product selection, fix order synchronization
- Audit: Add logging to all admin operations

**What must NOT be touched:**
- Storefront (no changes to customer-facing pages)
- Payment processing (don't change Razorpay)
- Database schema (no migrations, only use existing tables)

**Exit criteria:**
- All admin operations have audit trails
- Media manager fully functional (upload, assign, delete, reorder)
- Homepage builder can create and publish complete homepages
- Inventory management complete (edit, bulk update, alerts)

---

### Phase 3: Storefront Consistency

**Goal:** Ensure storefront displays correct data and handles edge cases

**Systems touched:**
- Product pages: Fix variant selection, handle sold-out states
- Search: Add basic filters, handle empty results
- Collections: Fix category/collection logic, handle empty categories
- Cart: Add stock validation on add, handle out-of-stock items
- SEO: Implement sitemap, robots.txt, fix metadata

**What must NOT be touched:**
- Admin panel (no changes to admin UI)
- Payment processing (don't change checkout)
- Database schema (no new tables)

**Exit criteria:**
- All product pages show correct variants and stock status
- Search returns relevant results with filters
- Collections show products correctly
- Cart validates stock before allowing checkout
- Sitemap and robots.txt implemented

---

### Phase 4: Automation & Reliability

**Goal:** Automate order fulfillment and ensure reliable email delivery

**Systems touched:**
- Fulfillment: Fix auto-fulfillment on payment, add retry mechanism
- Email: Implement order confirmations, fix email preference checks
- Shipping: Fix webhook handling, ensure status updates trigger emails
- Orders: Add cleanup job for abandoned orders, add order status tracking

**What must NOT be touched:**
- UI/UX (no design changes)
- Database schema (no migrations)
- Payment processing (don't change Razorpay)

**Exit criteria:**
- Orders automatically fulfilled on payment (with retry on failure)
- Order confirmation emails sent to all customers
- Shipping status updates trigger email notifications
- Abandoned orders cleaned up automatically
- All emails respect user preferences

---

### Phase 5: Optional Enhancements (clearly marked)

**Goal:** Add features that improve UX but aren't critical for operation

**Systems touched:**
- Product reviews/ratings (new feature)
- Related products (new feature)
- Advanced search filters (enhancement)
- Email template customization (enhancement)
- Analytics dashboard (new feature)
- Maintenance mode toggle (enhancement)

**What must NOT be touched:**
- Core order flow (don't change checkout)
- Payment processing (don't change Razorpay)
- Database schema (only if explicitly needed for new features)

**Exit criteria:**
- Each enhancement is optional and can be disabled
- No breaking changes to existing functionality
- All enhancements have feature flags

---

## 6. Final Verdict

### Is Zeynora salvageable without rewrite? 

**Yes**, but with significant caveats.

The core architecture is sound (Next.js + Supabase is a solid stack). The database schema is mostly complete. The payment and shipping integrations exist and work. However, the system has accumulated technical debt from rapid development. Many features are 80% complete but missing critical wiring. The broken connections between systems (payment → fulfillment → email) are fixable but require systematic attention.

**Estimated recovery time:** 4-6 weeks of focused development to reach production-ready state, assuming:
- 1 senior developer working full-time
- No new features added during recovery
- Systematic phase-by-phase approach followed
- Testing after each phase

**Risk factors:**
- TypeScript type issues may hide runtime bugs (extensive use of `as` assertions)
- Missing error handling in critical paths (payment, fulfillment)
- No monitoring/alerting (errors may go unnoticed)
- Database constraints missing (data integrity at risk)

---

### What kind of product it will realistically become in 3 months if recovered correctly

**A functional but basic ecommerce platform** suitable for small-to-medium inventory (under 10,000 products). It will be able to:
- Accept orders and process payments reliably
- Fulfill orders via Shiprocket automatically
- Send email notifications to customers
- Manage products, variants, and inventory through admin panel
- Display products on storefront with basic search/filter

**It will NOT be:**
- A high-scale platform (no caching, no CDN, no performance optimization)
- A feature-rich platform (no reviews, no recommendations, no advanced search)
- A multi-tenant platform (single store assumption throughout)
- A mobile-optimized platform (responsive but not mobile-first)

**Realistic capacity:**
- Products: Up to 10,000 products with variants
- Orders: Up to 100 orders/day (manual fulfillment backup if automation fails)
- Users: Up to 1,000 registered customers
- Admin users: 5-10 admin/super_admin users

---

### Top 3 mistakes that must NEVER be repeated

1. **Creating orders before payment verification completes**
   - Current: Order created with `pending` status, then payment verified, then stock decremented
   - Problem: If verification fails, order stays pending forever, stock not reserved
   - Never again: Use payment intents or reserve stock before order creation, or use idempotent order creation with cleanup

2. **Storing data in multiple places without synchronization**
   - Current: Variant images in `product_images` table AND `product_variants.images` JSONB, addresses in `addresses` table AND `orders.metadata`
   - Problem: Data can desync, unclear source of truth
   - Never again: Single source of truth for all data, use foreign keys and joins, not duplication

3. **Silent failures in critical paths**
   - Current: Fulfillment can fail but order marked paid, emails can fail but no retry, stock updates can fail but no rollback
   - Problem: Customer pays but doesn't receive product, no way to detect or fix
   - Never again: All critical operations must have error handling, logging, and retry mechanisms. Failures must be visible and actionable.

---

**End of Report**
