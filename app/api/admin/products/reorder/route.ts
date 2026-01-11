import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { productReorderSchema } from "@/lib/admin/validation/product-reorder";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validation = productReorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const updates = validation.data;
    const supabase = createServiceRoleClient();

    // Batch update
    // Upsert works if we provide PK. Product PK is ID or UID? 
    // We need to check schema. Assuming 'uid' is unique but not PK, or ID is PK.
    // Reorder schema uses 'product_uid'.
    // We can upsert based on 'uid' if we include it.
    // But standard update is safer if we iterate.
    // Supabase upsert is efficient.
    
    // Construct payload for upsert
    // WARNING: upsert requires all required fields unless we use update.
    // We only want to update sort_order.
    // Supabase-js doesn't support bulk update of partial fields easily without upsert.
    // Iterating is safest for partial update. With 50-100 items it's fine.
    // Or we use a custom RPC if we had one.
    // Let's iterate for safety and simplicity.
    
    for (const item of updates) {
      await supabase
        .from("products")
        .update({ sort_order: item.sort_order } as unknown as never)
        .eq("uid", item.product_uid);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
