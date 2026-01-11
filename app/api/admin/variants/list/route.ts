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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 50;
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const supabase = createServiceRoleClient();

    let query = supabase
      .from("product_variants")
      .select(`
        *,
        products!inner(uid, name),
        colors(name),
        sizes(code)
      `, { count: 'exact' });

    if (search) {
      // Search by SKU, Product Name, Product UID
      query = query.or(`sku.ilike.%${search}%,products.name.ilike.%${search}%,products.uid.ilike.%${search}%`);
    }

    query = query.order("sku", { ascending: true }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        has_next: (offset + limit) < (count || 0)
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
