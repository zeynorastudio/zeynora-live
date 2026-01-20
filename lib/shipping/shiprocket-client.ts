/**
 * Shiprocket API Client Wrapper
 * Handles authentication, order creation, AWB generation, and webhook verification
 * 
 * FINAL IMPLEMENTATION: Token management with auto-refresh
 * - Uses SHIPROCKET_AUTH_URL directly
 * - Stores token with expiry time
 * - Auto re-auth on expiry
 * - Never fails silently - all errors logged
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// Environment configuration - direct URLs, no duplicate building
const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1";
const SHIPROCKET_AUTH_URL = process.env.SHIPROCKET_AUTH_URL || `${SHIPROCKET_BASE_URL}/external/auth/login`;
const SHIPROCKET_ORDER_CREATE_URL = process.env.SHIPROCKET_ORDER_CREATE_URL || `${SHIPROCKET_BASE_URL}/external/orders/create/adhoc`;
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION;

// In-memory token cache for same-process reuse (fallback if DB unavailable)
let cachedToken: { token: string; expiresAt: number } | null = null;

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
  order_id?: number;
  shipment_id?: number | null;
  status?: string;
  status_code: number; // HTTP status code from API
  awb_code?: string | null;
  courier_name?: string | null;
  courier_company_id?: number | null;
  tracking_url?: string | null;
  expected_delivery_date?: string | null;
  raw_response?: string; // Raw JSON response for debugging
  error_message?: string; // Error message if API call failed
}

/**
 * Check if in-memory cached token is still valid
 * Returns false if expired or about to expire
 */
function isCachedTokenValid(): boolean {
  if (!cachedToken) return false;
  // Add 5 minute buffer before expiry
  const bufferMs = 5 * 60 * 1000;
  const isValid = Date.now() < cachedToken.expiresAt - bufferMs;
  
  if (!isValid && cachedToken) {
    console.log("[SHIPROCKET_TOKEN_EXPIRED]", {
      timestamp: new Date().toISOString(),
      expired_at: new Date(cachedToken.expiresAt).toISOString(),
      current_time: new Date().toISOString(),
    });
  }
  
  return isValid;
}

/**
 * Validate all required Shiprocket environment variables
 * Returns validation result with missing variables list
 */
export function validateShiprocketEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!SHIPROCKET_AUTH_URL) missing.push("SHIPROCKET_AUTH_URL");
  if (!SHIPROCKET_ORDER_CREATE_URL) missing.push("SHIPROCKET_ORDER_CREATE_URL");
  if (!SHIPROCKET_EMAIL) missing.push("SHIPROCKET_EMAIL");
  if (!SHIPROCKET_PASSWORD) missing.push("SHIPROCKET_PASSWORD");
  if (!SHIPROCKET_PICKUP_LOCATION) missing.push("SHIPROCKET_PICKUP_LOCATION");
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get valid Shiprocket token - auto-refresh if expired
 * 
 * Flow:
 * 1. Check in-memory cache (fastest)
 * 2. Check database stored token
 * 3. If both expired/missing → regenerate from Shiprocket
 * 
 * Logging:
 * - SHIPROCKET_AUTH_START: Before auth attempt
 * - SHIPROCKET_AUTH_OK: Successful authentication
 * - SHIPROCKET_AUTH_FAIL: Authentication failed
 */
export async function authenticate(): Promise<string> {
  // Step 1: Check in-memory cache first
  if (isCachedTokenValid() && cachedToken) {
    return cachedToken.token;
  }

  const supabase = createServiceRoleClient();

  // Step 2: Try to get valid token from database
  try {
    const { data: tokenData, error: tokenError } = await supabase
      .rpc("get_shiprocket_token");

    if (!tokenError && tokenData) {
      // Cache the token in memory
      cachedToken = {
        token: tokenData,
        // Assume 20 hours validity if not stored
        expiresAt: Date.now() + 20 * 60 * 60 * 1000,
      };
      return tokenData;
    }
  } catch (dbError) {
    // DB check failed - continue to regenerate
    console.warn("[SHIPROCKET_AUTH] DB token fetch failed, will regenerate:", 
      dbError instanceof Error ? dbError.message : "Unknown error");
  }

  // Step 3: Token expired or doesn't exist - regenerate
  // Validate ENV before proceeding
  const envValidation = validateShiprocketEnv();
  if (!envValidation.valid) {
    console.error("[SHIPROCKET_ENV_MISSING]", {
      missing: envValidation.missing,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Shiprocket environment variables missing: ${envValidation.missing.join(", ")}`
    );
  }

  // Log auth start with masked email
  const maskedEmail = SHIPROCKET_EMAIL ? SHIPROCKET_EMAIL.substring(0, 3) + "***" : "***";
  console.log("[SHIPROCKET_AUTH_START]", {
    timestamp: new Date().toISOString(),
    auth_url: SHIPROCKET_AUTH_URL,
    email: maskedEmail,
  });

  try {
    // Use SHIPROCKET_AUTH_URL directly - no duplicate URL building
    const response = await fetch(SHIPROCKET_AUTH_URL, {
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
      console.error("[SHIPROCKET_AUTH_FAIL]", {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: errorText.substring(0, 200),
      });
      throw new Error(`Shiprocket auth failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as ShiprocketAuthResponse;
    
    if (!data.token) {
      console.error("[SHIPROCKET_AUTH_FAIL] No token in response");
      throw new Error("Shiprocket auth response missing token");
    }

    // Calculate expiry time (default 20 hours = 72000 seconds)
    const expiresInSeconds = data.expires_in || 72000;
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    // Log auth success
    console.log("[SHIPROCKET_AUTH_OK]", {
      timestamp: new Date().toISOString(),
      expires_in_hours: Math.round(expiresInSeconds / 3600),
    });

    // Cache in memory
    cachedToken = {
      token: data.token,
      expiresAt,
    };

    // Store token in database with expiry (non-blocking)
    try {
      const { error: storeError } = await supabase.rpc("store_shiprocket_token", {
        p_token: data.token,
        p_expires_in_seconds: expiresInSeconds,
      });

      if (storeError) {
        console.warn("[SHIPROCKET_AUTH] Token storage failed (non-fatal):", storeError.message);
      }
    } catch (storeException) {
      // Non-fatal - token is still valid for this request
      console.warn("[SHIPROCKET_AUTH] Token storage exception (non-fatal):", 
        storeException instanceof Error ? storeException.message : "Unknown error");
    }

    return data.token;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[SHIPROCKET_AUTH_FAIL]", {
      timestamp: new Date().toISOString(),
      error: errorMessage,
    });
    throw new Error(`Failed to authenticate with Shiprocket: ${errorMessage}`);
  }
}

/**
 * Force token refresh - clears cache and re-authenticates
 * Useful when API returns 401 or token appears invalid
 * 
 * Logging:
 * - SHIPROCKET_TOKEN_REFRESH_START: Before refresh attempt
 * - SHIPROCKET_TOKEN_REFRESH_OK: Successful refresh
 * - SHIPROCKET_TOKEN_REFRESH_FAIL: Refresh failed
 */
export async function forceTokenRefresh(): Promise<string> {
  console.log("[SHIPROCKET_TOKEN_REFRESH_START]", {
    timestamp: new Date().toISOString(),
    reason: "Force refresh triggered (likely 401 or expired token)",
  });

  // Clear in-memory cache
  cachedToken = null;
  
  // Clear DB stored token
  const supabase = createServiceRoleClient();
  try {
    await supabase.rpc("clear_shiprocket_token");
  } catch (e) {
    // Non-fatal
    console.warn("[SHIPROCKET_AUTH] Token clear failed (non-fatal)");
  }

  try {
    // Re-authenticate
    const newToken = await authenticate();
    
    console.log("[SHIPROCKET_TOKEN_REFRESH_OK]", {
      timestamp: new Date().toISOString(),
      token_prefix: newToken.substring(0, 10) + "...",
    });
    
    return newToken;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("[SHIPROCKET_TOKEN_REFRESH_FAIL]", {
      timestamp: new Date().toISOString(),
      error: errorMessage,
    });
    
    throw error;
  }
}

/**
 * Create order in Shiprocket and request AWB
 * Auto-retries with token refresh on 401
 * 
 * Behavior on 401:
 * - Force refresh token once
 * - Retry once
 * - If still fails → throw error (caller marks FAILED)
 */
export async function createShiprocketOrder(
  payload: ShiprocketOrderPayload
): Promise<ShiprocketOrderResponse> {
  let token = await authenticate();
  let retryCount = 0;
  const maxRetries = 2;

  console.log("[SHIPROCKET_ORDER_CREATE_START]", {
    order_id: payload.order_id,
    timestamp: new Date().toISOString(),
  });

  while (retryCount < maxRetries) {
    try {
      // Use SHIPROCKET_ORDER_CREATE_URL directly from ENV - never build URL
      const response = await fetch(SHIPROCKET_ORDER_CREATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: Record<string, unknown>;

      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
      } catch (parseError) {
        console.error("[SHIPROCKET_ORDER_CREATE_PARSE_ERROR]", {
          order_id: payload.order_id,
          response_preview: responseText.substring(0, 200),
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      // Handle 401 - token expired, refresh and retry ONCE
      if (response.status === 401) {
        console.warn("[SHIPROCKET_401_RECEIVED]", {
          order_id: payload.order_id,
          retry_count: retryCount,
          max_retries: maxRetries,
          timestamp: new Date().toISOString(),
        });

        if (retryCount < maxRetries - 1) {
          console.log("[SHIPROCKET_401_RETRY]", {
            order_id: payload.order_id,
            action: "Forcing token refresh and retrying",
            timestamp: new Date().toISOString(),
          });
          token = await forceTokenRefresh();
          retryCount++;
          continue;
        } else {
          // Exhausted retries - throw
          console.error("[SHIPROCKET_401_EXHAUSTED]", {
            order_id: payload.order_id,
            message: "Token refresh did not resolve 401 - marking as FAILED",
            timestamp: new Date().toISOString(),
          });
          throw new Error("Shiprocket API returned 401 after token refresh - authentication failed");
        }
      }

      // Log raw response for debugging
      console.log("[SHIPROCKET_RESPONSE_RAW]", {
        order_id: payload.order_id,
        http_status: response.status,
        raw_response: responseText.substring(0, 500), // First 500 chars for logging
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorMsg = (data.message as string) || JSON.stringify(data);
        console.error("[SHIPROCKET_ORDER_CREATE_API_ERROR]", {
          order_id: payload.order_id,
          status: response.status,
          error: errorMsg,
          raw_response: responseText,
          timestamp: new Date().toISOString(),
        });
        
        // Return error response with status_code and raw_response
        return {
          status_code: response.status,
          error_message: errorMsg,
          raw_response: responseText,
          shipment_id: null,
          awb_code: null,
        } as ShiprocketOrderResponse;
      }

      // Parse response defensively - handle different Shiprocket response shapes
      const parsedResponse = parseShiprocketResponse(data, response.status, responseText);
      
      console.log("[SHIPROCKET_PARSE_RESULT]", {
        order_id: payload.order_id,
        http_status: response.status,
        shipment_id: parsedResponse.shipment_id,
        awb_code: parsedResponse.awb_code,
        has_shipment_id: !!parsedResponse.shipment_id,
        has_awb_code: !!parsedResponse.awb_code,
        timestamp: new Date().toISOString(),
      });

      return parsedResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If it's a 401 error and we haven't exhausted retries, continue
      if (errorMessage.includes("401") && retryCount < maxRetries - 1) {
        console.warn("[SHIPROCKET_401_CAUGHT_IN_CATCH]", {
          order_id: payload.order_id,
          retry_count: retryCount,
          timestamp: new Date().toISOString(),
        });
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }
      
      console.error("[SHIPROCKET_ORDER_CREATE_ERROR]", {
        order_id: payload.order_id,
        error: errorMessage,
        retry_count: retryCount,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  console.error("[SHIPROCKET_ORDER_CREATE_EXHAUSTED]", {
    order_id: payload.order_id,
    message: "All retries exhausted",
    timestamp: new Date().toISOString(),
  });
  throw new Error("Shiprocket order creation failed after retries");
}

/**
 * Generate AWB for existing shipment
 * Auto-retries with token refresh on 401
 */
export async function generateAWB(shipmentId: number): Promise<ShiprocketOrderResponse> {
  let token = await authenticate();
  let retryCount = 0;
  const maxRetries = 2;

  console.log("[SHIPROCKET_AWB_GENERATE_START]", {
    shipment_id: shipmentId,
    timestamp: new Date().toISOString(),
  });

  while (retryCount < maxRetries) {
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

      // Handle 401 - token expired, refresh and retry ONCE
      if (response.status === 401 && retryCount < maxRetries - 1) {
        console.warn("[SHIPROCKET_AWB_401_RECEIVED]", {
          shipment_id: shipmentId,
          action: "Forcing token refresh and retrying",
          timestamp: new Date().toISOString(),
        });
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SHIPROCKET_AWB_GENERATE_ERROR]", {
          shipment_id: shipmentId,
          status: response.status,
          error: errorText.substring(0, 200),
          timestamp: new Date().toISOString(),
        });
        throw new Error(`AWB generation failed: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as ShiprocketOrderResponse;
      
      console.log("[SHIPROCKET_AWB_GENERATE_OK]", {
        shipment_id: shipmentId,
        awb_code: data.awb_code,
        timestamp: new Date().toISOString(),
      });

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If it's a 401 error and we haven't exhausted retries, continue
      if (errorMessage.includes("401") && retryCount < maxRetries - 1) {
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }
      
      console.error("[SHIPROCKET_AWB_GENERATE_ERROR]", {
        shipment_id: shipmentId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  throw new Error("AWB generation failed after retries");
}

/**
 * Shipment tracking response type
 */
export interface ShipmentTrackingResponse {
  order_id?: number;
  shipment_id?: number;
  status?: string;
  status_code?: number;
  awb_code?: string;
  courier_name?: string;
  tracking?: Array<{
    date: string;
    activity: string;
    location?: string;
  }>;
  [key: string]: unknown;
}

/**
 * Fetch shipment tracking details
 * Auto-retries with token refresh on 401
 */
export async function getShipmentTracking(shipmentId: number): Promise<ShipmentTrackingResponse> {
  let token = await authenticate();
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`${SHIPROCKET_BASE_URL}/external/orders/show/${shipmentId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle 401 - token expired, refresh and retry ONCE
      if (response.status === 401 && retryCount < maxRetries - 1) {
        console.warn("[SHIPROCKET_TRACKING_401]", {
          shipment_id: shipmentId,
          action: "Forcing token refresh and retrying",
          timestamp: new Date().toISOString(),
        });
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[SHIPROCKET_TRACKING_ERROR]", {
          shipment_id: shipmentId,
          status: response.status,
          error: errorText.substring(0, 200),
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Tracking fetch failed: ${response.status} ${errorText}`);
      }

      return await response.json() as ShipmentTrackingResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If it's a 401 error and we haven't exhausted retries, continue
      if (errorMessage.includes("401") && retryCount < maxRetries - 1) {
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }
      
      console.error("[SHIPROCKET_TRACKING_ERROR]", {
        shipment_id: shipmentId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  throw new Error("Tracking fetch failed after retries");
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
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 4xx errors (client errors) except 401
      if (lastError.message?.includes("4") && !lastError.message?.includes("401")) {
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
