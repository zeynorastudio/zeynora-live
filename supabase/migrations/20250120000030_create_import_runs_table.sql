-- Migration: Create import_runs table for tracking bulk imports
-- Purpose: Enable idempotent imports and audit trail
-- Idempotent: Yes (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL UNIQUE, -- Generated batch ID (e.g., timestamp-based)
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  products_file_hash text, -- SHA256 hash of products CSV
  variants_file_hash text, -- SHA256 hash of variants CSV
  summary jsonb DEFAULT '{}'::jsonb, -- Store ImportSummary JSON
  errors jsonb DEFAULT '[]'::jsonb, -- Array of error objects
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_runs_batch_id ON import_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_runs_status ON import_runs(status);
CREATE INDEX IF NOT EXISTS idx_import_runs_created_at ON import_runs(created_at);

COMMENT ON TABLE import_runs IS 'Tracks bulk import operations for idempotency and audit';
COMMENT ON COLUMN import_runs.batch_id IS 'Unique identifier for this import batch';
COMMENT ON COLUMN import_runs.products_file_hash IS 'SHA256 hash of products CSV file';
COMMENT ON COLUMN import_runs.variants_file_hash IS 'SHA256 hash of variants CSV file';

-- Table to track individual imported rows for idempotency
CREATE TABLE IF NOT EXISTS import_row_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid REFERENCES import_runs(id) ON DELETE CASCADE,
  file_type text NOT NULL, -- 'product' | 'variant'
  file_hash text NOT NULL, -- Hash of source file
  row_index integer NOT NULL, -- Row number in CSV (1-based)
  product_uid text, -- For products
  variant_sku text, -- For variants
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_hash, row_index, file_type)
);

CREATE INDEX IF NOT EXISTS idx_import_row_tracking_run ON import_row_tracking(import_run_id);
CREATE INDEX IF NOT EXISTS idx_import_row_tracking_hash ON import_row_tracking(file_hash, row_index);
CREATE INDEX IF NOT EXISTS idx_import_row_tracking_product ON import_row_tracking(product_uid);
CREATE INDEX IF NOT EXISTS idx_import_row_tracking_sku ON import_row_tracking(variant_sku);

COMMENT ON TABLE import_row_tracking IS 'Tracks individual CSV rows to prevent duplicate imports';
COMMENT ON COLUMN import_row_tracking.file_hash IS 'Hash of source CSV file';
COMMENT ON COLUMN import_row_tracking.row_index IS 'Row number in CSV (1-based)';

















