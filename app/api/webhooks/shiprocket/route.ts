import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/shipping/shiprocket-client";

export const dynamic = "force-dynamic";

/**
 * Shiprocket Webhook Handler
 * Phase 3.3: Updates shipment status from Shiprocket webhooks
 * 
 * Requirements:
 * - Verify webhook authenticity
 * - Update shipment_status in DB
 * - Do NOT expose raw webhook payloads in UI
 * - Map Shiprocket statuses to human-readable statuses
 */
export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const signature = req.headers.get("x-shiprocket-signature");

    // Verify webhook signature
    if (!verifyWebhookSignature(text, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(text);
    
    // Extract identifiers (Shiprocket may send different formats)
    const shipmentId = payload.shipment_id || payload.shipmentId || payload.id;
    const awbCode = payload.awb || payload.awb_code || payload.tracking_number;
    const currentStatus = payload.status || payload.current_status || payload.shipment_status;
    
    if (!shipmentId && !awbCode) {
      return NextResponse.json({ 
        success: false,
        message: "Ignored - no shipment_id or awb_code provided" 
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    
    // Find order by shiprocket_shipment_id (Phase 3.3: use new field)
    let query = supabase.from("orders").select("id, shiprocket_shipment_id, metadata");
    
    if (shipmentId) {
      query = query.eq("shiprocket_shipment_id", String(shipmentId));
    } else if (awbCode) {
      // Fallback: search in metadata for AWB
      // This is less efficient but handles cases where shipment_id might not be stored
      const { data: allOrders } = await supabase
        .from("orders")
        .select("id, shiprocket_shipment_id, metadata")
        .not("shiprocket_shipment_id", "is", null);
      
      const matchingOrder = (allOrders || []).find((order: any) => {
        const metadata = (order.metadata as Record<string, any>) || {};
        const shipping = metadata.shipping || {};
        return shipping.awb === awbCode;
      });
      
      if (!matchingOrder) {
        return NextResponse.json({ 
          success: false,
          message: "Order not found for AWB code" 
        }, { status: 404 });
      }
      
      const { data: order, error } = await supabase
        .from("orders")
        .select("id, shiprocket_shipment_id, metadata, shipment_status, shipping_status")
        .eq("id", matchingOrder.id)
        .single();
      
      if (error || !order) {
        return NextResponse.json({ 
          success: false,
          message: "Order not found" 
        }, { status: 404 });
      }

      await updateOrderShipmentStatus(order as any, currentStatus, payload, supabase);
      return NextResponse.json({ success: true });
    }

    const { data: order, error } = await query.single();
    
    if (error || !order) {
      return NextResponse.json({ 
        success: false,
        message: "Order not found" 
      }, { status: 404 });
    }

    await updateOrderShipmentStatus(order as any, currentStatus, payload, supabase);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SHIPROCKET_WEBHOOK] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Update order shipment status based on Shiprocket webhook
 * Phase 3.3: Maps Shiprocket statuses and updates DB without exposing raw payload
 */
async function updateOrderShipmentStatus(
  order: {
    id: string;
    shiprocket_shipment_id: string | null;
    metadata: any;
    shipment_status: string | null;
    shipping_status: string | null;
  },
  currentStatus: string | undefined,
  rawPayload: any,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<void> {
  // Map Shiprocket status to our shipment_status
  const statusUpper = (currentStatus || "").toUpperCase();
  let shipmentStatus = "created"; // Default
  let shippingStatus = order.shipping_status || "processing";

  // Map Shiprocket statuses
  if (statusUpper.includes("PENDING") || statusUpper.includes("NEW")) {
    shipmentStatus = "created";
    shippingStatus = "processing";
  } else if (statusUpper.includes("READY") || statusUpper.includes("PICKED")) {
    shipmentStatus = "created";
    shippingStatus = "processing";
  } else if (statusUpper.includes("SHIPPED") || statusUpper.includes("IN_TRANSIT") || statusUpper.includes("IN TRANSIT")) {
    shipmentStatus = "shipped";
    shippingStatus = "in_transit";
  } else if (statusUpper.includes("OUT_FOR_DELIVERY") || statusUpper.includes("OUT FOR DELIVERY")) {
    shipmentStatus = "shipped";
    shippingStatus = "out_for_delivery";
  } else if (statusUpper.includes("DELIVERED")) {
    shipmentStatus = "delivered";
    shippingStatus = "delivered";
  } else if (statusUpper.includes("FAILED") || statusUpper.includes("CANCELLED") || statusUpper.includes("CANCELED")) {
    shipmentStatus = "failed";
    shippingStatus = "cancelled";
  } else if (statusUpper.includes("RTO") || statusUpper.includes("RETURN")) {
    shipmentStatus = "failed";
    shippingStatus = "rto";
  }

  // Update metadata (store raw payload for admin debugging, but don't expose in UI)
  const existingMetadata = (order.metadata as Record<string, any>) || {};
  const shippingMetadata = existingMetadata.shipping || {};
  
  const updatedMetadata = {
    ...existingMetadata,
    shipping: {
      ...shippingMetadata,
      last_webhook_status: currentStatus,
      last_webhook_at: new Date().toISOString(),
      // Store raw payload in a hidden field (not exposed in UI)
      _webhook_payload: rawPayload,
    },
  };

  // Update order
  const updateData: Record<string, any> = {
    shipment_status: shipmentStatus,
    shipping_status: shippingStatus,
    metadata: updatedMetadata,
    updated_at: new Date().toISOString(),
  };

  // Update shipped_at timestamp if status changed to shipped
  if (shipmentStatus === "shipped" && order.shipment_status !== "shipped") {
    updateData.shipped_at = new Date().toISOString();
  }

  await supabase
    .from("orders")
    .update(updateData as unknown as never)
    .eq("id", order.id);

  // Write audit log (store minimal details, not full payload)
  await supabase.from("admin_audit_logs").insert({
    action: "shipment_status_updated",
    target_resource: "orders",
    target_id: order.id,
    details: {
      shipment_id: order.shiprocket_shipment_id,
      previous_status: order.shipment_status,
      new_status: shipmentStatus,
      shipping_status: shippingStatus,
      status_source: "shiprocket_webhook",
      // Do NOT store full webhook payload in audit log (security)
    },
  } as unknown as never);
}

