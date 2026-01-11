import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let cartId: string | null = null;

    if (user) {
      // Find existing cart for user
      const { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .single();
        
      const typedCart = cart as { id: string } | null;
      if (typedCart) {
        cartId = typedCart.id;
      } else {
        // Create new cart for user
        const { data: newCart } = await supabase
          .from("carts")
          .insert({ user_id: user.id } as any)
          .select("id")
          .single();
        const typedNewCart = newCart as { id: string } | null;
        cartId = typedNewCart?.id || null;
      }
    } else {
      // Guest: Check session cookie "z_session"
      const cookieStore = await cookies();
      let sessionId = cookieStore.get("z_session")?.value;

      if (sessionId) {
        const { data: cart } = await supabase
          .from("carts")
          .select("id")
          .eq("session_id", sessionId)
          .single();
        const typedCart = cart as { id: string } | null;
        cartId = typedCart?.id || null;
      }
      // If no session, we effectively have no cart to fetch yet. 
      // We don't create one just on GET usually, but for consistency with action we might?
      // Actually, if they haven't added anything, an empty cart is fine.
    }

    if (!cartId) {
      return NextResponse.json({ items: [] });
    }

    // Fetch items with details
    const { data: items } = await supabase
      .from("cart_items")
      .select(`
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

    // Type assertion
    const typedItems = (items || []) as Array<{
      quantity: number;
      price_snapshot: number;
      product_variant_id: string;
      product_variants: {
        sku: string;
        product_uid: string;
        colors: { name: string } | null;
        sizes: { code: string } | null;
        products: {
          name: string;
          main_image_path: string | null;
        } | null;
      } | null;
    }>;

    // Normalize
    const formattedItems = typedItems.map((item) => ({
      variantId: item.product_variant_id,
      quantity: item.quantity,
      price: item.price_snapshot,
      name: item.product_variants?.products?.name || "",
      image: item.product_variants?.products?.main_image_path || null,
      color: item.product_variants?.colors?.name || "",
      size: item.product_variants?.sizes?.code || "",
      sku: item.product_variants?.sku || "",
      product_uid: item.product_variants?.product_uid || ""
    }));

    return NextResponse.json({ items: formattedItems });
  } catch (error) {
    console.error("Cart fetch error:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
