import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    // Use service role client for DB operations
    const supabase = createServiceRoleClient();

    // Find most recent pending order for user
    const { data: orders, error: findError } = await supabase
      .from("orders")
      .select(
        "id, order_number, payment_status, total_amount, currency, payment_provider_response, created_at"
      )
      .eq("user_id", typedUserRecord.id)
      .eq("payment_provider", "razorpay")
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (findError) {
      console.error("Error finding pending order:", findError);
      return NextResponse.json(
        { error: "Failed to find order", details: findError.message },
        { status: 500 }
      );
    }

    // No pending order found
    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        has_pending_order: false,
        message: "No pending order found - call create-order to start",
      });
    }

    const typedOrder = (orders[0] as {
      id: string;
      order_number: string;
      payment_status: string;
      total_amount: number | null;
      currency: string | null;
      payment_provider_response: Record<string, any> | null;
      created_at: string;
    });

    const paymentResponse =
      (typedOrder.payment_provider_response as Record<string, any>) || {};
    const razorpayOrderId = paymentResponse.razorpay_order_id;
    const pendingExpiresAt = paymentResponse.pending_expires_at
      ? new Date(paymentResponse.pending_expires_at)
      : null;
    const now = new Date();

    // Check if pending order is still valid
    if (pendingExpiresAt && pendingExpiresAt > now && razorpayOrderId) {
      // Order is still valid - reuse existing Razorpay order
      await supabase.from("payment_logs").insert({
        order_id: typedOrder.id,
        provider: "razorpay",
        provider_response: {
          event: "retry_reuse",
          razorpay_order_id: razorpayOrderId,
          note: "reusing_existing_razorpay_order",
        },
        status: "pending",
      } as unknown as never);

      return NextResponse.json({
        success: true,
        has_pending_order: true,
        reuse_order: true,
        regenerated: false,
        order_id: typedOrder.id,
        order_number: typedOrder.order_number,
        razorpay_order_id: razorpayOrderId,
        amount: Math.round((typedOrder.total_amount || 0) * 100), // Convert to paise
        currency: typedOrder.currency || "INR",
        pending_expires_at: pendingExpiresAt.toISOString(),
      });
    }

    // Order expired or missing razorpay_order_id - regenerate
    const ttlMinutes = parseInt(
      process.env.PAYMENT_PENDING_TTL_MINUTES || "30",
      10
    );
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + ttlMinutes);

    const paymentAttempts = (paymentResponse.payment_attempts || 0) + 1;

    // Create new Razorpay order (do NOT create new DB order)
    let newRazorpayOrder;
    try {
      newRazorpayOrder = await createRazorpayOrder(
        Math.round((typedOrder.total_amount || 0) * 100), // Convert to paise
        typedOrder.currency || "INR",
        typedOrder.order_number,
        {
          order_id: typedOrder.id,
          order_number: typedOrder.order_number,
          payment_attempt: paymentAttempts.toString(),
        }
      );
    } catch (razorpayError: any) {
      console.error("Failed to regenerate Razorpay order:", razorpayError);
      return NextResponse.json(
        {
          error: "Failed to regenerate payment order",
          details: razorpayError.message,
        },
        { status: 500 }
      );
    }

    // Update existing order with new Razorpay order ID
    const updatedResponse = { ...paymentResponse };
    updatedResponse.razorpay_order_id = newRazorpayOrder.id;
    updatedResponse.pending_expires_at = newExpiresAt.toISOString();
    updatedResponse.payment_attempts = paymentAttempts;
    updatedResponse.regenerated_at = new Date().toISOString();
    updatedResponse.previous_razorpay_order_id = razorpayOrderId || null;

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_provider_response: updatedResponse,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedOrder.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order", details: updateError.message },
        { status: 500 }
      );
    }

    // Write audit log
    await supabase.from("payment_logs").insert({
      order_id: typedOrder.id,
      provider: "razorpay",
      provider_response: {
        event: "razorpay_order_regenerated",
        previous_razorpay_order_id: razorpayOrderId,
        new_razorpay_order_id: newRazorpayOrder.id,
        payment_attempts: paymentAttempts,
        note: "razorpay_order_regenerated_due_to_expiration",
      },
      status: "pending",
    } as unknown as never);

    return NextResponse.json({
      success: true,
      has_pending_order: true,
      reuse_order: false,
      regenerated: true,
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      razorpay_order_id: newRazorpayOrder.id,
      amount: Math.round((typedOrder.total_amount || 0) * 100),
      currency: typedOrder.currency || "INR",
      pending_expires_at: newExpiresAt.toISOString(),
      payment_attempts: paymentAttempts,
    });
  } catch (error: any) {
    console.error("Unexpected error in retry:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
