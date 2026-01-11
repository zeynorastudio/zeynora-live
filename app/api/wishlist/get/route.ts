import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ items: [] });
    }

    const { data } = await supabase
      .from("wishlist_items")
      .select("product_uid, variant_sku")
      .eq("user_id", user.id);

    const typedData = (data || []) as Array<{
      product_uid: string;
      variant_sku: string | null;
    }>;

    const items = typedData.map(item => ({
      product_uid: item.product_uid,
      variant_sku: item.variant_sku
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Wishlist fetch error:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
