import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { safeCreateAWBIfMissing } from "@/lib/shipping/fulfillment";

export const dynamic = "force-dynamic";

/**
 * Internal API route triggered when order is marked as paid
 * Can be called by payment webhook or post-payment callback
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { order_id } = body;

    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid order_id" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify order exists and is paid
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, payment_status, metadata, shiprocket_shipment_id")
      .eq("id", order_id)
      .single();

    if (orderError || !orderData) {
      console.error("[FULFILLMENT] Order fetch error:", {
        order_id,
        error: orderError?.message || "Order not found",
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const typedOrder = orderData as {
      id: string;
      order_number: string;
      payment_status: string | null;
      metadata: any;
      shiprocket_shipment_id: string | null;
    };

    // Check payment status
    if (typedOrder.payment_status !== "paid") {
      return NextResponse.json(
        {
          error: "Order is not paid",
          payment_status: typedOrder.payment_status,
        },
        { status: 400 }
      );
    }

    // Check if already fulfilled
    const metadata = (typedOrder.metadata as Record<string, any>) || {};
    const shippingMetadata = metadata.shipping || {};
    const existingAWB = shippingMetadata.awb || null;

    if (existingAWB && typedOrder.shiprocket_shipment_id) {
      return NextResponse.json({
        success: true,
        message: "Order already fulfilled",
        awb: existingAWB,
        shipment_id: typedOrder.shiprocket_shipment_id,
      });
    }

    // Attempt fulfillment
    const result = await safeCreateAWBIfMissing(order_id);

    if (!result.success) {
      // Mark order as fulfillment_failed
      await supabase.from("orders").update({
        shipping_status: "fulfillment_failed",
        metadata: {
          ...metadata,
          fulfillment_error: result.error,
          fulfillment_attempted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      } as unknown as never).eq("id", order_id);

      // Log fulfillment failure with full context
      console.error("[FULFILLMENT] Fulfillment failed:", {
        order_id,
        order_number: typedOrder.order_number,
        error: result.error,
      });

      // Write audit log
      try {
        await supabase.from("admin_audit_logs").insert({
          action: "fulfillment_failed",
          target_resource: "orders",
          target_id: order_id,
          details: {
            error: result.error,
            order_number: typedOrder.order_number,
          },
        } as unknown as never);
      } catch (auditError) {
        // Don't mask the actual fulfillment error with audit error
        const auditErrorMessage = auditError instanceof Error ? auditError.message : "Unknown error";
        console.error("[FULFILLMENT] Audit log write failed (non-fatal):", {
          order_id,
          audit_error: auditErrorMessage,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || "Fulfillment failed",
          retry_suggested: true,
        },
        { status: 500 }
      );
    }

    // Fetch updated order to return shipping details
    const { data: updatedOrder } = await supabase
      .from("orders")
      .select("metadata, shipping_status, shiprocket_shipment_id")
      .eq("id", order_id)
      .single();

    const typedUpdatedOrder = updatedOrder as {
      metadata: any;
      shipping_status: string | null;
      shiprocket_shipment_id: string | null;
    } | null;

    const updatedMetadata = (typedUpdatedOrder?.metadata as Record<string, any>) || {};
    const updatedShipping = updatedMetadata.shipping || {};

    return NextResponse.json({
      success: true,
      shipping: {
        status: typedUpdatedOrder?.shipping_status,
        awb: updatedShipping.awb || null,
        courier: updatedShipping.courier || null,
        tracking_url: updatedShipping.tracking_url || null,
        expected_delivery: updatedShipping.expected_delivery || null,
        shipment_id: typedUpdatedOrder?.shiprocket_shipment_id || null,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[FULFILLMENT] Unexpected error:", {
      route: "/api/fulfillment/on-payment",
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
