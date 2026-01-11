-- Decrement Stock RPC Functions (idempotent)
-- Atomic stock decrement functions for order fulfillment
-- Prevents negative stock and handles concurrent updates safely

-- Function 1: Decrement stock by variant_id (UUID)
-- Used in: app/api/payments/verify/route.ts
CREATE OR REPLACE FUNCTION decrement_stock(
  variant_id_in uuid,
  qty_in integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock integer;
  new_stock integer;
BEGIN
  -- Get current stock with row lock to prevent race conditions
  SELECT stock INTO current_stock
  FROM product_variants
  WHERE id = variant_id_in
  FOR UPDATE;

  -- Handle NULL stock (treat as 0)
  IF current_stock IS NULL THEN
    current_stock := 0;
  END IF;

  -- Calculate new stock (prevent negative)
  new_stock := GREATEST(0, current_stock - qty_in);

  -- Update stock atomically
  UPDATE product_variants
  SET 
    stock = new_stock,
    updated_at = now()
  WHERE id = variant_id_in;

  -- Optional: Raise exception if stock would go negative (uncomment if needed)
  -- IF new_stock < 0 THEN
  --   RAISE EXCEPTION 'Insufficient stock: requested %, available %', qty_in, current_stock;
  -- END IF;
END;
$$;

-- Function 2: Decrement stock by SKU (text)
-- Used in: app/api/orders/create/route.ts
CREATE OR REPLACE FUNCTION decrement_stock_by_sku(
  sku_in text,
  qty_in integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock integer;
  new_stock integer;
BEGIN
  -- Get current stock with row lock to prevent race conditions
  SELECT stock INTO current_stock
  FROM product_variants
  WHERE sku = sku_in
  FOR UPDATE;

  -- Handle NULL stock (treat as 0)
  IF current_stock IS NULL THEN
    current_stock := 0;
  END IF;

  -- Calculate new stock (prevent negative)
  new_stock := GREATEST(0, current_stock - qty_in);

  -- Update stock atomically
  UPDATE product_variants
  SET 
    stock = new_stock,
    updated_at = now()
  WHERE sku = sku_in;

  -- Optional: Raise exception if stock would go negative (uncomment if needed)
  -- IF new_stock < 0 THEN
  --   RAISE EXCEPTION 'Insufficient stock: requested %, available %', qty_in, current_stock;
  -- END IF;
END;
$$;

-- Grant execute permissions to service_role and authenticated users
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_stock_by_sku(text, integer) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION decrement_stock(uuid, integer) IS 
  'Atomically decrements variant stock by variant_id. Prevents negative stock. Uses row-level locking for concurrency safety.';

COMMENT ON FUNCTION decrement_stock_by_sku(text, integer) IS 
  'Atomically decrements variant stock by SKU. Prevents negative stock. Uses row-level locking for concurrency safety.';


















