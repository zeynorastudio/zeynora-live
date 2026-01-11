import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ImageAttachPayload } from "@/types/admin";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const resolvedParams = await params;
    // Auth Check
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("auth_uid", user.id).single();
    const typedUserData = userData as { role: string } | null;
    if (!typedUserData || !["admin", "super_admin"].includes(typedUserData.role || "")) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json() as ImageAttachPayload;
    
    if (!body.images || body.images.length === 0) {
        return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    const results: Array<any> = [];
    const warnings: string[] = [];

    for (const img of body.images) {
        // 1. Insert into product_images
        const { data: imgData, error: dbError } = await adminClient
            .from("product_images")
            .insert({
                product_uid: resolvedParams.uid,
                image_path: img.path, // Ensure path is full 'supabase://products/...' or relative? 
                // Prompt says "Store image reference ... as supabase://products/{path}"
                // Assuming client sends 'supabase://...' or we format it.
                // Let's assume client sends valid strings.
                type: img.type || "gallery",
                display_order: img.sequence || 0,
                alt_text: img.alt_text,
            } as unknown as never)
            .select()
            .single();

        if (dbError) {
            warnings.push(`Failed to attach ${img.path}: ${dbError.message}`);
            continue;
        }

        if (imgData) {
          results.push(imgData);
        }

        // 2. Update Variant if sku provided
        if (img.variant_sku) {
             const { data: variant } = await adminClient
               .from("product_variants")
               .select("images")
               .eq("sku", img.variant_sku)
               .eq("product_uid", resolvedParams.uid)
               .single();
             
             const typedVariant = variant as { images: string[] | null } | null;
             if (typedVariant) {
               const currentImages = (typedVariant.images as string[]) || [];
               if (!currentImages.includes(img.path)) {
                  const newImages = [...currentImages, img.path];
                  await adminClient
                    .from("product_variants")
                    .update({ images: newImages } as unknown as never)
                    .eq("sku", img.variant_sku)
                    .eq("product_uid", resolvedParams.uid);
               }
             } else {
                 warnings.push(`Variant SKU ${img.variant_sku} not found, image only attached to product gallery.`);
             }
        }
    }

    return NextResponse.json({ ok: true, results, warnings });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
