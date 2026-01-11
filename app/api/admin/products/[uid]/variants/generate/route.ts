import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import slugify from "slugify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { colors, sizes_with_stock, price, cost_price, single_color } = await req.json();

    if (!colors || !Array.isArray(colors) || !sizes_with_stock) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Parse sizes_with_stock "S:10|M:5"
    const sizeMap: Record<string, number> = {};
    sizes_with_stock.split("|").forEach((part: string) => {
      const [size, qty] = part.split(":").map(s => s.trim());
      if (size && qty) sizeMap[size] = parseInt(qty) || 0;
    });

    const supabase = createServiceRoleClient();

    // Resolve Color/Size IDs
    // Assuming Colors are names, we need IDs.
    // If single_color, we map to 'default'.
    
    const variantsToInsert = [];

    for (const colorName of colors) {
       // Get/Create Color ID
       let cSlug = slugify(colorName, { lower: true, strict: true });
       if (single_color || colors.length === 1) {
         cSlug = "default";
       }

       const { data: cData } = await supabase.from("colors").select("id").eq("slug", cSlug).single();
       // If not found, upsert? "Reuse importer...". Importer upserts. 
       // For Phase 4.5, we assume they exist or we upsert simple stub.
       // Let's assume they exist for now or create on fly if needed.
       const typedCData = cData as { id: string } | null;
       let colorId = typedCData?.id;
       if (!colorId) {
          const { data: newC } = await supabase.from("colors").insert({ name: colorName, slug: cSlug, hex_code: cSlug === "default" ? "#FFFFFF" : null } as unknown as never).select("id").single();
          const typedNewC = newC as { id: string } | null;
          colorId = typedNewC?.id;
       }

       for (const [sizeCode, stock] of Object.entries(sizeMap)) {
          // Get/Create Size ID
          const { data: sData } = await supabase.from("sizes").select("id").eq("code", sizeCode).single();
          const typedSData = sData as { id: string } | null;
          let sizeId = typedSData?.id;
          if (!sizeId) {
             const { data: newS } = await supabase.from("sizes").insert({ code: sizeCode, label: sizeCode } as unknown as never).select("id").single();
             const typedNewS = newS as { id: string } | null;
             sizeId = typedNewS?.id;
          }

          // PHASE 2: Check if variant already exists (to preserve existing SKUs)
          const { data: existingVariant } = await supabase
            .from("product_variants")
            .select("sku")
            .eq("product_uid", resolvedParams.uid)
            .eq("color_id", colorId)
            .eq("size_id", sizeId)
            .maybeSingle();
          
          const typedExisting = existingVariant as { sku: string } | null;

          // SKU Generation: ONLY if variant doesn't exist or has no SKU
          // Format: ZYN-{PRODUCT_UID}-{SIZE}
          let sku: string;
          if (typedExisting?.sku) {
            // NEVER modify existing SKU
            sku = typedExisting.sku;
            console.log(`[VARIANT_GEN] Preserving existing SKU: ${sku}`);
          } else {
            // Generate new SKU using Phase 2 format
            sku = `ZYN-${resolvedParams.uid}-${sizeCode}`.toUpperCase();
            console.log(`[VARIANT_GEN] Generated new SKU: ${sku}`);
          }

          variantsToInsert.push({
             product_uid: resolvedParams.uid,
             sku,
             color_id: colorId,
             size_id: sizeId,
             stock,
             price: price || 0,
             cost: cost_price || null,
             active: true
          });
       }
    }
    
    const { error } = await supabase.from("product_variants").upsert(variantsToInsert as unknown as never, { onConflict: "sku" });

    if (error) throw error;

    // Audit
    await supabase.from("admin_audit_logs").insert({
        actor_user_id: session.user.id,
        action: "generate_variants",
        target_type: "product",
        target_id: resolvedParams.uid,
        payload_json: { count: variantsToInsert.length },
    } as unknown as never);

    return NextResponse.json({ success: true, count: variantsToInsert.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
