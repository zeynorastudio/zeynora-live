import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { variantStockSchema } from "@/lib/products/schemas";
import { updateVariantStock } from "@/lib/products/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ uid: string; sku: string }> }) {
  try {
    const resolvedParams = await params;
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    // Admin + Super Admin allowed

    const body = await req.json();
    const validation = variantStockSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    await updateVariantStock(resolvedParams.sku, validation.data.stock, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[STOCK_UPDATE] Error updating variant stock:", {
      route: "/api/admin/products/[uid]/variants/[sku]/stock",
      error: errorMessage,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
