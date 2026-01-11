/**
 * Phase 4.3 — Shiprocket Returns Webhook Handler
 * POST /api/webhooks/shiprocket/returns
 * 
 * Handles webhook updates for reverse pickup shipments
 * Updates return request status based on Shiprocket status
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/shipping/shiprocket-client";
import { createAudit } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const signature = req.headers.get("x-shiprocket-signature");

    // Verify webhook signature
    if (!verifyWebhookSignature(text, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(text);
    
    // Extract identifiers
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
    
    // Find return request by shiprocket_pickup_id
    let query = supabase
      .from("return_requests")
      .select("id, status, shiprocket_pickup_id")
      .eq("shiprocket_pickup_id", String(shipmentId || ""));
    
    const { data: returnRequest, error } = await query.single();
    
    if (error || !returnRequest) {
      // Not a return pickup webhook, ignore
      return NextResponse.json({ 
        success: false,
        message: "Return request not found for this shipment" 
      }, { status: 404 });
    }

    const typedReturnRequest = returnRequest as {
      id: string;
      status: string;
      shiprocket_pickup_id: string | null;
    };

    // Map Shiprocket status to return status
    const statusUpper = (currentStatus || "").toUpperCase();
    let newStatus = typedReturnRequest.status;

    if (statusUpper.includes("PICKUP_SCHEDULED") || statusUpper.includes("PICKUP SCHEDULED")) {
      newStatus = "pickup_scheduled";
    } else if (statusUpper.includes("IN_TRANSIT") || statusUpper.includes("IN TRANSIT")) {
      newStatus = "in_transit";
    } else if (statusUpper.includes("DELIVERED") || statusUpper.includes("RTO_DELIVERED")) {
      newStatus = "received";
    } else if (statusUpper.includes("FAILED") || statusUpper.includes("CANCELLED")) {
      // Increment retry count on failure
      const { data: currentReturn } = await supabase
        .from("return_requests")
        .select("pickup_retry_count")
        .eq("id", typedReturnRequest.id)
        .single();

      const retryCount = ((currentReturn as any)?.pickup_retry_count || 0) + 1;
      const maxRetries = parseInt(process.env.SHIPROCKET_MAX_PICKUP_RETRIES || "2", 10);

      if (retryCount >= maxRetries) {
        // Auto-cancel after max retries
        newStatus = "cancelled";
        await supabase
          .from("return_requests")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            pickup_retry_count: retryCount,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", typedReturnRequest.id);

        await createAudit(null, "return_pickup_failed_auto_cancelled", {
          return_request_id: typedReturnRequest.id,
          reason: "Pickup failed after 2 retries",
        });
      } else {
        // Update retry count but keep status
        await supabase
          .from("return_requests")
          .update({
            pickup_retry_count: retryCount,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", typedReturnRequest.id);

        await createAudit(null, "return_pickup_failed", {
          return_request_id: typedReturnRequest.id,
          retry_count: retryCount,
        });
      }
    }

    // Update status if changed
    if (newStatus !== typedReturnRequest.status && newStatus !== "cancelled") {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "received") {
        updateData.received_at = new Date().toISOString();
      }

      await supabase
        .from("return_requests")
        .update(updateData as unknown as never)
        .eq("id", typedReturnRequest.id);

      await createAudit(null, "return_status_updated", {
        return_request_id: typedReturnRequest.id,
        old_status: typedReturnRequest.status,
        new_status: newStatus,
        source: "shiprocket_webhook",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SHIPROCKET_RETURNS_WEBHOOK] Error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}








