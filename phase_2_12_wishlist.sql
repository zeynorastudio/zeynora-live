/* phase_2_12_wishlist.sql */

/* 19. wishlist_items */
CREATE TABLE IF NOT EXISTS wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_uid text REFERENCES products(uid) ON DELETE CASCADE,
  variant_sku text, -- optional specific variant
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_uid, variant_sku)
);

/* RLS Policies for Wishlist */
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist"
  ON wishlist_items FOR SELECT
  USING (auth.uid() = (SELECT auth_uid FROM users WHERE id = wishlist_items.user_id));

CREATE POLICY "Users can insert into their own wishlist"
  ON wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_uid FROM users WHERE id = wishlist_items.user_id));

CREATE POLICY "Users can delete from their own wishlist"
  ON wishlist_items FOR DELETE
  USING (auth.uid() = (SELECT auth_uid FROM users WHERE id = wishlist_items.user_id));



