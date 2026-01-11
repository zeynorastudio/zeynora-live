import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { updateImageDisplayOrder } from "@/lib/media";
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

    const body = await req.json();
    const { image_ids } = body as { image_ids: string[] };

    if (!image_ids || !Array.isArray(image_ids)) {
      return NextResponse.json(
        { error: "image_ids array is required" },
        { status: 400 }
      );
    }

    // Update display_order for each image
    for (let i = 0; i < image_ids.length; i++) {
      await updateImageDisplayOrder(image_ids[i], i);
    }

    // Revalidate paths
    revalidatePath("/admin/media");

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("[api/admin/media/reorder] Error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to reorder images",
        details: error.message,
      },
      { status: 500 }
    );
  }
}










