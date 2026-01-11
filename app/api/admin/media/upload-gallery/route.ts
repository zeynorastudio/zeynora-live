import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { uploadProductImage, saveProductImage } from "@/lib/media";
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
    const files = formData.getAll("files") as File[];
    const productUid = formData.get("product_uid") as string | null;

    if (!files || files.length === 0 || !productUid) {
      return NextResponse.json(
        { error: "Files and product_uid are required" },
        { status: 400 }
      );
    }

    const imageIds: string[] = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Generate filename: gallery/{uid}-{timestamp}-{index}.{ext}
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      // Use baseTimestamp + index to ensure uniqueness while keeping order
      const filename = `gallery/${productUid}-${baseTimestamp}-${i}.${extension}`;

      // Upload to storage: products/{uid}/gallery/{uid}-{timestamp}-{index}.{ext}
      // Note: generateProductImagePath handles the products/{uid}/ prefix
      const imagePath = await uploadProductImage(productUid, file, filename);

      // Save to product_images table
      const imageId = await saveProductImage(productUid, imagePath, {
        variantSku: null, // Single-color products don't use variant_sku
        displayOrder: undefined, // Will auto-increment
        type: "gallery", // Set type to "gallery" as required
      });

      imageIds.push(imageId);
    }

    // Revalidate paths
    revalidatePath("/admin/media");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productUid}`);

    return NextResponse.json({
      success: true,
      image_ids: imageIds,
      count: imageIds.length,
    });
  } catch (error: any) {
    console.error("[api/admin/media/upload-gallery] Error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to upload gallery images",
        details: error.message,
      },
      { status: 500 }
    );
  }
}










