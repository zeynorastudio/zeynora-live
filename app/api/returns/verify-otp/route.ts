/**
 * Phase 4.3 — Return OTP Verification API
 * POST /api/returns/verify-otp
 * 
 * Verifies OTP and activates return request
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyOtp, normalizePhone } from "@/lib/otp/service";
import { createAudit } from "@/lib/audit/log";
import type { VerifyReturnOtpInput } from "@/types/returns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as VerifyReturnOtpInput;
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

    const supabase = createServiceRoleClient();
    const normalizedMobile = normalizePhone(mobile);

    // Verify OTP
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const otpResult = await verifyOtp({
      mobile: normalizedMobile,
      otp,
      purpose: "ORDER_TRACKING",
      entity_id: order_id,
      ip_address: ipAddress,
    });

    if (!otpResult.success) {
      return NextResponse.json(
        { success: false, error: otpResult.error || "Invalid OTP" },
        { status: 400 }
      );
    }

    // Find return request for this order
    const { data: returnRequest, error: returnError } = await supabase
      .from("return_requests")
      .select("id, status, order_id")
      .eq("order_id", order_id)
      .or(`customer_id.is.null,guest_mobile.eq.${normalizedMobile}`)
      .eq("status", "requested")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (returnError || !returnRequest) {
      return NextResponse.json(
        { success: false, error: "Return request not found or already processed" },
        { status: 404 }
      );
    }

    // Return request is already created and OTP is verified
    // Status remains "requested" - admin will approve it
    // No status change needed here

    // Audit log
    await createAudit(null, "return_otp_verified", {
      return_request_id: returnRequest.id,
      order_id: order_id,
      mobile: normalizedMobile,
    });

    return NextResponse.json({
      success: true,
      return_request_id: returnRequest.id,
      message: "OTP verified. Return request submitted for admin approval.",
    });
  } catch (error: unknown) {
    console.error("[RETURNS] OTP verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}









