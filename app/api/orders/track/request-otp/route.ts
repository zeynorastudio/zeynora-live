/**
 * POST /api/orders/track/request-otp
 * Phase 4.1: Request OTP for order tracking
 * 
 * Body: { order_id: string, mobile: string }
 * 
 * Returns: { success: boolean, error?: string, locked_until?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/otp/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Check feature flag
    const featureEnabled = process.env.ORDER_TRACKING_ENABLED !== "false";
    if (!featureEnabled) {
      return NextResponse.json(
        { success: false, error: "Order tracking is currently unavailable" },
        { status: 503 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { order_id, mobile } = body;
    
    // Validation
    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }
    
    if (!mobile || typeof mobile !== "string") {
      return NextResponse.json(
        { success: false, error: "Mobile number is required" },
        { status: 400 }
      );
    }
    
    // Get IP address for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Send OTP
    const result = await sendOtp({
      mobile,
      purpose: "ORDER_TRACKING",
      entity_id: order_id,
      ip_address: ipAddress,
    });
    
    if (!result.success) {
      // Return generic error messages
      return NextResponse.json(
        { success: false, error: result.error || "Unable to process request" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ORDER_TRACKING] OTP request error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to process request" },
      { status: 500 }
    );
  }
}










