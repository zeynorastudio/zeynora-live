import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { extractStoragePath } from "@/lib/media";
import { createAudit } from "@/lib/audit/log";
import { revalidatePath } from "next/cache";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { image_id, image_ids } = body;

    // Support both single image_id and bulk image_ids array
    const idsToDelete: string[] = image_ids 
      ? (Array.isArray(image_ids) ? image_ids : [image_ids])
      : (image_id ? [image_id] : []);

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "image_id or image_ids is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const deletedIds: string[] = [];
    const failedIds: string[] = [];
    const affectedProducts = new Set<string>();

    // Process each image
    for (const id of idsToDelete) {
      try {
        // Get image record to find storage path and product_uid
        const { data: img, error: fetchError } = await supabase
          .from("product_images")
          .select("image_path, product_uid")
          .eq("id", id)
          .single();

        if (fetchError || !img) {
          failedIds.push(id);
          continue;
        }

        const typedImg = img as { image_path: string; product_uid: string | null };

        // Extract storage path using utility function
        const storagePath = extractStoragePath(typedImg.image_path, "products");

        // Delete from storage (best effort)
        try {
          await supabase.storage.from("products").remove([storagePath]);
        } catch (storageError) {
          console.warn("[MEDIA_DELETE] Storage delete warning:", {
            image_id: id,
            error: storageError instanceof Error ? storageError.message : "Unknown error",
          });
          // Continue with DB deletion even if storage deletion fails
        }

        // Delete DB record
        const { error: delError } = await supabase
          .from("product_images")
          .delete()
          .eq("id", id);

        if (delError) {
          failedIds.push(id);
          continue;
        }

        deletedIds.push(id);
        if (typedImg.product_uid) {
          affectedProducts.add(typedImg.product_uid);
        }
      } catch (itemError) {
        failedIds.push(id);
        console.error("[MEDIA_DELETE] Error deleting image:", {
          image_id: id,
          error: itemError instanceof Error ? itemError.message : "Unknown error",
        });
      }
    }

    // Audit log
    await createAudit(session.user.id, "delete_product_images", {
      deleted_count: deletedIds.length,
      failed_count: failedIds.length,
      deleted_ids: deletedIds,
      failed_ids: failedIds.length > 0 ? failedIds : undefined,
    });

    // Revalidate paths
    revalidatePath("/admin/media");
    for (const productUid of affectedProducts) {
      revalidatePath(`/admin/products/${productUid}`);
    }

    return NextResponse.json({ 
      success: true,
      deleted: deletedIds.length,
      failed: failedIds.length,
      deleted_ids: deletedIds,
      failed_ids: failedIds.length > 0 ? failedIds : undefined,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[MEDIA_DELETE] Error:", { error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
