import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const supabase = await createServerClient();

    // Fetch variants with sizes and stock info
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select(`
        id,
        sku,
        size_id,
        stock,
        price,
        active,
        sizes (
          code,
          label,
          display_order
        )
      `)
      .eq("product_uid", uid)
      .eq("active", true);

    if (error) {
      console.error("Error fetching variants:", error);
      return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500 });
    }

    // Group by size and return unique sizes with their variants
    const sizeMap = new Map<string, {
      code: string;
      label: string | null;
      variants: Array<{
        id: string;
        sku: string;
        stock: number;
        price: number | null;
      }>;
    }>();

    (variants || []).forEach((v: any) => {
      const sizeCode = v.sizes?.code || "OS";
      const sizeLabel = v.sizes?.label || null;
      
      if (!sizeMap.has(sizeCode)) {
        sizeMap.set(sizeCode, {
          code: sizeCode,
          label: sizeLabel,
          variants: [],
        });
      }

      sizeMap.get(sizeCode)!.variants.push({
        id: v.id,
        sku: v.sku,
        stock: v.stock || 0,
        price: v.price,
      });
    });

    // Convert to array and sort by display_order if available, otherwise by size code
    const sizes = Array.from(sizeMap.values()).sort((a, b) => {
      // Try to get display_order from first variant's size
      const aVariant = variants?.find((v: any) => v.sizes?.code === a.code);
      const bVariant = variants?.find((v: any) => v.sizes?.code === b.code);
      
      const aDisplayOrder = aVariant?.sizes?.display_order ?? 999;
      const bDisplayOrder = bVariant?.sizes?.display_order ?? 999;
      
      if (aDisplayOrder !== bDisplayOrder) {
        return aDisplayOrder - bDisplayOrder;
      }
      
      // Fallback to custom sort: XS, S, M, L, XL, XXL, etc.
      const order = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "OS"];
      const aIndex = order.indexOf(a.code);
      const bIndex = order.indexOf(b.code);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.code.localeCompare(b.code);
    });

    return NextResponse.json({ sizes });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[PRODUCT_VARIANTS] Error:", errorMessage);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


