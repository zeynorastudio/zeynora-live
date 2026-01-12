import { NextRequest, NextResponse } from "next/server";
import { POST as shiprocketPostHandler } from "../shiprocket/route";

export const dynamic = "force-dynamic";

/**
 * Production Shiprocket Webhook Route (without "shiprocket" in URL)
 * 
 * Shiprocket blocks URLs containing "shiprocket", so we expose this safe alias.
 * Public entry point for Shiprocket webhooks.
 * 
 * Logic:
 * - GET/HEAD/OPTIONS → always return 200 (verification)
 * - POST + JSON + no signature → verification mode (200)
 * - POST + signature → forward to strict handler for verification
 * - POST + invalid → 401
 */
export async function POST(req: NextRequest) {
  try {
    // 1) Read raw body safely
    let raw = "";
    try {
      raw = await req.text();
    } catch {
      raw = "";
    }

    // 2) Try JSON.parse
    let isJson = false;
    try {
      if (raw.trim()) {
        JSON.parse(raw);
        isJson = true;
      }
    } catch {
      isJson = false;
    }

    // 3) Read signature headers
    const sig =
      req.headers.get("x-shiprocket-signature") ||
      req.headers.get("x-api-key");

    // 4) Verification Mode: No signature + valid JSON = Shiprocket TEST
    if (!sig && isJson) {
      console.log("Shiprocket verification accepted");
      return NextResponse.json(
        { ok: true, mode: "verification" },
        { status: 200 }
      );
    }

    // 5) Real Webhook Mode: Signature exists - forward to strict handler
    if (sig) {
      // Reconstruct request with same body and headers
      const reconstructedReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: raw,
      });

      return await shiprocketPostHandler(reconstructedReq);
    }

    // 6) Invalid Request: No signature and invalid JSON
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

  } catch (error: any) {
    // Safety: Always return a response
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
