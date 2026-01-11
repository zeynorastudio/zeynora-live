-- Migration: Add new_launch flag to products table
-- Purpose: Support "New Launch" product section on homepage

-- Add new_launch column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'new_launch'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN new_launch BOOLEAN DEFAULT false NOT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN products.new_launch IS 
      'Flag to mark products as new launches. Used for homepage "New Launch" section.';
  END IF;
END $$;




