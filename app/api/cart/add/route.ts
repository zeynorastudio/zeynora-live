import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { variantId, quantity, cartId } = body;

    if (!variantId || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use regular client for auth and reads
    const authSupabase = await createServerClient();
    // Use service-role client for writes
    const serviceSupabase = createServiceRoleClient();

    // 1. Get or create Cart
    let targetCartId = cartId;
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("z_session")?.value;

    if (!targetCartId) {
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        // Note: Can't set cookies in route handler easily, but we'll return sessionId
      }

      // Create cart (write - use service-role)
      const { data: newCart, error: cartError } = await serviceSupabase
        .from("carts")
        .insert({ session_id: sessionId } as unknown as never)
        .select()
        .single();

      if (cartError) {
        console.error("Cart creation error:", cartError);
        return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
      }
      const typedNewCart = newCart as { id: string } | null;
      targetCartId = typedNewCart?.id || null;
      if (!targetCartId) {
        return NextResponse.json({ error: "Failed to create cart" }, { status: 500 });
      }
    }

    // 2. Get Variant with stock info
    const { data: variant, error: variantError } = await authSupabase
      .from("product_variants")
      .select("price, product_uid, stock, active")
      .eq("id", variantId)
      .single();
    
    if (variantError || !variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const typedVariant = variant as { 
      price: number | null; 
      product_uid: string;
      stock: number | null;
      active: boolean;
    };

    // Validate variant is active
    if (!typedVariant.active) {
      return NextResponse.json({ 
        error: "This variant is no longer available" 
      }, { status: 400 });
    }

    // Validate stock availability
    const availableStock = typedVariant.stock ?? 0;
    if (availableStock < quantity) {
      return NextResponse.json({ 
        error: availableStock === 0 
          ? "This item is out of stock" 
          : `Only ${availableStock} items available`,
        available_stock: availableStock,
        requested_quantity: quantity,
      }, { status: 400 });
    }
    
    // Fallback to product price if variant price is null
    let finalPrice = 0;
    if (typedVariant.price) {
      finalPrice = typedVariant.price;
    } else {
      const { data: product } = await authSupabase
        .from("products")
        .select("price")
        .eq("uid", typedVariant.product_uid)
        .single();
      const typedProduct = product as { price: number } | null;
      finalPrice = typedProduct?.price || 0;
    }

    // 3. Add Item to Cart (write - use service-role)
    const { data: item, error: itemError } = await serviceSupabase
      .from("cart_items")
      .insert({
        cart_id: targetCartId,
        product_variant_id: variantId,
        quantity: quantity,
        price_snapshot: finalPrice
      } as unknown as never)
      .select()
      .single();

    if (itemError) {
      console.error("Add item error:", itemError);
      return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item, cartId: targetCartId, sessionId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CART_ADD] Unexpected error:", {
      route: "/api/cart/add",
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
