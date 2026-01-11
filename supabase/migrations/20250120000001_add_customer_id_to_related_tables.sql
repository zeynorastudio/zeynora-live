/* Migration: Add customer_id columns to addresses, carts, wishlist_items
   ZEYNORA - Customer Authentication Flow
   
   This migration adds customer_id columns to related tables to support
   the separate customers table while maintaining backward compatibility.
   
   DO NOT RUN - PROPOSED MIGRATION ONLY
   Review and approve before execution.
*/

-- Add customer_id to addresses table
ALTER TABLE addresses 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;

-- Add customer_id to carts table
ALTER TABLE carts 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Add customer_id to wishlist_items table
-- Note: wishlist_items currently has user_id. We'll keep both for backward compatibility.
ALTER TABLE wishlist_items 
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_customer_id ON wishlist_items(customer_id);

-- Comments
COMMENT ON COLUMN addresses.customer_id IS 'Reference to customers table. Nullable for backward compatibility.';
COMMENT ON COLUMN carts.customer_id IS 'Reference to customers table. Nullable for backward compatibility.';
COMMENT ON COLUMN wishlist_items.customer_id IS 'Reference to customers table. Nullable for backward compatibility.';

















