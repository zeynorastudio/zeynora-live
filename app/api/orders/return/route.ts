import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify session
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user record
    const { data: userRecord } = await authSupabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;

    if (!typedUserRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Use service role client for writes
    const supabase = createServiceRoleClient();

    // Fetch order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, payment_status, shipping_status, user_id, created_at")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const typedOrder = order as {
      id: string;
      order_number: string;
      payment_status: string;
      shipping_status: string;
      user_id: string | null;
      created_at: string;
    };

    if (typedOrder.user_id !== typedUserRecord.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate return eligibility
    if (
      typedOrder.payment_status !== "paid" &&
      typedOrder.shipping_status !== "delivered"
    ) {
      return NextResponse.json(
        { error: "Only paid or delivered orders are eligible for return" },
        { status: 400 }
      );
    }

    if (
      typedOrder.shipping_status === "cancelled" ||
      typedOrder.shipping_status === "returned"
    ) {
      return NextResponse.json(
        { error: "Order is not eligible for return" },
        { status: 400 }
      );
    }

    // Check return window (30 days from order creation)
    const orderDate = new Date(typedOrder.created_at);
    const daysSinceOrder = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceOrder > 30) {
      return NextResponse.json(
        { error: "Return window has expired (30 days)" },
        { status: 400 }
      );
    }

    // Create return request (update shipping_status to 'returned' and create audit log)
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_status: "returned",
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", orderId);

    if (updateError) {
      console.error("Error creating return request:", updateError);
      return NextResponse.json(
        { error: "Failed to create return request" },
        { status: 500 }
      );
    }

    // Write audit log
    await supabase.from("admin_audit_logs").insert({
      action: "return_requested",
      target_resource: "order",
      target_id: orderId,
      performed_by: user.id,
      details: {
        order_number: typedOrder.order_number,
        requested_at: new Date().toISOString(),
        days_since_order: daysSinceOrder,
      },
    } as unknown as never);

    return NextResponse.json({
      success: true,
      message: "Return request created successfully",
    });
  } catch (error: any) {
    console.error("Unexpected error in orders/return:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
