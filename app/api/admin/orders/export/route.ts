import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const supabase = createServiceRoleClient();
    const { data: orders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });

    if (!orders) return NextResponse.json({ error: "No data" });

    // Generate CSV string
    const headers = ["Order Number", "Date", "Customer Name", "Total", "Status", "Shipping Status"];
    const rows = orders.map((o: any) => [
      o.order_number,
      new Date(o.created_at).toISOString(),
      `"${o.customer.name}"`,
      o.total,
      o.payment_status,
      o.shipping_status
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any[]) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=orders_export.csv"
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

