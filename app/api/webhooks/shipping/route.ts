import { NextRequest, NextResponse } from "next/server";
import { POST as shiprocketPostHandler } from "../shiprocket/route";

export const dynamic = "force-dynamic";

/**
 * Production Shiprocket Webhook Route (without "shiprocket" in URL)
 * 
 * Shiprocket blocks URLs containing "shiprocket", so we expose this safe alias.
 * This handler supports:
 * - Shiprocket verification flow (no signature + valid JSON)
 * - Real webhook events (with signature verification)
 * - HTTP method verification (GET/HEAD/OPTIONS for verification)
 */
export async function POST(req: NextRequest) {
  try {
    // Read raw body
    const raw = await req.text();
    
    // Attempt JSON parsing
    let isValidJson = false;
    try {
      if (raw.trim()) {
        JSON.parse(raw);
        isValidJson = true;
      }
    } catch {
      isValidJson = false;
    }
    
    // Read signature header (check both possible header names)
    const signature =
      req.headers.get("x-shiprocket-signature") ||
      req.headers.get("x-api-key");
    
    // Verification Mode: No signature but valid JSON
    if (!signature && isValidJson) {
      return NextResponse.json(
        { ok: true, mode: "verification" },
        { status: 200 }
      );
    }
    
    // Real Webhook Mode: Signature exists - forward to strict handler
    if (signature) {
      // Reconstruct request with same body and headers for handler
      const reconstructedReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: raw,
      });
      
      return shiprocketPostHandler(reconstructedReq);
    }
    
    // Reject Invalid: No signature and invalid JSON
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle GET/HEAD/OPTIONS for Shiprocket verification
 */
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
