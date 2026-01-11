import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { updateOrderIndices } from "@/lib/admin/reorder";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = await req.json();
    const { tableName, items } = body;

    if (!tableName || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Validate table name to prevent arbitrary updates
    const allowedTables = [
      "homepage_hero", 
      "homepage_categories", 
      "homepage_sections", 
      "homepage_banners"
    ];
    
    if (!allowedTables.includes(tableName)) {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 });
    }

    await updateOrderIndices(tableName, items, session.user.id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Reorder failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}




















