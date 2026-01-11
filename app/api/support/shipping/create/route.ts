import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_number, name, email, phone, message } = body;

    // Validate (simple)
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    // Link order if exists
    let order_id = null;
    if (order_number) {
      const { data } = await supabase.from("orders").select("id").eq("order_number", order_number).single();
      const typedData = data as { id: string } | null;
      if (typedData) order_id = typedData.id;
    }

    const { error } = await supabase.from("shipping_queries").insert({
      order_id,
      order_number,
      customer_name: name,
      email,
      phone,
      message,
      status: "open"
    } as unknown as never);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
