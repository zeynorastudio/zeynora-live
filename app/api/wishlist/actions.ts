"use server";

import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { WishlistItem } from "@/lib/store/wishlist";
import { getCustomerByAuthUid } from "@/lib/auth/customers";

export async function toggleWishlistAction(product_uid: string, variant_sku?: string | null) {
  // Use regular client for auth check
  const supabase = await createServerClient();
  
  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Guest: Return success - wishlist stored in localStorage
    // No error for guests - this is expected behavior
    return { action: "toggled", guest: true };
  }

  // Get customer to find user_id
  const customer = await getCustomerByAuthUid(supabase, user.id);
  if (!customer) {
    // Not an error - user might not have customer record yet
    // Return success for guest-like behavior
    return { action: "toggled", guest: true };
  }

  // Find user_id for this customer (for wishlist_items.user_id)
  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as { id: string } | null;
  if (!typedUserRecord) {
    return { error: "User record not found" };
  }

  // 2. Check Product Existence (read - can use regular client with RLS)
  const { data: product } = await supabase
    .from("products")
    .select("uid")
    .eq("uid", product_uid)
    .single();

  const typedProduct = product as { uid: string } | null;
  if (!typedProduct) return { error: "Product not found" };

  // 3. Check Variant if provided (read - can use regular client with RLS)
  if (variant_sku) {
     const { data: variant } = await supabase
       .from("product_variants")
       .select("sku")
       .eq("sku", variant_sku)
       .single();
     const typedVariant = variant as { sku: string } | null;
     if (!typedVariant) return { error: "Variant not found" };
  }

  // Use service-role client for writes
  const serviceSupabase = createServiceRoleClient();

  // 4. Check Wishlist (read - use service-role for consistency)
  const { data: existing } = await serviceSupabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", typedUserRecord.id)
    .eq("product_uid", product_uid)
    .filter("variant_sku", variant_sku ? "eq" : "is", variant_sku || null)
    .maybeSingle();

  const typedExisting = existing as { id: string } | null;

  if (typedExisting) {
    // Remove (write - use service-role)
    await serviceSupabase
      .from("wishlist_items")
      .delete()
      .eq("id", typedExisting.id);
    return { action: "removed" };
  } else {
    // Add (write - use service-role)
    await serviceSupabase
      .from("wishlist_items")
      .insert({
        user_id: typedUserRecord.id,
        customer_id: customer.id, // Also set customer_id if column exists
        product_uid,
        variant_sku: variant_sku || null
      } as unknown as never);
    return { action: "added" };
  }
}

export async function fetchWishlistAction(): Promise<WishlistItem[]> {
  // Reads can use regular client with RLS
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data } = await supabase
    .from("wishlist_items")
    .select("product_uid, variant_sku")
    .eq("user_id", user.id);

  const typedData = (data || []) as Array<{
    product_uid: string;
    variant_sku: string | null;
  }>;

  return typedData.map(item => ({
    product_uid: item.product_uid,
    variant_sku: item.variant_sku
  }));
}
