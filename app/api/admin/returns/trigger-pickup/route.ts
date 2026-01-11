/**
 * Phase 4.3 — Admin Trigger Pickup API
 * POST /api/admin/returns/trigger-pickup
 * 
 * Admin triggers reverse pickup for approved return
 * Only admin/super_admin can trigger pickup
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createAudit } from "@/lib/audit/log";
import { createReversePickup } from "@/lib/shipping/reverse-pickup";
import type { TriggerPickupInput } from "@/types/returns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json() as TriggerPickupInput;
    const { return_request_id } = body;

    if (!return_request_id || typeof return_request_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Return request ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch return request with order details
    const { data: returnRequest, error: fetchError } = await supabase
      .from("return_requests")
      .select(`
        id,
        status,
        order_id,
        pickup_retry_count,
        orders!inner(
          id,
          shiprocket_shipment_id,
          metadata
        )
      `)
      .eq("id", return_request_id)
      .single();

    if (fetchError || !returnRequest) {
      return NextResponse.json(
        { success: false, error: "Return request not found" },
        { status: 404 }
      );
    }

    const typedReturnRequest = returnRequest as {
      id: string;
      status: string;
      order_id: string;
      pickup_retry_count: number;
      orders: {
        id: string;
        shiprocket_shipment_id: string | null;
        metadata: any;
      };
    };

    // Enforce SHIPROCKET_REVERSE_PICKUP_ENABLED flag (API-level enforcement)
    if (process.env.SHIPROCKET_REVERSE_PICKUP_ENABLED !== "true") {
      return NextResponse.json(
        { success: false, error: "Reverse pickup is disabled. Contact administrator." },
        { status: 403 }
      );
    }

    // Check status
    if (typedReturnRequest.status !== "approved") {
      return NextResponse.json(
        { success: false, error: `Return request must be approved before pickup. Current status: ${typedReturnRequest.status}` },
        { status: 400 }
      );
    }

    // Check retry count
    const maxRetries = parseInt(process.env.SHIPROCKET_MAX_PICKUP_RETRIES || "2", 10);
    if (typedReturnRequest.pickup_retry_count >= maxRetries) {
      // Auto-cancel after max retries
      await supabase
        .from("return_requests")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", return_request_id);

      await createAudit(session.user.id, "return_auto_cancelled", {
        return_request_id: return_request_id,
        reason: "Pickup retry limit exceeded",
      });

      return NextResponse.json(
        { success: false, error: "Pickup retry limit exceeded. Return automatically cancelled." },
        { status: 400 }
      );
    }

    // Check if order has Shiprocket shipment ID
    if (!typedReturnRequest.orders.shiprocket_shipment_id) {
      return NextResponse.json(
        { success: false, error: "Order does not have Shiprocket shipment ID" },
        { status: 400 }
      );
    }

    // Get order shipping address from metadata
    const metadata = (typedReturnRequest.orders.metadata as Record<string, any>) || {};
    const shippingAddress = metadata.shipping_address || metadata.customer?.shipping_address;

    if (!shippingAddress) {
      return NextResponse.json(
        { success: false, error: "Shipping address not found in order metadata" },
        { status: 400 }
      );
    }

    // Create reverse pickup request
    try {
      const pickupResponse = await createReversePickup({
        shipment_id: parseInt(typedReturnRequest.orders.shiprocket_shipment_id),
        pickup_customer_name: shippingAddress.name || shippingAddress.full_name || "Customer",
        pickup_customer_phone: shippingAddress.phone || "",
        pickup_address: shippingAddress.line1 || shippingAddress.address || "",
        pickup_address_2: shippingAddress.line2 || shippingAddress.address_2 || undefined,
        pickup_city: shippingAddress.city || "",
        pickup_state: shippingAddress.state || "",
        pickup_pincode: shippingAddress.pincode || shippingAddress.postal_code || "",
        pickup_country: shippingAddress.country || "India",
      });

      // Update return request status
      const { error: updateError } = await supabase
        .from("return_requests")
        .update({
          status: "pickup_scheduled",
          shiprocket_pickup_id: pickupResponse.shipment_id?.toString() || null,
          pickup_retry_count: typedReturnRequest.pickup_retry_count + 1,
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", return_request_id);

      if (updateError) {
        console.error("[RETURNS] Failed to update return after pickup:", updateError);
        return NextResponse.json(
          { success: false, error: "Pickup scheduled but failed to update return status" },
          { status: 500 }
        );
      }

      // Audit log
      await createAudit(session.user.id, "return_pickup_triggered", {
        return_request_id: return_request_id,
        order_id: typedReturnRequest.order_id,
        shiprocket_pickup_id: pickupResponse.shipment_id?.toString(),
        retry_count: typedReturnRequest.pickup_retry_count + 1,
      });

      return NextResponse.json({
        success: true,
        message: "Pickup scheduled successfully",
        pickup_id: pickupResponse.shipment_id,
      });
    } catch (pickupError: any) {
      console.error("[RETURNS] Pickup creation error:", pickupError);

      // Increment retry count on failure
      const newRetryCount = typedReturnRequest.pickup_retry_count + 1;
      await supabase
        .from("return_requests")
        .update({
          pickup_retry_count: newRetryCount,
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", return_request_id);

      // Auto-cancel if retry limit reached
      const maxRetries = parseInt(process.env.SHIPROCKET_MAX_PICKUP_RETRIES || "2", 10);
      if (newRetryCount >= maxRetries) {
        await supabase
          .from("return_requests")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", return_request_id);

        await createAudit(session.user.id, "return_pickup_failed_auto_cancelled", {
          return_request_id: return_request_id,
          reason: "Pickup failed after 2 retries",
        });
      } else {
        await createAudit(session.user.id, "return_pickup_failed", {
          return_request_id: return_request_id,
          retry_count: newRetryCount,
          error: pickupError.message,
        });
      }

      return NextResponse.json(
        { success: false, error: `Failed to schedule pickup: ${pickupError.message}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("[RETURNS] Trigger pickup error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}








