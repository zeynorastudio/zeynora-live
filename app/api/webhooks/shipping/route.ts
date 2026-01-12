import { NextRequest, NextResponse } from "next/server";
import { POST as shiprocketPostHandler } from "../shiprocket/route";

export const dynamic = "force-dynamic";

/**
 * Forward real Shiprocket webhook to strict handler for signature verification
 */
async function handleRealShiprocketWebhook(req: NextRequest, raw: string) {
  try {
    // Reconstruct request with same body and headers for handler
    const reconstructedReq = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: raw,
    });
    
    return await shiprocketPostHandler(reconstructedReq);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

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
  let raw = "";
  try {
    raw = await req.text();
  } catch {
    // If body read fails, treat as empty
    raw = "";
  }

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

  const signature =
    req.headers.get("x-shiprocket-signature") ||
    req.headers.get("x-api-key");

  // 1) VERIFICATION MODE
  if (!signature && isJson) {
    console.log("Shiprocket verification accepted");
    return new Response(JSON.stringify({ ok: true, mode: "verification" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  // 2) REAL WEBHOOK MODE
  if (signature) {
    // forward to existing strict handler
    return await handleRealShiprocketWebhook(req, raw);
  }

  // 3) INVALID REQUEST
  return new Response("Unauthorized", { status: 401 });
}

/**
 * Handle GET/HEAD/OPTIONS for Shiprocket verification
 */
export async function GET() {
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, { status: 200 });
}
