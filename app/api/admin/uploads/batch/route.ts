import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/utils/images";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Authenticate and Authorize
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", user.id)
      .single();

    const typedUserData = userData as { role: string } | null;
    if (userError || !typedUserData || !["admin", "super_admin"].includes(typedUserData.role || "")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const productUid = formData.get("product_uid") as string;
    const files = formData.getAll("files[]") as File[];
    const variantSku = formData.get("variant_sku") as string | null;
    const type = (formData.get("type") as string) || "detail";

    if (!productUid || files.length === 0) {
      return NextResponse.json({ error: "Missing product_uid or files" }, { status: 400 });
    }

    // 3. Process Uploads
    const adminClient = createServiceRoleClient();
    const uploadedResults: Array<{
      filename: string;
      path: string;
      db_id: string | undefined;
      public_url: string;
    }> = [];
    const warnings: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validation
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        warnings.push(`Skipped ${file.name}: Invalid file type`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        warnings.push(`Skipped ${file.name}: File too large (>20MB)`);
        continue;
      }

      // Naming Convention
      // products/{product_uid}/hero-{product_uid}-{variantSkuOrColorOrsequence}.jpg
      // We use a simple sequence based on timestamp + index to avoid collisions if not careful
      const ext = file.name.split(".").pop() || "jpg";
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, "_");
      const timestamp = Date.now();
      
      let fileName = "";
      if (type === "hero") {
          fileName = `hero-${productUid}-${variantSku || `${timestamp}-${i}`}.${ext}`;
      } else if (type === "thumbnail") {
          fileName = `thumbnail-${productUid}-${variantSku || `${timestamp}-${i}`}.${ext}`;
      } else {
          fileName = `${type}-${productUid}-${timestamp}-${i}.${ext}`;
      }
      
      const path = `${productUid}/${fileName}`; // Bucket relative path

      // Upload
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await adminClient.storage
        .from("products")
        .upload(path, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        warnings.push(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      // DB Insert
      const fullStoragePath = `supabase://products/${path}`;
      const { data: imgData, error: dbError } = await adminClient
        .from("product_images")
        .insert({
          product_uid: productUid,
          image_path: fullStoragePath, 
          type: type,
          display_order: i,
          alt_text: `${type} image for ${productUid}`,
        } as unknown as never)
        .select()
        .single();

      if (dbError) {
         warnings.push(`Uploaded ${file.name} but failed DB insert: ${dbError.message}`);
         // Continue?
      }

      const typedImgData = imgData as { id: string } | null;

      // Update Variant if needed
      if (variantSku) {
        // We need to append to existing JSON array.
        // Requires fetching first or using specialized JSONB update if possible.
        // Supabase doesn't have easy "append to jsonb array" without raw SQL or fetch-update.
        const { data: variant } = await adminClient
          .from("product_variants")
          .select("images")
          .eq("sku", variantSku)
          .eq("product_uid", productUid)
          .single();
        
        const typedVariant = variant as { images: string[] | null } | null;
        if (typedVariant) {
          const currentImages = (typedVariant.images as string[]) || [];
          if (!currentImages.includes(fullStoragePath)) {
             const newImages = [...currentImages, fullStoragePath];
             await adminClient
               .from("product_variants")
               .update({ images: newImages } as unknown as never)
               .eq("sku", variantSku)
               .eq("product_uid", productUid);
          }
        }
      }

      uploadedResults.push({
        filename: file.name,
        path: path,
        db_id: typedImgData?.id,
        public_url: getPublicUrl("products", path), // getPublicUrl handles relative paths? 
        // My getPublicUrl takes (bucket, path).
        // If I pass 'products' and '123/img.jpg', it works.
      });
    }

    return NextResponse.json({ ok: true, uploaded: uploadedResults, warnings });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
