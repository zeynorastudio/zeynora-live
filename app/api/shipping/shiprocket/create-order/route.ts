import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    const { order_id } = body;
    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid order_id" },
        { status: 400 }
      );
    }

    // Use service-level Supabase client
    const supabase = createServiceRoleClient();

    // Fetch order with explicit field selection
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, subtotal, shipping_fee, total_amount, shipping_status, metadata, shiprocket_shipment_id"
      )
      .eq("id", order_id)
      .single();

    if (orderError || !orderData) {
      console.error("Order fetch error:", orderError);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Type assertion for order data
    const order = orderData as {
      id: string;
      order_number: string;
      subtotal: number | null;
      shipping_fee: number | null;
      total_amount: number | null;
      shipping_status: string | null;
      metadata: any;
      shiprocket_shipment_id: string | null;
    };

    // Idempotency check: if shipment already exists, return existing data
    const existingMetadata = (order.metadata as Record<string, any>) || {};
    const existingShiprocketData = existingMetadata.shiprocket || {};
    
    if (order.shiprocket_shipment_id || existingShiprocketData.shipment_id) {
      return NextResponse.json({
        success: true,
        message: "Shipment already exists",
        shipment: {
          shipment_id: order.shiprocket_shipment_id || existingShiprocketData.shipment_id,
          awb_code: existingShiprocketData.awb_code,
          courier_name: existingShiprocketData.courier_name,
        },
      });
    }

    // Check environment for Shiprocket credentials
    const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
    const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
    const DEV_MODE = process.env.SHIPROCKET_DEV_MODE === "true" || !SHIPROCKET_EMAIL;

    let responsePayload: Record<string, any> = {};
    let shippingCost = 0;

    if (DEV_MODE) {
      console.log("[Shiprocket] DEV MODE: Simulating order creation...");
      shippingCost = 150; // Simulated shipping cost
      const simulatedAWB = `AWB${Math.floor(Math.random() * 1000000)}`;
      responsePayload = {
        order_id: order.id,
        shipment_id: 123456,
        status: "NEW",
        statusCode: 1,
        onboarding_completed_now: 0,
        awb_code: simulatedAWB,
        courier_company_id: 1,
        courier_name: "Blue Dart Surface",
      };
    } else {
      // Real Shiprocket API integration would go here
      // 1. Authenticate to get token
      // 2. POST to /v1/external/orders/create/adhoc
      // 3. Parse response
      
      // For now, return error if not in dev mode and credentials missing
      return NextResponse.json(
        {
          error: "Shiprocket API integration not implemented",
          message: "Set SHIPROCKET_DEV_MODE=true to use simulation mode",
        },
        { status: 501 }
      );
    }

    // Prepare metadata update with Shiprocket details
    const updatedMetadata = {
      ...existingMetadata,
      shiprocket: {
        shipment_id: responsePayload.shipment_id,
        awb_code: responsePayload.awb_code,
        courier_name: responsePayload.courier_name,
        courier_company_id: responsePayload.courier_company_id,
        status: responsePayload.status,
        created_at: new Date().toISOString(),
        full_response: responsePayload,
      },
    };

    // Update order with Shiprocket details
    // Note: Using 'processing' status instead of 'assigned' to match schema enum
    const updatePayload: {
      shipping_status: string;
      shiprocket_shipment_id: string;
      metadata: Record<string, any>;
      updated_at: string;
      shipping_fee?: number;
    } = {
      shipping_status: "processing",
      shiprocket_shipment_id: String(responsePayload.shipment_id),
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    };

    // Only update shipping_fee if it's different (preserve existing if set)
    if (shippingCost > 0 && (!order.shipping_fee || order.shipping_fee === 0)) {
      updatePayload.shipping_fee = shippingCost;
    }

    // Use type assertion to bypass TypeScript inference issues with service role client
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

    // Write audit log (handle potential type issues gracefully)
    try {
      const auditPayload = {
        action: "shiprocket_create_order",
        target_resource: "orders",
        target_id: order_id,
        performed_by: session.user.id,
        details: {
          order_number: order.order_number,
          shipment_id: responsePayload.shipment_id,
          awb_code: responsePayload.awb_code,
          courier_name: responsePayload.courier_name,
          dev_mode: DEV_MODE,
        },
      };
      // Use type assertion to bypass TypeScript inference issues
      await (supabase.from("admin_audit_logs") as any).insert(auditPayload);
    } catch (auditError: any) {
      // Log but don't fail the request if audit log fails
      console.error("Audit log error (non-fatal):", auditError);
    }

    return NextResponse.json({
      success: true,
      shipment: {
        shipment_id: responsePayload.shipment_id,
        awb_code: responsePayload.awb_code,
        courier_name: responsePayload.courier_name,
        status: responsePayload.status,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in shiprocket/create-order:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
