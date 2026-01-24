/**
 * POST /api/auth/customer/verify-otp
 * Verify OTP for customer authentication
 * 
 * Body: { email: string, otp: string }
 * 
 * On success, returns customer info if exists, or indicates new customer creation needed
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp/service";
import { findCustomerByEmail } from "@/lib/auth/customers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;
    
    // Validation
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
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
      email,
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
    const normalizedEmail = email.trim().toLowerCase();
    const customer = await findCustomerByEmail(normalizedEmail);
    
    return NextResponse.json({
      success: true,
      customer_exists: customer !== null,
      requiresSignup: customer === null,
      customer_id: customer?.id || null,
      auth_uid: customer?.auth_uid || null,
      email: normalizedEmail,
    });
  } catch (error: unknown) {
    console.error("[CUSTOMER_AUTH] OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to verify OTP" },
      { status: 500 }
    );
  }
}









