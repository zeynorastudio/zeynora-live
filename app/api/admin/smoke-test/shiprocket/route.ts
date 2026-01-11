/**
 * TEMPORARY SMOKE TEST ROUTE
 * 
 * POST /api/admin/smoke-test/shiprocket
 * 
 * Purpose:
 * - Verify production Shiprocket shipment flow end-to-end
 * - Test WITHOUT Razorpay or Shiprocket webhooks
 * - Safe, manual trigger for testing
 * 
 * WARNING: This is a TEMPORARY route for testing purposes.
 * DELETE after verification is complete.
 * 
 * Security: Server-only, manually triggered (Postman/curl)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // SMOKE TEST LOG: Smoke test started
  console.log("[SMOKE TEST] Shiprocket smoke test route triggered");

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[SMOKE TEST] Invalid JSON payload");
      return NextResponse.json(
        {
          smoke_test: "FAIL",
          error: "Invalid JSON payload",
        },
        { status: 400 }
      );
    }

    const { orderId } = body;

    // Validate orderId is provided
    if (!orderId || typeof orderId !== "string") {
      console.error("[SMOKE TEST] Missing or invalid orderId");
      return NextResponse.json(
        {
          smoke_test: "FAIL",
          error: "Missing or invalid orderId. Expected: { orderId: string }",
        },
        { status: 400 }
      );
    }

    // SMOKE TEST LOG: Order validation started
    console.log("[SMOKE TEST] Validating order:", { order_id: orderId });

    const supabase = createServiceRoleClient();

    // Fetch order to validate it exists and is PAID
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, order_status, payment_status, shiprocket_shipment_id, shipment_status"
      )
      .eq("id", orderId)
      .single();

    // SMOKE TEST LOG: Order validation result
    if (orderError || !orderData) {
      console.error("[SMOKE TEST] Order not found:", {
        order_id: orderId,
        error: orderError?.message || "No data returned",
      });
      return NextResponse.json(
        {
          smoke_test: "FAIL",
          order_id: orderId,
          error: `Order not found: ${orderError?.message || "Order does not exist"}`,
        },
        { status: 400 }
      );
    }

    const order = orderData;

    // Validate order is PAID
    if (order.order_status !== "paid" || order.payment_status !== "paid") {
      console.warn("[SMOKE TEST] Order not paid:", {
        order_id: orderId,
        order_status: order.order_status,
        payment_status: order.payment_status,
      });
      return NextResponse.json(
        {
          smoke_test: "FAIL",
          order_id: orderId,
          error: `Order is not PAID. Current status: order_status=${order.order_status}, payment_status=${order.payment_status}. Order must be marked as PAID before creating shipment.`,
        },
        { status: 400 }
      );
    }

    // SMOKE TEST LOG: Order validation passed
    console.log("[SMOKE TEST] Order validation passed:", {
      order_id: orderId,
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
    });

    // Check if shipment already exists
    if (
      order.shiprocket_shipment_id &&
      order.shipment_status &&
      order.shipment_status !== "failed"
    ) {
      console.log("[SMOKE TEST] Shipment already exists:", {
        order_id: orderId,
        shipment_id: order.shiprocket_shipment_id,
        status: order.shipment_status,
      });
      return NextResponse.json(
        {
          smoke_test: "PASS",
          order_id: orderId,
          shipment_created: false,
          message: "Shipment already exists for this order",
          shipment_id: order.shiprocket_shipment_id,
          shipment_status: order.shipment_status,
        },
        { status: 200 }
      );
    }

    // SMOKE TEST LOG: Shipment attempt started
    console.log("[SMOKE TEST] Attempting to create shipment:", {
      order_id: orderId,
      order_number: order.order_number,
    });

    // Call the production function (DO NOT duplicate logic)
    // Wrap in try/catch to handle Shiprocket failures gracefully
    try {
      const result = await createShipmentForPaidOrder(orderId);

      // SMOKE TEST LOG: Shipment attempt result
      if (!result.success) {
        console.error("[SMOKE TEST] Shipment creation failed:", {
          order_id: orderId,
          error: result.error,
          already_exists: result.already_exists,
        });
        return NextResponse.json(
          {
            smoke_test: "FAIL",
            order_id: orderId,
            shipment_created: false,
            error: result.error || "Shipment creation failed",
            already_exists: result.already_exists || false,
          },
          { status: 200 } // Return 200 to indicate test completed, not a server error
        );
      }

      // SMOKE TEST LOG: Shipment creation succeeded
      console.log("[SMOKE TEST] Shipment creation succeeded:", {
        order_id: orderId,
        shipment_id: result.shipment_id,
        courier_name: result.courier_name,
        already_exists: result.already_exists,
      });

      return NextResponse.json(
        {
          smoke_test: "PASS",
          order_id: orderId,
          shipment_created: true,
          shipment_id: result.shipment_id,
          courier_name: result.courier_name,
          already_exists: result.already_exists || false,
        },
        { status: 200 }
      );
    } catch (shipmentError: unknown) {
      // SMOKE TEST LOG: Shiprocket error caught
      const errorMessage =
        shipmentError instanceof Error
          ? shipmentError.message
          : "Unknown error during shipment creation";

      console.error("[SMOKE TEST] Shiprocket error caught:", {
        order_id: orderId,
        error: errorMessage,
        stack:
          shipmentError instanceof Error ? shipmentError.stack : undefined,
      });

      // DO NOT throw - return error JSON instead
      return NextResponse.json(
        {
          smoke_test: "FAIL",
          order_id: orderId,
          shipment_created: false,
          error: errorMessage,
        },
        { status: 200 } // Return 200 to indicate test completed, not a server error
      );
    }
  } catch (error: unknown) {
    // SMOKE TEST LOG: Unexpected error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("[SMOKE TEST] Unexpected error:", {
      route: "/api/admin/smoke-test/shiprocket",
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        smoke_test: "FAIL",
        error: "Internal server error during smoke test",
        message:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

