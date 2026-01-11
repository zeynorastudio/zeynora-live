import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { tile_image_path, banner_image_path } = await req.json();
    const supabase = createServiceRoleClient();

    const updates: any = {};
    if (tile_image_path !== undefined) updates.tile_image_path = tile_image_path;
    if (banner_image_path !== undefined) updates.banner_image_path = banner_image_path;

    const { data, error } = await supabase
      .from("categories")
      .update(updates as unknown as never)
      .eq("id", resolvedParams.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, category: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
