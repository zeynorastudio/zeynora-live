import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");
    const orderNumber = searchParams.get("order_number");

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

    // Use service role client for reads
    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase
      .from("orders")
      .select(
        "id, order_number, payment_status, payment_provider_response, created_at, updated_at"
      )
      .eq("user_id", typedUserRecord.id)
      .eq("payment_provider", "razorpay");

    if (orderId) {
      query = query.eq("id", orderId);
    } else if (orderNumber) {
      query = query.eq("order_number", orderNumber);
    } else {
      // Get most recent order
      query = query.order("created_at", { ascending: false }).limit(1);
    }

    const { data: orders, error: orderError } = await query;

    if (orderError || !orders || orders.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const typedOrder = (orders[0] as {
      id: string;
      order_number: string;
      payment_status: string;
      payment_provider_response: Record<string, any> | null;
      created_at: string;
      updated_at: string;
    });

    const paymentResponse =
      (typedOrder.payment_provider_response as Record<string, any>) || {};
    const pendingExpiresAt = paymentResponse.pending_expires_at
      ? new Date(paymentResponse.pending_expires_at)
      : null;
    const now = new Date();

    // Determine if can retry
    const canRetry =
      typedOrder.payment_status === "pending" ||
      typedOrder.payment_status === "failed";

    // Fetch recent payment logs (last 5)
    const { data: logs } = await supabase
      .from("payment_logs")
      .select("id, status, created_at, provider_response")
      .eq("order_id", typedOrder.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const typedLogs = (logs || []) as Array<{
      id: string;
      status: string;
      created_at: string;
      provider_response: Record<string, any> | null;
    }>;

    return NextResponse.json({
      success: true,
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      payment_status: typedOrder.payment_status,
      can_retry: canRetry,
      pending_expires_at: pendingExpiresAt?.toISOString() || null,
      payment_attempts: paymentResponse.payment_attempts || 0,
      razorpay_order_id: paymentResponse.razorpay_order_id || null,
      razorpay_payment_id: paymentResponse.razorpay_payment_id || null,
      created_at: typedOrder.created_at,
      updated_at: typedOrder.updated_at,
      audit_logs: typedLogs.map((log) => ({
        id: log.id,
        status: log.status,
        created_at: log.created_at,
        details: log.provider_response,
      })),
    });
  } catch (error: any) {
    console.error("Unexpected error in status:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
