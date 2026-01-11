import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/shipping/shiprocket-client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Shiprocket Webhook Handler
 * Processes shipping status updates, AWB generation, and tracking events
 */
export async function POST(req: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-shiprocket-signature");

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Extract identifiers
    const shipmentId = payload.shipment_id || payload.shipmentId;
    const awb = payload.awb_code || payload.awb || payload.awbCode;
    const eventType = payload.status || payload.event_type || payload.eventType;
    const currentStatus = payload.current_status || payload.currentStatus;

    if (!shipmentId && !awb) {
      return NextResponse.json(
        { message: "Ignored - no shipment_id or awb" },
        { status: 200 }
      );
    }

    // Find order by shipment_id or awb
    let orderQuery = supabase
      .from("orders")
      .select("id, order_number, shipping_status, metadata")
      .eq("shiprocket_shipment_id", String(shipmentId || ""));

    if (!shipmentId && awb) {
      // Search in metadata
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, shipping_status, metadata")
        .limit(100);

      const typedOrders = (orders || []) as Array<{
        id: string;
        order_number: string;
        shipping_status: string | null;
        metadata: any;
      }>;

      const order = typedOrders.find((o) => {
        const meta = (o.metadata as Record<string, any>) || {};
        const shipping = meta.shipping || {};
        return shipping.awb === awb;
      });

      if (!order) {
        return NextResponse.json(
          { message: "Order not found for AWB" },
          { status: 404 }
        );
      }

      // Process webhook for this order
      await processWebhookEvent(order.id, payload, eventType, currentStatus, supabase);
      return NextResponse.json({ success: true });
    }

    const { data: orderData, error: orderError } = await orderQuery.single();

    if (orderError || !orderData) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    const typedOrderData = orderData as {
      id: string;
      order_number: string;
      shipping_status: string | null;
      metadata: any;
    };

    // Check idempotency
    const idempotencyKey = buildIdempotencyKey(payload, eventType);
    const existingEvent = await checkIdempotency(typedOrderData.id, idempotencyKey, supabase);

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        message: "Event already processed",
      });
    }

    // Process webhook event
    await processWebhookEvent(
      typedOrderData.id,
      payload,
      eventType,
      currentStatus,
      supabase
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Build idempotency key from payload
 */
function buildIdempotencyKey(payload: any, eventType: string): string {
  const shipmentId = payload.shipment_id || payload.shipmentId || "";
  const timestamp = payload.timestamp || payload.created_at || Date.now();
  return `shiprocket_${shipmentId}_${eventType}_${timestamp}`;
}

/**
 * Check if event was already processed
 */
async function checkIdempotency(
  orderId: string,
  idempotencyKey: string,
  supabase: any
): Promise<boolean> {
  // Check shipping_events table if it exists, otherwise check audit_logs
  try {
    const { data: existing } = await supabase
      .from("admin_audit_logs")
      .select("id")
      .eq("target_id", orderId)
      .eq("action", "shiprocket_webhook")
      .limit(100);

    const typedExisting = (existing || []) as Array<{
      id: string;
      details?: any;
    }>;

    if (typedExisting) {
      const found = typedExisting.find((log) => {
        const details = (log.details as Record<string, any>) || {};
        return details?.idempotency_key === idempotencyKey;
      });
      return !!found;
    }
  } catch (error) {
    // Table might not exist, continue
  }

  return false;
}

/**
 * Process webhook event and update order
 */
async function processWebhookEvent(
  orderId: string,
  payload: any,
  eventType: string,
  currentStatus: string,
  supabase: any
): Promise<void> {
  // Map Shiprocket status to internal status
  const statusMap: Record<string, string> = {
    NEW: "processing",
    PENDING: "processing",
    PICKUP_SCHEDULED: "processing",
    PICKUP_COMPLETED: "packed",
    IN_TRANSIT: "in_transit",
    OUT_FOR_DELIVERY: "out_for_delivery",
    DELIVERED: "delivered",
    RTO_INITIATED: "returned",
    RTO_DELIVERED: "returned",
    CANCELLED: "cancelled",
    LOST: "delayed",
    EXCEPTION: "delayed",
  };

  const normalizedStatus = statusMap[currentStatus?.toUpperCase()] || "processing";

  // Fetch current order
  const { data: orderData } = await supabase
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  const typedOrderData = orderData as {
    metadata: any;
  } | null;

  const metadata = (typedOrderData?.metadata as Record<string, any>) || {};
  const shippingMetadata = metadata.shipping || {};
  const shippingTimeline = metadata.shipping_timeline || [];

  // Update metadata with new event
  const updatedMetadata = {
    ...metadata,
    shipping: {
      ...shippingMetadata,
      awb: payload.awb_code || payload.awb || shippingMetadata.awb,
      courier: payload.courier_name || payload.courier || shippingMetadata.courier,
      tracking_url: payload.tracking_url || shippingMetadata.tracking_url,
      expected_delivery: payload.expected_delivery_date || shippingMetadata.expected_delivery,
      last_webhook_received_at: new Date().toISOString(),
    },
    shipping_timeline: [
      ...shippingTimeline,
      {
        status: normalizedStatus,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        awb: payload.awb_code || payload.awb || null,
        courier: payload.courier_name || payload.courier || null,
        notes: payload.message || payload.remarks || null,
      },
    ],
    last_shiprocket_webhook: payload,
  };

  // Update order
  await supabase.from("orders").update({
    shipping_status: normalizedStatus,
    metadata: updatedMetadata,
    updated_at: new Date().toISOString(),
  } as unknown as never).eq("id", orderId);

  // Write audit log
  const idempotencyKey = buildIdempotencyKey(payload, eventType);
  try {
    await supabase.from("admin_audit_logs").insert({
      action: "shiprocket_webhook",
      target_resource: "orders",
      target_id: orderId,
      details: {
        event_type: eventType,
        status: currentStatus,
        normalized_status: normalizedStatus,
        idempotency_key: idempotencyKey,
        payload: payload,
      },
    } as unknown as never);
  } catch (auditError) {
    console.error("Audit log error:", auditError);
  }
}
