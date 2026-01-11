import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import sharp from "sharp"; // Optional dependency, handled if missing? 

// If sharp is not available (e.g. edge runtime), this route will crash on import or execution.
// We assume nodejs runtime.
export const runtime = 'nodejs'; // Force Node.js runtime for sharp

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userData } = await supabase.from("users").select("role").eq("auth_uid", user.id).single();
    const typedUserData = userData as { role: string } | null;
    if (!typedUserData || !["admin", "super_admin"].includes(typedUserData.role || "")) {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const productUid = body.product_uid;

    if (!productUid) return NextResponse.json({ error: "Missing product_uid" }, { status: 400 });

    // 1. Fetch Images
    const adminClient = createServiceRoleClient();
    const { data: images } = await adminClient
      .from("product_images")
      .select("*")
      .eq("product_uid", productUid);

    if (!images || images.length === 0) return NextResponse.json({ message: "No images found" });

    const typedImages = (images || []) as Array<{
      id: string;
      product_uid: string;
      image_path: string;
      image_type: string | null;
      alt_text: string | null;
      display_order: number;
      created_at: string;
    }>;

    const results = [];
    
    // 2. Process
    for (const img of typedImages) {
       // Parse path: supabase://products/123/img.jpg -> 123/img.jpg
       const cleanPath = img.image_path.replace("supabase://products/", "");
       
       // Download
       const { data: fileBlob, error: dlError } = await adminClient.storage.from("products").download(cleanPath);
       if (dlError || !fileBlob) {
           results.push({ path: img.image_path, error: "Download failed" });
           continue;
       }

       const buffer = await fileBlob.arrayBuffer();
       
       // Resize
       try {
           const sizes = [
               { width: 1200, height: 1500, suffix: "lg" },
               { width: 800, height: 1000, suffix: "md" },
               { width: 300, height: 375, suffix: "sm" }
           ];

           for (const size of sizes) {
               const resizedBuffer = await sharp(buffer)
                   .resize(size.width, size.height, { fit: 'cover' })
                   .toBuffer();

               // New path: products/{uid}/thumb-{original_name}-{suffix}.jpg?
               const parts = cleanPath.split("/");
               const filename = parts.pop() || "image.jpg";
               const nameOnly = filename.split(".")[0];
               const ext = filename.split(".").pop();
               
               const thumbName = `thumb-${nameOnly}-${size.suffix}.${ext}`;
               const thumbPath = `${productUid}/${thumbName}`;
               
               await adminClient.storage.from("products").upload(thumbPath, resizedBuffer, {
                   contentType: fileBlob.type,
                   upsert: true
               });
           }
           results.push({ path: img.image_path, status: "Resized" });

       } catch (err: any) {
           results.push({ path: img.image_path, error: `Processing failed: ${err.message}` });
       }
    }

    return NextResponse.json({ ok: true, results });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
