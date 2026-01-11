import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { deleteCategory } from "@/lib/admin/categories/service";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteCategory(resolvedParams.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

