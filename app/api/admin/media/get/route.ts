import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Product UID required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("uid, name, main_image_path, super_category, created_at")
      .eq("uid", uid)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch gallery images - ONLY type = 'gallery'
    const { data: images, error: imagesError } = await supabase
      .from("product_images")
      .select("id, image_path, display_order, created_at")
      .eq("product_uid", uid)
      .eq("type", "gallery")
      .order("display_order", { ascending: true });

    if (imagesError) {
      console.warn("[api/admin/media/get] Images query error:", imagesError.message);
    }

    const typedProduct = product as {
      uid: string;
      name: string;
      main_image_path: string | null;
      super_category: string | null;
      created_at: string;
    };

    return NextResponse.json({
      product: {
        uid: typedProduct.uid,
        name: typedProduct.name,
        main_image_path: typedProduct.main_image_path,
      },
      gallery: (images || []) as Array<{
        id: string;
        image_path: string;
        display_order: number;
      }>,
    });
  } catch (error: any) {
    console.error("[api/admin/media/get] Fatal error:", error.message);
    return NextResponse.json(
      {
        error: "Failed to fetch product media",
        details: error.message,
      },
      { status: 500 }
    );
  }
}










