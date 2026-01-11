/**
 * POST /api/auth/customer/verify-otp
 * Verify OTP for customer authentication
 * 
 * Body: { mobile: string, otp: string }
 * 
 * On success, returns customer info if exists, or indicates new customer creation needed
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp/service";
import { findCustomerByMobile } from "@/lib/auth/customers";
import { normalizePhone } from "@/lib/otp/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile, otp } = body;
    
    // Validation
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
      purpose: "CUSTOMER_AUTH",
      ip_address: ipAddress,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid OTP" },
        { status: 400 }
      );
    }
    
    // OTP verified - check if customer exists
    const normalizedMobile = normalizePhone(mobile);
    const customer = await findCustomerByMobile(normalizedMobile);
    
    return NextResponse.json({
      success: true,
      customer_exists: customer !== null,
      customer_id: customer?.id || null,
      auth_uid: customer?.auth_uid || null,
    });
  } catch (error: unknown) {
    console.error("[CUSTOMER_AUTH] OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to verify OTP" },
      { status: 500 }
    );
  }
}









