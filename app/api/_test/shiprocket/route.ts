// TEMP TEST ROUTE — SAFE TO DELETE AFTER VERIFICATION

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/shipping/shiprocket-client";

export const dynamic = "force-dynamic";

/**
 * POST /api/_test/shiprocket
 * 
 * Temporary test route for manual Shiprocket integration testing.
 * Uses hardcoded dummy data and does NOT modify existing order/payment logic.
 * 
 * NOTE: In Next.js App Router, folders starting with _ are route groups.
 * This route is accessible at /api/shiprocket (the _test part is ignored).
 * To access at /api/_test/shiprocket, use a different folder structure.
 */

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1";

export async function POST(req: NextRequest) {
  try {
    // Step 1: Hard-coded payment verification
    const paymentVerified = true;
    
    if (!paymentVerified) {
      return NextResponse.json(
        { error: "Payment not verified" },
        { status: 400 }
      );
    }

    // Step 2: Read pickup location from environment
    const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION;

    if (!SHIPROCKET_PICKUP_LOCATION) {
      return NextResponse.json(
        {
          error: "Missing Shiprocket pickup location",
          message: "Required: SHIPROCKET_PICKUP_LOCATION",
        },
        { status: 400 }
      );
    }

    // Step 3: Get Shiprocket auth token using existing utility
    console.log("[SHIPROCKET_TEST] Getting auth token...");
    
    let authToken: string;
    try {
      authToken = await authenticate();
      console.log("[SHIPROCKET_TEST] Token obtained successfully");
    } catch (authError: any) {
      console.error("[SHIPROCKET_TEST] Token generation failed:", authError);
      return NextResponse.json(
        {
          error: "Failed to generate auth token",
          message: authError.message || "Unknown error",
        },
        { status: 401 }
      );
    }

    // Step 4: Prepare order creation payload with hardcoded dummy data
    const orderPayload = {
      order_id: "ZYN_TEST_" + Date.now(),
      order_date: new Date().toISOString(),
      pickup_location: SHIPROCKET_PICKUP_LOCATION,
      billing_customer_name: "Test",
      billing_last_name: "User",
      billing_address: "MG Road",
      billing_city: "Bangalore",
      billing_pincode: "560051",
      billing_state: "Karnataka",
      billing_country: "India",
      billing_email: "test@zeynora.in",
      billing_phone: "9999999999",
      shipping_is_billing: true,
      order_items: [
        {
          name: "Zeynora Test Product",
          sku: "ZYN-TEST-001",
          units: 1,
          selling_price: 1499,
        },
      ],
      payment_method: "Prepaid",
      sub_total: 1499,
      length: 30,
      breadth: 20,
      height: 5,
      weight: 0.5,
    };

    console.log("[SHIPROCKET_TEST] Order creation payload:", JSON.stringify(orderPayload, null, 2));

    // Step 5: Create order in Shiprocket
    let shiprocketResponse: any;
    try {
      const orderResponse = await fetch(`${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const responseText = await orderResponse.text();
      
      try {
        shiprocketResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[SHIPROCKET_TEST] Failed to parse response:", responseText);
        return NextResponse.json(
          {
            error: "Invalid JSON response from Shiprocket",
            message: responseText,
          },
          { status: 500 }
        );
      }

      if (!orderResponse.ok) {
        console.error("[SHIPROCKET_TEST] Order creation failed:", orderResponse.status, shiprocketResponse);
        return NextResponse.json(
          {
            error: "Shiprocket order creation failed",
            shiprocket_response: shiprocketResponse,
          },
          { status: 500 }
        );
      }

      console.log("[SHIPROCKET_TEST] Order creation successful:", JSON.stringify(shiprocketResponse, null, 2));
    } catch (orderError: any) {
      console.error("[SHIPROCKET_TEST] Order creation error:", orderError);
      return NextResponse.json(
        {
          error: "Failed to create order in Shiprocket",
          message: orderError.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 6: Return success response
    return NextResponse.json({
      payment_verified: true,
      shiprocket_called: true,
      shiprocket_response: shiprocketResponse,
    });
  } catch (error: any) {
    console.error("[SHIPROCKET_TEST] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
