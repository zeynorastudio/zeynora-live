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
    let parsed = null;
    let isJson = false;
    try {
      if (raw.trim()) {
        parsed = JSON.parse(raw);
        isJson = true;
      }
    } catch {
      isJson = false;
    }

    // 3) Extract headers separately
    const sig = req.headers.get("x-shiprocket-signature");
    const token = req.headers.get("x-api-key");

    // 4) Determine if this is a TEST webhook
    const isTest =
      isJson &&
      (
        !sig ||
        parsed?.event === "test" ||
        parsed?.type === "test" ||
        parsed?.message?.toLowerCase()?.includes("test") ||
        parsed?.data == null
      );

    // 5) Test/Verification Mode: Accept test webhooks even with token
    if (isTest) {
      console.log("Shiprocket test/verification accepted");
      return NextResponse.json(
        { ok: true, mode: "verification" },
        { status: 200 }
      );
    }

    // 6) Real Webhook Mode: Signature exists - forward to strict handler
    if (sig) {
      // Reconstruct request with same body and headers
      const reconstructedReq = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: raw,
      });

      return await shiprocketPostHandler(reconstructedReq);
    }

    // 7) Invalid Request: No signature and not a test
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
