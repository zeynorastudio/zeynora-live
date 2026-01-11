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
      .select("id, order_number, payment_status, shipping_status, user_id")
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
    };

    if (typedOrder.user_id !== typedUserRecord.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate cancellation policy
    if (typedOrder.payment_status !== "pending") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    if (
      typedOrder.shipping_status === "shipped" ||
      typedOrder.shipping_status === "delivered" ||
      typedOrder.shipping_status === "in_transit" ||
      typedOrder.shipping_status === "out_for_delivery"
    ) {
      return NextResponse.json(
        { error: "Order cannot be cancelled as it has already been shipped" },
        { status: 400 }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "refunded",
        shipping_status: "cancelled",
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", orderId);

    if (updateError) {
      console.error("Error cancelling order:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel order" },
        { status: 500 }
      );
    }

    // Write audit log
    await supabase.from("admin_audit_logs").insert({
      action: "order_cancelled",
      target_resource: "order",
      target_id: orderId,
      performed_by: user.id,
      details: {
        order_number: typedOrder.order_number,
        reason: "customer_request",
        cancelled_at: new Date().toISOString(),
      },
    } as unknown as never);

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error: any) {
    console.error("Unexpected error in orders/cancel:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
