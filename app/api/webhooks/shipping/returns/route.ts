import { NextRequest, NextResponse } from "next/server";
import { POST as shiprocketReturnsPostHandler } from "../../shiprocket/returns/route";

export const dynamic = "force-dynamic";

/**
 * Safe Shiprocket Returns Webhook Route (without "shiprocket" in URL)
 * This route forwards requests to the actual handler at /api/webhooks/shiprocket/returns
 * 
 * Shiprocket blocks URLs containing "shiprocket", so we expose this safe alias
 * while keeping all existing logic unchanged.
 */
export async function POST(req: NextRequest) {
  console.log("RETURNS WEBHOOK VIA SAFE PATH");
  
  // Forward the request to the original handler
  // The request body and headers are passed unchanged
  return shiprocketReturnsPostHandler(req);
}
