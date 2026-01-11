-- Homepage Sale Strip table & policies (idempotent)
-- Ensures single published record, service-role managed

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS homepage_sale_strips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_text text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    visible boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sale_strips_created_at
    ON homepage_sale_strips (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homepage_sale_strips_single_published
    ON homepage_sale_strips ((status))
    WHERE status = 'published';

ALTER TABLE homepage_sale_strips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'homepage_sale_strips'
      AND policyname = 'Service role can manage sale strips'
  ) THEN
    CREATE POLICY "Service role can manage sale strips"
    ON homepage_sale_strips
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;



















