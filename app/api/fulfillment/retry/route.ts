/**
 * FINAL — Fulfillment Retry Endpoint
 * 
 * Allows admin to retry failed shipment bookings
 * 
 * Endpoint: POST /api/fulfillment/retry
 * Body: { order_id: string } or { batch_order_ids: string[] }
 * 
 * Access: Admin or Super Admin only
 * 
 * Conditions for retry:
 * - Order must be PAID
 * - shipment_status must be "FAILED" or "PENDING" or null
 * 
 * Actions:
 * - Re-runs full booking logic
 * - Updates shipment_status
 * - Logs retry attempts
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    const systemToken = req.headers.get("x-system-token");

    // Must be admin/super_admin or have system token
    if (!session && systemToken !== process.env.SYSTEM_API_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only admin and super_admin can retry
    if (session && !["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden - requires admin role" }, { status: 403 });
    }

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

    const { order_id, batch_order_ids } = body;

    // Support single order or batch
    const orderIds: string[] = batch_order_ids || (order_id ? [order_id] : []);

    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: "Missing order_id or batch_order_ids" },
        { status: 400 }
      );
    }

    // Limit batch size
    if (orderIds.length > 50) {
      return NextResponse.json(
        { error: "Batch size exceeds limit of 50" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const results: Array<{
      order_id: string;
      success: boolean;
      shipment_id?: string;
      awb_code?: string;
      courier_name?: string;
      error?: string;
    }> = [];

    // Process each order
    for (const orderId of orderIds) {
      try {
        console.log("[FULFILLMENT_RETRY_START]", {
          order_id: orderId,
          triggered_by: session?.user?.id || "system",
        });

        // Check retry rate limit (max 5 attempts per hour per order)
        const { data: recentAttempts } = await supabase
          .from("admin_audit_logs")
          .select("created_at")
          .eq("target_id", orderId)
          .eq("action", "fulfillment_retry")
          .gte("created_at", new Date(Date.now() - 3600000).toISOString())
          .limit(10);

        if (recentAttempts && recentAttempts.length >= 5) {
          results.push({
            order_id: orderId,
            success: false,
            error: "Rate limit exceeded - too many retry attempts (max 5/hour)",
          });
          continue;
        }

        // Verify order exists and check conditions
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("id, order_number, order_status, payment_status, shipment_status, shiprocket_shipment_id")
          .eq("id", orderId)
          .single();

        if (orderError || !orderData) {
          results.push({
            order_id: orderId,
            success: false,
            error: "Order not found",
          });
          continue;
        }

        const order = orderData as {
          id: string;
          order_number: string;
          order_status: string | null;
          payment_status: string | null;
          shipment_status: string | null;
          shiprocket_shipment_id: string | null;
        };

        // Check payment status
        if (order.payment_status !== "paid" || order.order_status !== "paid") {
          results.push({
            order_id: orderId,
            success: false,
            error: `Order is not paid (status: ${order.payment_status}/${order.order_status})`,
          });
          continue;
        }

        // Check shipment status - only retry if FAILED, PENDING, or null
        const retryableStatuses = ["FAILED", "PENDING", null, undefined, ""];
        if (order.shipment_status && !retryableStatuses.includes(order.shipment_status)) {
          // If already BOOKED with shipment_id, return existing data
          if (order.shipment_status === "BOOKED" && order.shiprocket_shipment_id) {
            results.push({
              order_id: orderId,
              success: true,
              shipment_id: order.shiprocket_shipment_id,
              error: "Shipment already booked",
            });
            continue;
          }
          
          results.push({
            order_id: orderId,
            success: false,
            error: `Cannot retry - shipment status is ${order.shipment_status}`,
          });
          continue;
        }

        // Run full shipment booking logic
        const result = await createShipmentForPaidOrder(orderId);

        if (result.success) {
          results.push({
            order_id: orderId,
            success: true,
            shipment_id: result.shipment_id,
            awb_code: result.awb_code,
            courier_name: result.courier_name,
          });

          console.log("[FULFILLMENT_RETRY_SUCCESS]", {
            order_id: orderId,
            order_number: order.order_number,
            shipment_id: result.shipment_id,
            awb_code: result.awb_code,
          });

          // Write audit log
          try {
            await supabase.from("admin_audit_logs").insert({
              action: "fulfillment_retry",
              target_resource: "orders",
              target_id: orderId,
              performed_by: session?.user?.id || null,
              details: {
                success: true,
                shipment_id: result.shipment_id,
                awb_code: result.awb_code,
                courier_name: result.courier_name,
                retry_attempt: (recentAttempts?.length || 0) + 1,
              },
            } as unknown as never);
          } catch (auditError) {
            console.warn("[FULFILLMENT_RETRY] Audit log error (non-fatal)");
          }
        } else {
          results.push({
            order_id: orderId,
            success: false,
            error: result.error || "Fulfillment failed",
          });

          console.error("[FULFILLMENT_RETRY_FAILED]", {
            order_id: orderId,
            order_number: order.order_number,
            error: result.error,
          });

          // Write audit log
          try {
            await supabase.from("admin_audit_logs").insert({
              action: "fulfillment_retry",
              target_resource: "orders",
              target_id: orderId,
              performed_by: session?.user?.id || null,
              details: {
                success: false,
                error: result.error,
                retry_attempt: (recentAttempts?.length || 0) + 1,
              },
            } as unknown as never);
          } catch (auditError) {
            console.warn("[FULFILLMENT_RETRY] Audit log error (non-fatal)");
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({
          order_id: orderId,
          success: false,
          error: errorMessage,
        });

        console.error("[FULFILLMENT_RETRY_EXCEPTION]", {
          order_id: orderId,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[FULFILLMENT_RETRY_ERROR]", { error: errorMessage });
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
