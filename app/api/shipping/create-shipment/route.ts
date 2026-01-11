import { NextRequest, NextResponse } from "next/server";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";

export const dynamic = "force-dynamic";

/**
 * API endpoint to create shipment in Shiprocket
 * Phase 3.3: Only creates shipment for PAID orders
 * 
 * This endpoint is called:
 * - Automatically after payment confirmation (via webhook)
 * - Manually by super admin for retry
 * 
 * Security: Server-side only, no frontend access
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

    // Create shipment (only for PAID orders)
    const result = await createShipmentForPaidOrder(order_id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          requires_attention: result.error?.includes("failed") || false,
        },
        { status: result.already_exists ? 200 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shipment_id: result.shipment_id,
      courier_name: result.courier_name,
      already_exists: result.already_exists || false,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SHIPMENT_API] Unexpected error:", {
      route: "/api/shipping/create-shipment",
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











