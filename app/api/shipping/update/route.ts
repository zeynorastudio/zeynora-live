import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Valid shipping statuses
const VALID_SHIPPING_STATUSES = [
  "not_shipped",
  "pending",
  "processing",
  "packed",
  "ready_for_pickup",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "delayed",
  "returned",
  "cancelled",
] as const;

type ShippingStatus = typeof VALID_SHIPPING_STATUSES[number];

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const {
      order_id,
      new_shipping_status,
      courier,
      awb,
      expected_delivery,
      notes,
    } = body;

    // Validate required fields
    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid order_id" },
        { status: 400 }
      );
    }

    if (!new_shipping_status || typeof new_shipping_status !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid new_shipping_status" },
        { status: 400 }
      );
    }

    // Validate status is in allowed list
    if (!VALID_SHIPPING_STATUSES.includes(new_shipping_status as ShippingStatus)) {
      return NextResponse.json(
        {
          error: "Invalid shipping status",
          allowed_statuses: VALID_SHIPPING_STATUSES,
        },
        { status: 400 }
      );
    }

    // Validate: if courier provided, AWB should also be provided
    if (courier && !awb) {
      return NextResponse.json(
        { error: "AWB is required when courier is provided" },
        { status: 400 }
      );
    }

    // Use service-level Supabase client
    const supabase = createServiceRoleClient();

    // Fetch order to verify it exists
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, shipping_status, metadata")
      .eq("id", order_id)
      .single();

    if (orderError || !orderData) {
      console.error("Order fetch error:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderData as {
      id: string;
      order_number: string;
      shipping_status: string | null;
      metadata: any;
    };

    // Idempotency check: don't create duplicate timeline events for same status
    const existingMetadata = (order.metadata as Record<string, any>) || {};
    const shippingTimeline = existingMetadata.shipping_timeline || [];
    
    // Check if this status was already logged recently (within last minute)
    const recentStatusUpdate = shippingTimeline.find(
      (event: any) =>
        event.status === new_shipping_status &&
        new Date(event.timestamp).getTime() > Date.now() - 60000
    );

    if (recentStatusUpdate && order.shipping_status === new_shipping_status) {
      return NextResponse.json({
        success: true,
        message: "Status already set",
        shipping: {
          status: new_shipping_status,
          courier: existingMetadata.shipping?.courier || courier || null,
          awb: existingMetadata.shipping?.awb || awb || null,
          expected_delivery: existingMetadata.shipping?.expected_delivery || expected_delivery || null,
        },
      });
    }

    // Prepare metadata update
    const updatedMetadata = {
      ...existingMetadata,
      shipping: {
        ...(existingMetadata.shipping || {}),
        ...(courier ? { courier } : {}),
        ...(awb ? { awb } : {}),
        ...(expected_delivery ? { expected_delivery } : {}),
        updated_at: new Date().toISOString(),
      },
      shipping_timeline: [
        ...shippingTimeline,
        {
          status: new_shipping_status,
          timestamp: new Date().toISOString(),
          updated_by: session.user.id,
          courier: courier || null,
          awb: awb || null,
          notes: notes || null,
        },
      ],
    };

    // Update order
    const updatePayload: {
      shipping_status: string;
      metadata: Record<string, any>;
      updated_at: string;
    } = {
      shipping_status: new_shipping_status,
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await (supabase
      .from("orders") as any)
      .update(updatePayload)
      .eq("id", order_id);

    if (updateError) {
      console.error("Order update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update order", details: updateError.message },
        { status: 500 }
      );
    }

    // Write audit log
    try {
      const auditPayload = {
        action: "shipping_status_updated",
        target_resource: "orders",
        target_id: order_id,
        performed_by: session.user.id,
        details: {
          order_number: order.order_number,
          old_status: order.shipping_status,
          new_status: new_shipping_status,
          courier: courier || null,
          awb: awb || null,
          expected_delivery: expected_delivery || null,
          notes: notes || null,
        },
      };
      await (supabase.from("admin_audit_logs") as any).insert(auditPayload);
    } catch (auditError: any) {
      // Log but don't fail the request if audit log fails
      console.error("Audit log error (non-fatal):", auditError);
    }

    return NextResponse.json({
      success: true,
      shipping: {
        status: new_shipping_status,
        courier: courier || existingMetadata.shipping?.courier || null,
        awb: awb || existingMetadata.shipping?.awb || null,
        expected_delivery:
          expected_delivery || existingMetadata.shipping?.expected_delivery || null,
        timeline: updatedMetadata.shipping_timeline,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in shipping/update:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}























