import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/utils/images";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";
    const sort = searchParams.get("sort") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const supabase = createServiceRoleClient();

    // Query ONLY the products table - ONE card per product
    let productQuery = supabase
      .from("products")
      .select("uid, name, main_image_path, created_at")
      .order("created_at", { ascending: sort === "asc" });

    if (search) {
      productQuery = productQuery.or(`uid.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: products, error: prodError } = await productQuery;

    if (prodError) {
      console.warn("[api/admin/media/list] Product query error:", prodError.message);
      return NextResponse.json({
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          has_next: false,
        },
      });
    }

    const typedProducts = (products || []) as Array<{
      uid: string;
      name: string;
      main_image_path: string | null;
      created_at: string;
    }>;

    // Transform to MediaItem format - ONE card per product
    const mediaItems = typedProducts.map((p) => ({
      id: p.uid, // Use product UID as ID
      product_uid: p.uid,
      product_name: p.name,
      image_path: p.main_image_path,
      image_type: p.main_image_path ? "main" : "none",
      is_main: !!p.main_image_path,
      created_at: p.created_at,
      public_url: p.main_image_path ? getPublicUrl("products", p.main_image_path) : null,
      has_image: !!p.main_image_path,
    }));

    // Pagination
    const total = mediaItems.length;
    const paginated = mediaItems.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      meta: {
        total,
        page,
        limit,
        has_next: offset + limit < total,
      },
    });

  } catch (error: any) {
    console.error("[api/admin/media/list] Fatal error:", error.message);
    return NextResponse.json({ 
      error: "Failed to fetch media library",
      details: error.message 
    }, { status: 500 });
  }
}
