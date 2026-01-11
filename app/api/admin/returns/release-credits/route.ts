import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { addCredits } from "@/lib/wallet";
import { requireSuperAdmin } from "@/lib/admin/roles";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/returns/release-credits
 * Super Admin only - Release store credits for a return after warehouse verification
 * 
 * Body: { return_id: string, order_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin session
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require Super Admin
    await requireSuperAdmin(user.id);

    // Parse request body
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: "order_id is required" },
        { status: 400 }
      );
    }

    // Get admin user record
    const { data: adminRecord } = await authSupabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedAdminRecord = adminRecord as { id: string } | null;

    if (!typedAdminRecord) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    const supabase = createServiceRoleClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, order_number, subtotal, shipping_fee, total_amount, shipping_status, payment_status, metadata")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const typedOrder = order as {
      id: string;
      user_id: string;
      order_number: string;
      subtotal: number | null;
      shipping_fee: number | null;
      total_amount: number | null;
      shipping_status: string;
      payment_status: string;
      metadata: any;
    };

    // Validate: order must be returned
    if (typedOrder.shipping_status !== "returned") {
      return NextResponse.json(
        { error: "Order is not in returned status" },
        { status: 400 }
      );
    }

    // Validate: order must have been paid
    if (typedOrder.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Only paid orders can have credits released" },
        { status: 400 }
      );
    }

    if (!typedOrder.user_id) {
      return NextResponse.json(
        { error: "Order has no associated user" },
        { status: 400 }
      );
    }

    // Calculate refund amount: product_price - shipping_fee
    // For simplicity, we use subtotal as product price
    const refundAmount = Math.max(0, (typedOrder.subtotal || 0) - (typedOrder.shipping_fee || 0));

    if (refundAmount <= 0) {
      return NextResponse.json(
        { error: "Refund amount is zero or negative" },
        { status: 400 }
      );
    }

    // Check if credits already released
    const { data: existingTx } = await supabase
      .from("store_credit_transactions")
      .select("id")
      .eq("user_id", typedOrder.user_id)
      .eq("type", "credit")
      .eq("reference", order_id)
      .single();

    if (existingTx) {
      return NextResponse.json(
        { error: "Credits already released for this return" },
        { status: 400 }
      );
    }

    // Add credits
    const result = await addCredits(
      typedOrder.user_id,
      refundAmount,
      order_id,
      `Return refund for order ${typedOrder.order_number}`,
      typedAdminRecord.id
    );

    // Update order metadata to mark credits released
    const metadata = typedOrder.metadata || {};
    metadata.credits_released = true;
    metadata.credits_released_at = new Date().toISOString();
    metadata.credits_released_amount = refundAmount;

    await supabase
      .from("orders")
      .update({
        metadata: metadata,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedOrder.id);

    return NextResponse.json({
      success: true,
      message: `Successfully released ₹${refundAmount.toLocaleString()} in store credits`,
      refund_amount: refundAmount,
      new_balance: result.new_balance,
    });
  } catch (error: any) {
    console.error("Error releasing credits:", error);
    return NextResponse.json(
      {
        error: "Failed to release credits",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
