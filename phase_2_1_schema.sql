/* phase_2_1_schema.sql
   Zeynora — Supabase / PostgreSQL schema (Phase 2.1)
   Run this whole file in Supabase SQL Editor.
*/

/* ---------- ENUMS ---------- */
CREATE TYPE z_role_type AS ENUM ('super_admin', 'admin', 'staff', 'customer');

CREATE TYPE z_fabric_type AS ENUM (
  'pure_silk','cotton_silk','georgette','chiffon','crepe','banarasi_silk','kanjivaram_silk','chanderi_cotton','lawn','velvet','cotton','organza','net','satin','silk'
);

CREATE TYPE z_work_type AS ENUM (
  'zari_work','embroidery','print','hand_painted','block_print','kalamkari','bandhani','sequin_work','mirror_work','thread_work'
);

CREATE TYPE z_season AS ENUM ('summer','winter','spring','autumn','all_seasons');

CREATE TYPE z_occasion AS ENUM ('wedding','festive','casual','party','formal','semi_formal','daily','premium');

CREATE TYPE z_product_status AS ENUM ('active','draft','archived');

CREATE TYPE z_payment_status AS ENUM ('pending','paid','failed','refunded');

CREATE TYPE z_shipping_status AS ENUM ('pending','processing','shipped','in_transit','out_for_delivery','delivered','rto','returned','cancelled');

/* ---------- UTILITY EXTENSIONS (if not enabled on your DB) ---------- */
-- Note: Supabase generally has pgcrypto available. If not, enable as needed.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* ---------- CORE TABLES ---------- */

/* 1. users (extends Supabase Auth users via user_id) */
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid UNIQUE,                 -- Supabase Auth user id (link)
  email text NOT NULL,
  full_name text,
  phone text,
  role z_role_type DEFAULT 'customer',
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN users.auth_uid IS 'Link to Supabase Auth user.id';
COMMENT ON TABLE users IS 'Application-level users (profile + role).';

/* 2. user_roles (explicit role mapping for admin UI) */
CREATE TABLE IF NOT EXISTS user_roles (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role z_role_type NOT NULL,
  assigned_by uuid NULL, -- user id who assigned this (super admin)
  created_at timestamptz NOT NULL DEFAULT now()
);

/* 3. categories (hierarchical: parent_id for super/sub categories) */
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  description text,
  is_featured boolean DEFAULT false,
  hero_image_path text,  -- supabase://categories/{slug}-hero.jpg
  tile_image_path text,  -- supabase://categories/{slug}-tile.jpg
  banner_image_path text, -- supabase://categories/{slug}-banner.jpg
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

/* 4. colors (reference table — you chose option C) */
CREATE TABLE IF NOT EXISTS colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,        -- e.g., "Vine Red", "Black"
  slug text NOT NULL UNIQUE,        -- e.g., "vine-red", "black"
  hex_code text,                    -- optional: "#8B2635"
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE colors IS 'Master color list. Product colors reference this table.';

/* 5. sizes (reference table) */
CREATE TABLE IF NOT EXISTS sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,        -- e.g., S, M, L, XL, 28, 30
  label text,                       -- e.g., "Small", "Medium"
  created_at timestamptz NOT NULL DEFAULT now()
);

/* 6. products (master product row) */
CREATE TABLE IF NOT EXISTS products (
  uid text PRIMARY KEY,             -- keep as provided in CSV for mapping
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  super_category text,              -- denormalized label from CSV for quick ref
  subcategory text,                 -- denormalized
  style text,
  occasion z_occasion,
  season z_season,
  featured boolean DEFAULT false,
  best_selling boolean DEFAULT false,
  active boolean DEFAULT true,
  price numeric(12,2) NOT NULL DEFAULT 0,       -- base price (fallback)
  cost_price numeric(12,2),
  profit_percent numeric(5,2),
  profit_amount numeric(12,2),
  tags text[],                      -- array of tag strings
  main_image_path text,             -- supabase://products/{product_uid}/main.jpg (auto-filled later)
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_price_nonneg CHECK (price >= 0)
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

/* 7. product_colors (join table product -> colors) */
CREATE TABLE IF NOT EXISTS product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uid text REFERENCES products(uid) ON DELETE CASCADE,
  color_id uuid REFERENCES colors(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_uid, color_id)
);
CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_uid);

/* 8. product_images (gallery images, variant-agnostic by default) */
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uid text REFERENCES products(uid) ON DELETE CASCADE,
  image_path text NOT NULL,         -- supabase://products/{product_uid}/{filename}.jpg
  type text,                        -- hero | thumbnail | detail | lifestyle
  display_order integer DEFAULT 0,
  alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_uid);

/* 9. product_variants (one row per color+size+sku) */
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_uid text REFERENCES products(uid) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,         -- Variant SKU (from CSV: Variant_SKU)
  color_id uuid REFERENCES colors(id) ON DELETE SET NULL,
  size_id uuid REFERENCES sizes(id) ON DELETE SET NULL,
  stock integer DEFAULT 0,
  price numeric(12,2) NULL,         -- variant-level price override (nullable)
  cost numeric(12,2) NULL,
  active boolean DEFAULT true,
  images jsonb DEFAULT '[]'::jsonb, -- JSON array of supabase paths (optional)
  tags text[],                       -- variant-level tag list
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_uid);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

/* 10. collections (featured groupings) */
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  banner_image_path text,
  is_seasonal boolean DEFAULT false,
  is_active boolean DEFAULT true,
  product_uids text[],               -- optional static curated list of product uid strings
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* 11. carts (session / persisted carts) */
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE,            -- guest session id (cookie / client id)
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  currency text DEFAULT 'INR',
  subtotal numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

/* 12. cart_items */
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE,
  product_variant_id uuid REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  price_snapshot numeric(12,2) NOT NULL, -- price captured when added to cart
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

/* 13. addresses */
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  line1 text,
  line2 text,
  city text,
  state text,
  pincode text,
  country text DEFAULT 'India',
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* 14. orders */
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,  -- e.g., ZYN-2025-00001 (generated in app)
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  billing_address_id uuid REFERENCES addresses(id) ON DELETE SET NULL,
  shipping_address_id uuid REFERENCES addresses(id) ON DELETE SET NULL,
  payment_status z_payment_status DEFAULT 'pending',
  shipping_status z_shipping_status DEFAULT 'pending',
  currency text DEFAULT 'INR',
  subtotal numeric(12,2) DEFAULT 0,
  shipping_fee numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  coupon_code text,
  shiprocket_shipment_id text,       -- for Phase 4 Shiprocket integration
  payment_provider text,             -- e.g., 'razorpay' or 'stripe'
  payment_provider_response jsonb,   -- store raw webhook/response
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

/* 15. order_items */
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_uid text REFERENCES products(uid) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE RESTRICT,
  sku text,
  name text,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(12,2) NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

/* 16. coupons */
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL, -- 'percentage' or 'flat'
  discount_value numeric(12,2) NOT NULL,
  min_order_amount numeric(12,2) DEFAULT 0,
  usage_limit integer DEFAULT NULL,
  used_count integer DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* 17. payment_logs */
CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  provider text,
  provider_response jsonb,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* 18. inventory_log */
CREATE TABLE IF NOT EXISTS inventory_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  change integer NOT NULL,             -- + or - change
  reason text,
  reference_id text,                   -- order_id / admin_action_id
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

/* ---------- DATA QUALITY / TRIGGERS (lightweight) ---------- */
/* Trigger to keep products.updated_at and variants.updated_at current */
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER trg_product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

/* ---------- SAMPLE VIEWS (helpful for PLP) ---------- */
/* View: products_with_min_variant_price */
CREATE OR REPLACE VIEW vw_products_min_variant_price AS
SELECT p.uid, p.name, COALESCE(MIN(v.price), p.price) AS display_price
FROM products p
LEFT JOIN product_variants v ON v.product_uid = p.uid AND v.active = true
GROUP BY p.uid, p.name;

/* ---------- COMMENTS: CSV MAPPING ---------- */
/*
  PRODUCTS CSV header -> products table mapping:
  UID -> products.uid
  Product Name -> products.name
  Slug -> products.slug
  Category -> categories.name (importer must resolve to category_id)
  Super Category -> products.super_category (denormalized)
  Subcategory -> products.subcategory (denormalized)
  Style -> products.style
  Occasion -> products.occasion
  Season -> products.season
  Featured -> products.featured
  Best Selling -> products.best_selling
  Active -> products.active
  Price -> products.price
  Cost Price -> products.cost_price
  Profit % -> products.profit_percent
  Profit Amount -> products.profit_amount
  Colors -> product_colors (importer resolves colors table & creates product_colors rows)
  Sizes_With_Stock -> used by importer to create product_variants rows for each size/color combination
  Tags -> products.tags (array)
  Main Image URL -> products.main_image_path (populated automatically after upload)
*/

/*
  VARIANTS CSV header -> product_variants mapping:
  Product_UID -> product_variants.product_uid
  Product_Name -> derived; inserted into order_items later if needed
  Slug -> products.slug validation
  Category/Subcategory/Style/Season/Occasion -> denormalized / validation
  Variant_SKU -> product_variants.sku
  Color -> map to colors.id -> product_variants.color_id
  Size -> map to sizes.id -> product_variants.size_id
  Stock -> product_variants.stock
  Price -> product_variants.price (nullable)
  Cost -> product_variants.cost
  Active -> product_variants.active
  Tag_List -> product_variants.tags (text[])
  Images_JSON -> product_variants.images (JSON array) (populated after admin uploads images)
*/

/* ---------- INDEX NOTES ---------- */
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants(stock);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING gin (tags);

/* ---------- END OF SQL ---------- */



