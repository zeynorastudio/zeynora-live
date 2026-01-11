/**
 * POST /api/auth/customer/send-otp
 * Send OTP for customer authentication
 * 
 * Body: { mobile: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/otp/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile } = body;
    
    // Validation
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
      purpose: "CUSTOMER_AUTH",
      ip_address: ipAddress,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Unable to process request" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[CUSTOMER_AUTH] OTP request error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to process request" },
      { status: 500 }
    );
  }
}









