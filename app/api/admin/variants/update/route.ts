import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { variantUpdateSchema } from "@/lib/admin/validation/variant-update";
import { createAudit } from "@/lib/audit/log";

export async function PUT(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validation = variantUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const { sku, stock, price, active } = validation.data;
    const isSuperAdmin = session.role === "super_admin";

    const updates: Record<string, unknown> = { stock };

    if (isSuperAdmin) {
      if (price !== undefined) updates.price = price;
      if (active !== undefined) updates.active = active;
    } else {
      // Admin checks
      if (price !== undefined || active !== undefined) {
        return NextResponse.json({ error: "Admins can only update stock." }, { status: 403 });
      }
    }

    const supabase = createServiceRoleClient();
    
    // Get current values for audit log
    const { data: currentVariant } = await supabase
      .from("product_variants")
      .select("id, stock, price, active, product_uid")
      .eq("sku", sku)
      .single();

    const typedCurrent = currentVariant as {
      id: string;
      stock: number | null;
      price: number | null;
      active: boolean;
      product_uid: string;
    } | null;

    const { error } = await supabase
      .from("product_variants")
      .update(updates)
      .eq("sku", sku);

    if (error) throw error;

    // Audit log the update
    await createAudit(session.user.id, "update_variant", {
      variant_id: typedCurrent?.id,
      sku,
      product_uid: typedCurrent?.product_uid,
      previous_values: {
        stock: typedCurrent?.stock,
        price: typedCurrent?.price,
        active: typedCurrent?.active,
      },
      new_values: updates,
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[VARIANT_UPDATE] Error:", { error: errorMessage });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
