import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { uploadProductImage, setProductMainImage } from "@/lib/media";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const productUid = formData.get("product_uid") as string | null;

    if (!file || !productUid) {
      return NextResponse.json(
        { error: "File and product_uid are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check if product has existing main image and delete it
    const { data: existingProduct } = await supabase
      .from("products")
      .select("main_image_path")
      .eq("uid", productUid)
      .single();

    if (existingProduct) {
      const typedProduct = existingProduct as { main_image_path: string | null };
      if (typedProduct.main_image_path) {
        // Extract storage path (remove supabase://products/ prefix if present)
        let oldStoragePath = typedProduct.main_image_path;
        if (oldStoragePath.startsWith("supabase://products/")) {
          oldStoragePath = oldStoragePath.replace("supabase://products/", "");
        }
        
        // Delete old main image from storage (best effort - continue even if fails)
        try {
          await supabase.storage.from("products").remove([oldStoragePath]);
        } catch (storageError) {
          console.warn("[api/admin/media/upload-main] Failed to delete old main image:", storageError);
          // Continue with upload even if deletion fails
        }
      }
    }

    // Generate filename: main.{ext} (or main.jpg if no extension)
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `main.${extension}`;

    // Upload to storage: products/{product_uid}/main.{ext}
    // Note: uploadProductImage handles path generation, but we pass the full filename
    const imagePath = await uploadProductImage(productUid, file, filename);

    // Update products.main_image_path
    await setProductMainImage(productUid, imagePath, session.user.id);

    // Revalidate paths
    revalidatePath("/admin/media");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productUid}`);

    return NextResponse.json({
      success: true,
      image_path: imagePath,
    });
  } catch (error: any) {
    console.error("[api/admin/media/upload-main] Error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to upload main image",
        details: error.message,
      },
      { status: 500 }
    );
  }
}










