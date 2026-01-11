/**
 * POST /api/orders/track/verify-otp
 * Phase 4.1: Verify OTP and generate tracking token
 * 
 * Body: { order_id: string, mobile: string, otp: string }
 * 
 * Returns: { success: boolean, token?: string, error?: string, attempts_remaining?: number, locked_until?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp/service";

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
    const { order_id, mobile, otp } = body;
    
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
    
    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP format" },
        { status: 400 }
      );
    }
    
    // Get IP address for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Verify OTP
    const result = await verifyOtp({
      mobile,
      otp,
      purpose: "ORDER_TRACKING",
      entity_id: order_id,
      ip_address: ipAddress,
    });
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Invalid OTP",
          attempts_remaining: result.attempts_remaining,
          locked_until: result.locked_until,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      token: result.token,
    });
  } catch (error: any) {
    console.error("[ORDER_TRACKING] OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to process request" },
      { status: 500 }
    );
  }
}










