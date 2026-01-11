import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const product_uid = formData.get("product_uid") as string;
    const image_id = formData.get("image_id") as string; // "main-..." or ID
    const file = formData.get("file") as File;
    const image_type = formData.get("image_type") as string; // Optional override

    if (!product_uid || !image_id || !file) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const isMain = String(image_id).startsWith("main-");

    // 1. Determine new path
    const ext = file.name.split(".").pop() || "jpg";
    const typeFolder = isMain ? "main" : (image_type || "detail"); // fallback type
    // Use simple timestamp name to avoid collision during swap
    const newName = `${product_uid}-${typeFolder}-${Date.now()}.${ext}`;
    const newPath = `products/${product_uid}/${typeFolder}/${newName}`;

    // 2. Upload new file
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(newPath, buffer, { contentType: file.type });
    
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 3. Update DB & Get old path
    let oldPath = "";

    if (isMain) {
       // Get old path
       const { data: prod } = await supabase
         .from("products")
         .select("main_image_path")
         .eq("uid", product_uid)
         .single();
       
       const typedProd = prod as { main_image_path: string | null } | null;
       oldPath = typedProd?.main_image_path || "";

       // Update
       const { error: dbError } = await supabase
         .from("products")
         .update({ main_image_path: newPath } as unknown as never)
         .eq("uid", product_uid);
       
       if (dbError) throw new Error("DB update failed");

    } else {
       // Additional Image
       const { data: img } = await supabase
         .from("product_images")
         .select("image_path")
         .eq("id", image_id)
         .single();
       
       const typedImg = img as { image_path: string } | null;
       oldPath = typedImg?.image_path || "";

       // Update
       const { error: dbError } = await supabase
         .from("product_images")
         .update({ 
            image_path: newPath,
            // update image_type if provided? maybe. 
            // prompt says "If type=main: update main_image_path", else update row.
         } as unknown as never)
         .eq("id", image_id);

       if (dbError) throw new Error("DB update failed");
    }

    // 4. Cleanup old file
    if (oldPath && oldPath !== newPath) {
      await supabase.storage.from("products").remove([oldPath]);
    }

    return NextResponse.json({ success: true, path: newPath });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
