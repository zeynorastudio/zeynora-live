import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { detectImageMetadata } from "@/lib/admin/media/parser";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { fileNames } = body;

    if (!Array.isArray(fileNames)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const results = fileNames.map((name) => detectImageMetadata(name));

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

