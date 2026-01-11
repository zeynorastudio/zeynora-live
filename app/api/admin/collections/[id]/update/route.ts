import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { collectionSchema } from "@/lib/admin/validators";
import { updateCollection } from "@/lib/admin/collections/service";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validation = collectionSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const collection = await updateCollection(resolvedParams.id, validation.data);
    return NextResponse.json({ success: true, collection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

