/**
 * Shiprocket API Client Wrapper
 * Handles authentication, order creation, AWB generation, and webhook verification
 * Phase 3.3: Token management with database storage and auto-regeneration
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1";
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

/**
 * SHIPROCKET_API_KEY and SHIPROCKET_API_SECRET
 * 
 * Reserved for future authentication modes.
 * Currently, Shiprocket authentication uses email/password (SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD).
 * These API key variables are not currently used in the codebase.
 * 
 * Safe to ignore - they are reserved for potential future API key-based authentication.
 * DO NOT remove these variables as they may be needed for future Shiprocket API changes.
 */
const SHIPROCKET_API_KEY = process.env.SHIPROCKET_API_KEY;
const SHIPROCKET_API_SECRET = process.env.SHIPROCKET_API_SECRET;

interface ShiprocketAuthResponse {
  token: string;
  expires_in?: number;
}

export interface ShiprocketOrderPayload {
  order_id: string;
  order_date: string;
  pickup_location: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name: string;
  shipping_last_name?: string;
  shipping_address: string;
  shipping_address_2?: string;
  shipping_city: string;
  shipping_pincode: string;
  shipping_state: string;
  shipping_country: string;
  shipping_email: string;
  shipping_phone: string;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  }>;
  payment_method: string; // "Prepaid" or "COD"
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface ShiprocketOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  awb_code?: string;
  courier_name?: string;
  courier_company_id?: number;
  tracking_url?: string;
  expected_delivery_date?: string;
}

/**
 * Get valid Shiprocket token from database or regenerate if expired
 * Phase 3.3: Automatic token management with database storage
 */
export async function authenticate(): Promise<string> {
  const supabase = createServiceRoleClient();

  // Try to get valid token from database
  const { data: tokenData, error: tokenError } = await supabase
    .rpc("get_shiprocket_token");

  if (!tokenError && tokenData) {
    return tokenData;
  }

  // Token expired or doesn't exist - regenerate
  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    throw new Error(
      "Shiprocket credentials missing. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables."
    );
  }

  try {
    const response = await fetch(`${SHIPROCKET_BASE_URL}/external/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shiprocket auth failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as ShiprocketAuthResponse;
    
    if (!data.token) {
      throw new Error("Shiprocket auth response missing token");
    }

    // Store token in database with expiry
    const expiresInSeconds = data.expires_in || 72000; // Default 20 hours
    const { error: storeError } = await supabase.rpc("store_shiprocket_token", {
      p_token: data.token,
      p_expires_in_seconds: expiresInSeconds,
    });

    if (storeError) {
      console.error("Failed to store Shiprocket token:", storeError);
      // Continue anyway - token is still valid for this request
    }

    return data.token;
  } catch (error: any) {
    console.error("Shiprocket authentication error:", error);
    throw new Error(`Failed to authenticate with Shiprocket: ${error.message}`);
  }
}

/**
 * Create order in Shiprocket and request AWB
 */
export async function createShiprocketOrder(
  payload: ShiprocketOrderPayload
): Promise<ShiprocketOrderResponse> {
  const token = await authenticate();

  // Log after auth token
  console.log("SHIPROCKET_TOKEN_OK");

  try {
    const response = await fetch(`${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(
        `Shiprocket API error: ${response.status} - ${data.message || JSON.stringify(data)}`
      );
    }

    return data as ShiprocketOrderResponse;
  } catch (error: any) {
    console.error("Shiprocket order creation error:", error);
    throw error;
  }
}

/**
 * Generate AWB for existing shipment
 */
export async function generateAWB(shipmentId: number): Promise<ShiprocketOrderResponse> {
  const token = await authenticate();

  try {
    const response = await fetch(`${SHIPROCKET_BASE_URL}/external/courier/assign/awb`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipment_id: shipmentId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AWB generation failed: ${response.status} ${errorText}`);
    }

    return (await response.json()) as ShiprocketOrderResponse;
  } catch (error: any) {
    console.error("AWB generation error:", error);
    throw error;
  }
}

/**
 * Fetch shipment tracking details
 */
export async function getShipmentTracking(shipmentId: number): Promise<any> {
  const token = await authenticate();

  try {
    const response = await fetch(`${SHIPROCKET_BASE_URL}/external/orders/show/${shipmentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tracking fetch failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error("Tracking fetch error:", error);
    throw error;
  }
}

/**
 * Verify webhook signature (if Shiprocket provides one)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;

  if (!secret) {
    console.warn("SHIPROCKET_WEBHOOK_SECRET not set - webhook signature verification skipped");
    return true; // Allow if secret not configured (dev mode)
  }

  if (!signature) {
    return false;
  }

  // Shiprocket typically uses HMAC SHA256
  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Retry helper with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors)
      if (error.message?.includes("4")) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Retry failed");
}

