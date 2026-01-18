/**
 * FINAL — On Payment Fulfillment Endpoint
 * 
 * Internal API route triggered when order is marked as paid.
 * Can be called by payment webhook or post-payment callback.
 * 
 * This is a convenience endpoint - the main flow happens in the webhook.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";

export const dynamic = "force-dynamic";

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
      .select("id, order_number, payment_status, order_status, metadata, shiprocket_shipment_id, shipment_status")
      .eq("id", order_id)
      .single();

    if (orderError || !orderData) {
      console.error("[FULFILLMENT] Order fetch error:", {
        order_id,
        error: orderError?.message || "Order not found",
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderData as {
      id: string;
      order_number: string;
      payment_status: string | null;
      order_status: string | null;
      metadata: Record<string, unknown> | null;
      shiprocket_shipment_id: string | null;
      shipment_status: string | null;
    };

    // Check payment status
    if (order.payment_status !== "paid") {
      return NextResponse.json(
        {
          error: "Order is not paid",
          payment_status: order.payment_status,
        },
        { status: 400 }
      );
    }

    // Check if already fulfilled (BOOKED)
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const shippingMetadata = (metadata.shipping as Record<string, unknown>) || {};
    const existingAWB = (shippingMetadata.awb as string) || null;

    if (existingAWB && order.shiprocket_shipment_id && order.shipment_status === "BOOKED") {
      return NextResponse.json({
        success: true,
        message: "Order already fulfilled",
        awb: existingAWB,
        shipment_id: order.shiprocket_shipment_id,
      });
    }

    // Check Shiprocket is enabled
    if (process.env.SHIPROCKET_ENABLED !== "true") {
      return NextResponse.json({
        success: false,
        error: "Shiprocket is disabled",
        message: "Set SHIPROCKET_ENABLED=true to enable automatic shipment creation",
      });
    }

    // Attempt fulfillment using the main shipment creation function
    const result = await createShipmentForPaidOrder(order_id);

    if (!result.success) {
      console.error("[FULFILLMENT] Shipment creation failed:", {
        order_id,
        order_number: order.order_number,
        error: result.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error || "Fulfillment failed",
          retry_suggested: true,
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      shipping: {
        status: "BOOKED",
        awb: result.awb_code || null,
        courier: result.courier_name || null,
        shipment_id: result.shipment_id || null,
        internal_shipping_cost: result.internal_shipping_cost || null,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[FULFILLMENT] Unexpected error:", {
      route: "/api/fulfillment/on-payment",
      error: errorMessage,
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
