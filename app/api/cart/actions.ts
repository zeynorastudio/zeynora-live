"use server";

import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getCustomerByAuthUid } from "@/lib/auth/customers";

// Helper to get or create cart
// Uses service-role client for writes
async function getOrCreateCartId(authSupabase: any, serviceSupabase: any): Promise<string | null> {
  // 1. Check authenticated user
  const { data: { user } } = await authSupabase.auth.getUser();
  
  if (user) {
    // Get customer to find user_id
    const customer = await getCustomerByAuthUid(authSupabase, user.id);
    if (!customer) {
      return null;
    }

    // Find user_id for this customer
    const { data: userRecord } = await authSupabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;
    if (!typedUserRecord) {
      return null;
    }

    // Find existing cart for user (read - use service-role for consistency)
    const { data: cart } = await serviceSupabase
      .from("carts")
      .select("id")
      .eq("user_id", typedUserRecord.id)
      .maybeSingle();
      
    const typedCart = cart as { id: string } | null;
    if (typedCart) return typedCart.id;

    // Create new cart for user (write - use service-role)
    const { data: newCart, error } = await serviceSupabase
      .from("carts")
      .insert({ 
        user_id: typedUserRecord.id,
        customer_id: customer.id // Also set customer_id if column exists
      } as unknown as never)
      .select("id")
      .single();
      
    if (error) throw new Error("Failed to create cart");
    const typedNewCart = newCart as { id: string } | null;
    return typedNewCart?.id || null;
  }

  // 2. Guest: Check session cookie "z_session"
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("z_session")?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set("z_session", sessionId);
  }

  // Find guest cart (read - use service-role for consistency)
  const { data: cart } = await serviceSupabase
    .from("carts")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  const typedCart = cart as { id: string } | null;
  if (typedCart) return typedCart.id;

  // Create guest cart (write - use service-role)
  const { data: newCart, error } = await serviceSupabase
    .from("carts")
    .insert({ session_id: sessionId } as unknown as never)
    .select("id")
    .single();

  if (error) throw new Error("Failed to create guest cart");
  const typedNewCart = newCart as { id: string } | null;
  return typedNewCart?.id || null;
}

export async function addToCartAction(product_uid: string, variant_sku: string, qty: number) {
  // Use regular client for auth and reads
  const authSupabase = await createServerClient();
  
  try {
    // PHASE 2 VALIDATION: Prevent adding variants without proper data
    
    // 1. Validate Stock & SKU (read - can use regular client with RLS)
    // Lookup by SKU instead of ID
    const { data: variant } = await authSupabase
      .from("product_variants")
      .select("id, sku, stock, price, product_uid, active")
      .eq("sku", variant_sku)
      .single();

    const typedVariant = variant as { 
      id: string;
      sku: string | null; 
      stock: number | null; 
      price: number | null; 
      product_uid: string;
      active: boolean | null;
    } | null;
    
    if (!typedVariant) {
      return { error: "Variant not found" };
    }
    
    // SAFETY: Prevent adding variants without SKU
    if (!typedVariant.sku || typedVariant.sku.trim().length === 0) {
      return { error: "Product variant is invalid (missing SKU)" };
    }
    
    // SAFETY: Prevent adding inactive variants
    if (typedVariant.active === false) {
      return { error: "This variant is no longer available" };
    }
    
    // SAFETY: Prevent adding out-of-stock variants
    const availableStock = typedVariant.stock || 0;
    if (availableStock < 1) {
      return { error: "Out of stock" };
    }
    
    if (availableStock < qty) {
      return { error: `Only ${availableStock} units available` };
    }
    
    // SAFETY: Verify product_uid matches
    if (typedVariant.product_uid !== product_uid) {
      return { error: "Product variant mismatch" };
    }

    // Resolve price (variant price or product price) - read
    let finalPrice = typedVariant.price;
    if (!finalPrice) {
        const { data: product } = await authSupabase
            .from("products")
            .select("price")
            .eq("uid", typedVariant.product_uid)
            .single();
        const typedProduct = product as { price: number } | null;
        finalPrice = typedProduct?.price || 0;
    }

    // Use service-role client for writes
    const serviceSupabase = createServiceRoleClient();

    // 2. Get Cart ID (uses service-role for writes)
    const cartId = await getOrCreateCartId(authSupabase, serviceSupabase);
    if (!cartId) return { error: "Cart init failed" };

    // 3. Merge/Insert (write - use service-role)
    // Check if exists (use variant ID from lookup)
    const { data: existingItem } = await serviceSupabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_variant_id", typedVariant.id)
      .maybeSingle();

    const typedExistingItem = existingItem as { id: string; quantity: number } | null;
    if (typedExistingItem) {
      const newQty = typedExistingItem.quantity + qty;
      const availableStock = typedVariant.stock || 0;
      
      if (availableStock < newQty) {
        return { error: `Cannot add ${qty} more. Only ${Math.max(0, availableStock - typedExistingItem.quantity)} available` };
      }

      await serviceSupabase
        .from("cart_items")
        .update({ quantity: newQty } as unknown as never)
        .eq("id", typedExistingItem.id);
    } else {
      await serviceSupabase
        .from("cart_items")
        .insert({
          cart_id: cartId,
          product_variant_id: typedVariant.id,
          quantity: qty,
          price_snapshot: finalPrice
        } as unknown as never);
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to add to cart" };
  }
}

export async function updateCartQtyAction(variantId: string, qty: number) {
  // Use regular client for auth
  const authSupabase = await createServerClient();
  
  try {
    // Use service-role client for writes
    const serviceSupabase = createServiceRoleClient();

    const cartId = await getOrCreateCartId(authSupabase, serviceSupabase);
    if (!cartId) return { error: "Cart not found" };

    if (qty <= 0) {
      return removeFromCartAction(variantId);
    }

    // PHASE 2 VALIDATION: Check Stock & SKU
    const { data: variant } = await authSupabase
      .from("product_variants")
      .select("sku, stock, active")
      .eq("id", variantId)
      .single();
    
    const typedVariant = variant as { 
      sku: string | null;
      stock: number | null; 
      active: boolean | null;
    } | null;
    
    if (!typedVariant) {
      return { error: "Variant not found" };
    }
    
    // SAFETY: Check SKU exists
    if (!typedVariant.sku) {
      return { error: "Invalid variant" };
    }
    
    // SAFETY: Check if variant is active
    if (typedVariant.active === false) {
      return { error: "This variant is no longer available" };
    }
    
    // SAFETY: Check stock availability
    const availableStock = typedVariant.stock || 0;
    if (availableStock < qty) {
      return { error: `Only ${availableStock} units available` };
    }

    // Update (write - use service-role)
    await serviceSupabase
      .from("cart_items")
      .update({ quantity: qty } as unknown as never)
      .eq("cart_id", cartId)
      .eq("product_variant_id", variantId);

    return { success: true };
  } catch (error) {
    return { error: "Update failed" };
  }
}

export async function removeFromCartAction(variantId: string) {
  // Use regular client for auth
  const authSupabase = await createServerClient();
  
  try {
    // Use service-role client for writes
    const serviceSupabase = createServiceRoleClient();

    const cartId = await getOrCreateCartId(authSupabase, serviceSupabase);
    if (!cartId) return { error: "Cart not found" };

    // Delete (write - use service-role)
    await serviceSupabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId)
      .eq("product_variant_id", variantId);

    return { success: true };
  } catch (error) {
    return { error: "Remove failed" };
  }
}

export async function fetchCartAction() {
  // Reads can use regular client with RLS
  const authSupabase = await createServerClient();
  const serviceSupabase = createServiceRoleClient();
  
  const cartId = await getOrCreateCartId(authSupabase, serviceSupabase);
  if (!cartId) return [];

  // Fetch items with details (read - can use regular client with RLS)
  const { data: items } = await authSupabase
    .from("cart_items")
    .select(`
      id,
      quantity,
      price_snapshot,
      product_variant_id,
      product_variants (
        sku,
        product_uid,
        colors (name),
        sizes (code),
        products (name, main_image_path)
      )
    `)
    .eq("cart_id", cartId);

  // Normalize to Phase 2 CartItem format
  const typedItems = (items || []) as Array<{
    id: string;
    quantity: number;
    price_snapshot: number;
    product_variant_id: string;
    product_variants: {
      sku: string;
      product_uid: string;
      colors: { name: string } | null;
      sizes: { code: string } | null;
      products: { name: string; main_image_path: string | null } | null;
    } | null;
  }>;

  return typedItems
    .filter((item) => item.product_variants?.sku) // Filter out variants without SKU (safety)
    .map((item) => ({
      id: item.id,
      product_uid: item.product_variants!.product_uid,
      variant_id: item.product_variant_id,
      variant_sku: item.product_variants!.sku,
      product_name: item.product_variants?.products?.name || "Unknown Product",
      size: item.product_variants?.sizes?.code || "N/A",
      price: item.price_snapshot,
      quantity: item.quantity,
      image: item.product_variants?.products?.main_image_path || undefined,
      color: item.product_variants?.colors?.name || undefined,
    }));
}
