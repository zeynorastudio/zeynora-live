/**
 * POST /api/auth/customer/send-otp
 * Send OTP for customer authentication
 * 
 * Body: { email: string }
 * - email: Required - email address for OTP delivery
 */

import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/otp/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    
    // Validation
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
        { status: 400 }
      );
    }
    
    // Get IP address for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Send OTP
    const result = await sendOtp({
      email,
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









