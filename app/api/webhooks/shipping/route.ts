import { NextRequest, NextResponse } from "next/server";
import { POST as shiprocketPostHandler } from "../shiprocket/route";

export const dynamic = "force-dynamic";

/**
 * Safe Shiprocket Webhook Route (without "shiprocket" in URL)
 * This route forwards requests to the actual handler at /api/webhooks/shiprocket
 * 
 * Shiprocket blocks URLs containing "shiprocket", so we expose this safe alias
 * while keeping all existing logic unchanged.
 * 
 * TEMPORARY DIAGNOSTIC LAYER: Logs request details for Shiprocket verification debugging
 */
export async function POST(req: NextRequest) {
  try {
    console.log("SHIPMENT WEBHOOK VIA SAFE PATH");
    
    // ============================================
    // DIAGNOSTIC LOGGING (TEMPORARY)
    // ============================================
    
    // Log request method
    console.log("[DIAG] Method:", req.method);
    
    // Log all headers
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log("[DIAG] All headers:", JSON.stringify(headersObj, null, 2));
    
    // Log specific headers
    console.log("[DIAG] Content-Type:", req.headers.get("content-type"));
    console.log("[DIAG] X-API-Key:", req.headers.get("x-api-key"));
    console.log("[DIAG] X-Shiprocket-Signature:", req.headers.get("x-shiprocket-signature"));
    
    // Read raw body safely
    const raw = await req.text();
    console.log("[DIAG] Raw body length:", raw.length);
    console.log("[DIAG] Raw body (first 500 chars):", raw.slice(0, 500));
    
    // Attempt JSON parsing
    let json = null;
    let jsonParseSuccess = false;
    try {
      if (raw.trim()) {
        json = JSON.parse(raw);
        jsonParseSuccess = true;
      }
    } catch (e) {
      jsonParseSuccess = false;
      console.log("[DIAG] JSON parse failed:", e instanceof Error ? e.message : String(e));
    }
    console.log("[DIAG] JSON parse succeeded:", jsonParseSuccess);
    
    // Check for verification ping
    const signature = req.headers.get("x-shiprocket-signature");
    const isLikelyVerificationPing = !signature && (raw.length === 0 || raw.length < 100);
    
    if (isLikelyVerificationPing) {
      console.log("[DIAG] Likely Shiprocket verification ping - returning 200");
      return new NextResponse(null, { status: 200 });
    }
    
    // ============================================
    // FORWARD TO EXISTING HANDLER
    // ============================================
    
    // Reconstruct request with same body and headers for handler
    // (since we consumed the body stream, we need to create a new request)
    const reconstructedReq = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: raw,
    });
    
    // Forward to original handler
    return shiprocketPostHandler(reconstructedReq);
    
  } catch (error: any) {
    console.error("[DIAG] Error in diagnostic layer:", error);
    // Ensure we always return a response
    return NextResponse.json(
      { error: "Internal server error", message: error?.message },
      { status: 500 }
    );
  }
}
