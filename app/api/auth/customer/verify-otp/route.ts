/**
 * POST /api/auth/customer/verify-otp
 * Verify OTP for customer authentication
 * 
 * Body: { email: string, otp: string }
 * 
 * On success, returns:
 * - customer_exists: boolean
 * - requires_signup: boolean (true if customer doesn't exist)
 * - customer: full customer profile if exists (id, email, first_name, last_name, phone, created_at, updated_at)
 * - customer_id: string | null
 * - email: normalized email
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp/service";
import { findCustomerByEmail } from "@/lib/auth/customers";
import type { Customer } from "@/lib/auth/customers";

export const dynamic = "force-dynamic";

/**
 * Build a safe customer profile object for response
 * Note: Using first_name for greeting as per requirements
 */
function buildCustomerProfile(customer: Customer) {
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  };
}

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
    
    // Build response with full customer profile if exists
    if (customer) {
      return NextResponse.json({
        success: true,
        customer_exists: true,
        requires_signup: false,
        customer_id: customer.id,
        auth_uid: customer.auth_uid || null,
        email: normalizedEmail,
        customer: buildCustomerProfile(customer),
      });
    } else {
      return NextResponse.json({
        success: true,
        customer_exists: false,
        requires_signup: true,
        customer_id: null,
        auth_uid: null,
        email: normalizedEmail,
        customer: null,
      });
    }
  } catch (error: unknown) {
    console.error("[CUSTOMER_AUTH] OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to verify OTP" },
      { status: 500 }
    );
  }
}









