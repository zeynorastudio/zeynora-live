/**
 * Phase 4.3 — Return Request API
 * POST /api/returns/request
 * 
 * Creates a return request (requires OTP verification first)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendOtp, normalizePhone } from "@/lib/otp/service";
import { checkReturnEligibility, verifyMobileMatchesOrder } from "@/lib/returns/validation";
import { createAudit } from "@/lib/audit/log";
import type { CreateReturnRequestInput } from "@/types/returns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateReturnRequestInput;
    const { order_id, mobile, items, reason } = body;

    // Validation
    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!mobile || typeof mobile !== "string") {
      return NextResponse.json(
        { success: false, error: "Mobile number is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required" },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Return reason is required" },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.order_item_id || typeof item.order_item_id !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid order item ID" },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return NextResponse.json(
          { success: false, error: "Invalid quantity" },
          { status: 400 }
        );
      }
    }

    const supabase = createServiceRoleClient();
    const normalizedMobile = normalizePhone(mobile);

    // Verify mobile matches order
    const mobileCheck = await verifyMobileMatchesOrder(order_id, normalizedMobile);
    if (!mobileCheck.valid) {
      return NextResponse.json(
        { success: false, error: mobileCheck.reason || "Mobile verification failed" },
        { status: 400 }
      );
    }

    // Check return eligibility
    const orderItemIds = items.map((item) => item.order_item_id);
    const eligibility = await checkReturnEligibility(order_id, orderItemIds);
    if (!eligibility.allowed) {
      return NextResponse.json(
        { success: false, error: eligibility.reason || "Return not eligible" },
        { status: 400 }
      );
    }

    // Verify order items exist and belong to order
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("id, order_id, quantity")
      .eq("order_id", order_id)
      .in("id", orderItemIds);

    if (itemsError || !orderItems || orderItems.length !== items.length) {
      return NextResponse.json(
        { success: false, error: "Invalid order items" },
        { status: 400 }
      );
    }

    // Validate quantities don't exceed ordered quantities
    for (const item of items) {
      const orderItem = orderItems.find((oi: any) => oi.id === item.order_item_id);
      if (!orderItem) {
        return NextResponse.json(
          { success: false, error: `Order item ${item.order_item_id} not found` },
          { status: 400 }
        );
      }
      if (item.quantity > (orderItem as any).quantity) {
        return NextResponse.json(
          { success: false, error: `Return quantity exceeds ordered quantity for item ${item.order_item_id}` },
          { status: 400 }
        );
      }
    }

    // Get order to determine customer_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const typedOrder = order as {
      id: string;
      customer_id: string | null;
    };

    // Send OTP for verification
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const otpResult = await sendOtp({
      mobile: normalizedMobile,
      purpose: "ORDER_TRACKING", // Reuse ORDER_TRACKING purpose for return OTP
      entity_id: order_id,
      ip_address: ipAddress,
    });

    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.error || "Failed to send OTP" },
        { status: 400 }
      );
    }

    // Create return request (status: requested, pending OTP verification)
    // Note: We'll create it now, but mark it as requiring OTP verification
    // The verify-otp endpoint will activate it

    const { data: returnRequest, error: createError } = await supabase
      .from("return_requests")
      .insert({
        order_id: order_id,
        customer_id: typedOrder.customer_id,
        guest_mobile: typedOrder.customer_id ? null : normalizedMobile,
        status: "requested",
        reason: reason.trim(),
        requested_at: new Date().toISOString(),
      } as unknown as never)
      .select()
      .single();

    if (createError || !returnRequest) {
      console.error("[RETURNS] Failed to create return request:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create return request" },
        { status: 500 }
      );
    }

    // Create return items
    const returnItems = items.map((item) => ({
      return_request_id: returnRequest.id,
      order_item_id: item.order_item_id,
      quantity: item.quantity,
    }));

    const { error: itemsInsertError } = await supabase
      .from("return_items")
      .insert(returnItems as unknown as never[]);

    if (itemsInsertError) {
      console.error("[RETURNS] Failed to create return items:", itemsInsertError);
      // Rollback return request
      await supabase.from("return_requests").delete().eq("id", returnRequest.id);
      return NextResponse.json(
        { success: false, error: "Failed to create return items" },
        { status: 500 }
      );
    }

    // Audit log
    await createAudit(null, "return_requested", {
      return_request_id: returnRequest.id,
      order_id: order_id,
      customer_id: typedOrder.customer_id,
      guest_mobile: normalizedMobile,
      items_count: items.length,
    });

    return NextResponse.json({
      success: true,
      return_request_id: returnRequest.id,
      message: "OTP sent. Please verify to complete return request.",
    });
  } catch (error: unknown) {
    console.error("[RETURNS] Request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}









