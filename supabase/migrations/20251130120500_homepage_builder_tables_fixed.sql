-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. homepage_hero
CREATE TABLE IF NOT EXISTS homepage_hero (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    subtitle text,
    cta_text text,
    cta_url text,
    desktop_image text NOT NULL,
    mobile_image text,
    order_index integer NOT NULL DEFAULT 0,
    visible boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_hero_order_index ON homepage_hero(order_index);

-- 2. homepage_categories
CREATE TABLE IF NOT EXISTS homepage_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    image text NOT NULL,
    title_override text,
    url_override text,
    order_index integer NOT NULL DEFAULT 0,
    visible boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_categories_order_index ON homepage_categories(order_index);

-- 3. homepage_sections
CREATE TABLE IF NOT EXISTS homepage_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    subtitle text,
    source_type text NOT NULL CHECK (source_type IN ('automatic', 'manual')),
    source_meta jsonb DEFAULT '{}'::jsonb,
    product_count integer NOT NULL DEFAULT 0,
    sort_order text DEFAULT 'default',
    order_index integer NOT NULL DEFAULT 0,
    visible boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_order_index ON homepage_sections(order_index);

-- 4. homepage_section_products
-- CORRECTION: products table uses 'uid' (text) as primary key
CREATE TABLE IF NOT EXISTS homepage_section_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id uuid NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES products(uid) ON DELETE CASCADE,
    order_index integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_homepage_section_products_section_id ON homepage_section_products(section_id);
CREATE INDEX IF NOT EXISTS idx_homepage_section_products_order_index ON homepage_section_products(order_index);

-- 5. homepage_banners
CREATE TABLE IF NOT EXISTS homepage_banners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    desktop_image text NOT NULL,
    mobile_image text,
    link text,
    order_index integer NOT NULL DEFAULT 0,
    visible boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_banners_order_index ON homepage_banners(order_index);

-- 6. homepage_settings
CREATE TABLE IF NOT EXISTS homepage_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hero_max_height_desktop integer DEFAULT 800,
    hero_max_height_mobile integer DEFAULT 600,
    page_padding integer DEFAULT 24,
    bg_color text DEFAULT 'white',
    lazy_load_enabled boolean DEFAULT true,
    section_dividers_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 7. audit_logs (if missing)
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    event text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);


-- Enable RLS on all tables
ALTER TABLE homepage_hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Service Role Only)
-- Grant full access to service_role, deny everyone else by default (implicit deny)

-- homepage_hero
CREATE POLICY "Service role has full access to homepage_hero"
ON homepage_hero
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- homepage_categories
CREATE POLICY "Service role has full access to homepage_categories"
ON homepage_categories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- homepage_sections
CREATE POLICY "Service role has full access to homepage_sections"
ON homepage_sections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- homepage_section_products
CREATE POLICY "Service role has full access to homepage_section_products"
ON homepage_section_products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- homepage_banners
CREATE POLICY "Service role has full access to homepage_banners"
ON homepage_banners
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- homepage_settings
CREATE POLICY "Service role has full access to homepage_settings"
ON homepage_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- audit_logs
CREATE POLICY "Service role has full access to audit_logs"
ON audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);




















