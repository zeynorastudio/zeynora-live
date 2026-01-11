import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (session.role !== "super_admin") {
      return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body; // Array of { sku, stock?, price?, active? }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const results: Array<{ sku: string; success: boolean; error?: string }> = [];

    // Process updates atomically
    for (const update of updates) {
      const { sku, stock, price, active } = update;
      
      if (!sku) {
        results.push({ sku: sku || "unknown", success: false, error: "Missing SKU" });
        continue;
      }

      const updateData: any = {};
      if (stock !== undefined) updateData.stock = stock;
      if (price !== undefined) updateData.price = price;
      if (active !== undefined) updateData.active = active;

      if (Object.keys(updateData).length === 0) {
        results.push({ sku, success: false, error: "No fields to update" });
        continue;
      }

      const { error } = await supabase
        .from("product_variants")
        .update(updateData as unknown as never)
        .eq("sku", sku);

      if (error) {
        results.push({ sku, success: false, error: error.message });
      } else {
        results.push({ sku, success: true });
      }
    }

    // Create audit log
    await createAudit(session.user?.id || null, "bulk_variant_update", {
      count: updates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

















