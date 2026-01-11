import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    
    // Fetch top 200 products ordered by sort_order
    const { data, error } = await supabase
      .from("products")
      .select("uid, name, main_image_path, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

