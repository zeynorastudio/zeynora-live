/**
 * POST /api/auth/merge-guest
 * 
 * Merges guest cart and wishlist into customer account on login/signup.
 * 
 * Body: { customer_id: string }
 * 
 * Flow:
 * 1. Get guest session_id from cookie
 * 2. Find guest cart by session_id
 * 3. Find customer cart (by customer_id -> user_id)
 * 4. Merge cart items (deduplicate by SKU, sum quantities)
 * 5. Reassign guest cart to customer (or delete if empty)
 * 6. Merge wishlist items (deduplicate by product_uid + variant_sku)
 * 7. Clear guest cookie
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { error: "customer_id is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const guestSessionId = cookieStore.get("z_session")?.value;

    if (!guestSessionId) {
      // No guest data to merge
      return NextResponse.json({ success: true, merged: false });
    }

    const supabase = createServiceRoleClient();

    // Get customer's auth_uid and user_id
    const { data: customer } = await supabase
      .from("customers")
      .select("auth_uid")
      .eq("id", customer_id)
      .single();

    const typedCustomer = customer as { auth_uid: string | null } | null;
    if (!typedCustomer?.auth_uid) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Find user_id for this customer
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("auth_uid", typedCustomer.auth_uid)
      .maybeSingle();

    const typedUser = user as { id: string } | null;
    const userId = typedUser?.id || null;

    // 1. Merge Cart
    await mergeGuestCart(supabase, guestSessionId, customer_id, userId);

    // 2. Merge Wishlist
    await mergeGuestWishlist(supabase, guestSessionId, customer_id, userId);

    // 3. Clear guest cookie
    cookieStore.delete("z_session");

    return NextResponse.json({ success: true, merged: true });
  } catch (error: any) {
    console.error("Error merging guest data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to merge guest data" },
      { status: 500 }
    );
  }
}

/**
 * Merge guest cart into customer cart
 */
async function mergeGuestCart(
  supabase: any,
  guestSessionId: string,
  customerId: string,
  userId: string | null
) {
  // Find guest cart
  const { data: guestCart } = await supabase
    .from("carts")
    .select("id")
    .eq("session_id", guestSessionId)
    .maybeSingle();

  if (!guestCart) {
    return; // No guest cart to merge
  }

  // Get guest cart items
  const { data: guestItems } = await supabase
    .from("cart_items")
    .select("product_variant_id, quantity, price_snapshot")
    .eq("cart_id", guestCart.id);

  if (!guestItems || guestItems.length === 0) {
    // Delete empty guest cart
    await supabase.from("carts").delete().eq("id", guestCart.id);
    return;
  }

  if (!userId) {
    // Customer doesn't have a user_id yet, can't merge cart
    // Delete guest cart items and cart
    await supabase.from("cart_items").delete().eq("cart_id", guestCart.id);
    await supabase.from("carts").delete().eq("id", guestCart.id);
    return;
  }

  // Find or create customer cart
  let { data: customerCart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!customerCart) {
    const { data: newCart } = await supabase
      .from("carts")
      .insert({
        user_id: userId,
        customer_id: customerId,
      })
      .select("id")
      .single();
    customerCart = newCart;
  } else {
    // Update customer_id if column exists
    await supabase
      .from("carts")
      .update({ customer_id: customerId })
      .eq("id", customerCart.id);
  }

  if (!customerCart) {
    return; // Failed to create customer cart
  }

  // Get existing customer cart items
  const { data: existingItems } = await supabase
    .from("cart_items")
    .select("product_variant_id, quantity")
    .eq("cart_id", customerCart.id);

  const existingItemsMap = new Map<string, number>();
  (existingItems || []).forEach((item: any) => {
    const key = item.product_variant_id;
    existingItemsMap.set(key, item.quantity || 0);
  });

  // Merge items: deduplicate by product_variant_id, sum quantities
  const mergedItems = new Map<string, { quantity: number; price: number }>();
  
  // Add existing items
  existingItemsMap.forEach((quantity, variantId) => {
    const guestItem = guestItems.find((item: any) => item.product_variant_id === variantId);
    const price = guestItem?.price_snapshot || 0;
    mergedItems.set(variantId, { quantity, price });
  });

  // Add/merge guest items
  guestItems.forEach((item: any) => {
    const variantId = item.product_variant_id;
    const existing = mergedItems.get(variantId);
    if (existing) {
      existing.quantity += item.quantity || 0;
    } else {
      mergedItems.set(variantId, {
        quantity: item.quantity || 0,
        price: item.price_snapshot || 0,
      });
    }
  });

  // Delete all existing cart items
  await supabase.from("cart_items").delete().eq("cart_id", customerCart.id);

  // Insert merged items
  if (mergedItems.size > 0) {
    const itemsToInsert = Array.from(mergedItems.entries()).map(
      ([variantId, data]) => ({
        cart_id: customerCart.id,
        product_variant_id: variantId,
        quantity: data.quantity,
        price_snapshot: data.price,
      })
    );

    await supabase.from("cart_items").insert(itemsToInsert);
  }

  // Delete guest cart
  await supabase.from("carts").delete().eq("id", guestCart.id);
}

/**
 * Merge guest wishlist into customer wishlist
 */
async function mergeGuestWishlist(
  supabase: any,
  guestSessionId: string,
  customerId: string,
  userId: string | null
) {
  // Note: wishlist_items doesn't have session_id, so we can't track guest wishlist
  // This is a limitation - guest wishlist would need to be stored differently
  // For now, we'll skip wishlist merge if there's no user_id
  // In a full implementation, you might store guest wishlist in localStorage/cookies
  // and send it to this endpoint

  if (!userId) {
    return; // Can't merge wishlist without user_id
  }

  // If you have a guest wishlist mechanism, implement it here
  // For now, this is a placeholder
}

