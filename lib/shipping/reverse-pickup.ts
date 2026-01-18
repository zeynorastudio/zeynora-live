/**
 * Phase 4.3 — Shiprocket Reverse Pickup
 * Handles reverse pickup (RTO) for return requests
 * 
 * Features:
 * - Auto-retry on 401 with token refresh
 * - No silent failures - all errors logged
 */

import { authenticate, forceTokenRefresh } from "./shiprocket-client";

const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1";

export interface ReversePickupPayload {
  shipment_id: number; // Original shipment ID
  pickup_customer_name: string;
  pickup_customer_phone: string;
  pickup_address: string;
  pickup_address_2?: string;
  pickup_city: string;
  pickup_state: string;
  pickup_pincode: string;
  pickup_country: string;
}

export interface ReversePickupResponse {
  shipment_id: number;
  status: string;
  status_code: number;
  message?: string;
}

/**
 * Create reverse pickup request in Shiprocket
 * Auto-retries with token refresh on 401
 */
export async function createReversePickup(
  payload: ReversePickupPayload
): Promise<ReversePickupResponse> {
  let token = await authenticate();
  let retryCount = 0;
  const maxRetries = 2;

  console.log("[SHIPROCKET_REVERSE_PICKUP_START]", {
    shipment_id: payload.shipment_id,
    timestamp: new Date().toISOString(),
  });

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(`${SHIPROCKET_BASE_URL}/orders/create/return-shipment`, {
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
        console.error("[SHIPROCKET_REVERSE_PICKUP_PARSE_ERROR]", {
          shipment_id: payload.shipment_id,
          response_preview: responseText.substring(0, 200),
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      // Handle 401 - token expired, refresh and retry ONCE
      if (response.status === 401 && retryCount < maxRetries - 1) {
        console.warn("[SHIPROCKET_REVERSE_PICKUP_401]", {
          shipment_id: payload.shipment_id,
          action: "Forcing token refresh and retrying",
          timestamp: new Date().toISOString(),
        });
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }

      if (!response.ok) {
        const errorMsg = (data.message as string) || JSON.stringify(data);
        console.error("[SHIPROCKET_REVERSE_PICKUP_ERROR]", {
          shipment_id: payload.shipment_id,
          status: response.status,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        });
        throw new Error(`Shiprocket reverse pickup error: ${response.status} - ${errorMsg}`);
      }

      console.log("[SHIPROCKET_REVERSE_PICKUP_OK]", {
        shipment_id: payload.shipment_id,
        status: data.status,
        timestamp: new Date().toISOString(),
      });

      return data as unknown as ReversePickupResponse;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If it's a 401 error and we haven't exhausted retries, continue
      if (errorMessage.includes("401") && retryCount < maxRetries - 1) {
        token = await forceTokenRefresh();
        retryCount++;
        continue;
      }
      
      console.error("[SHIPROCKET_REVERSE_PICKUP_ERROR]", {
        shipment_id: payload.shipment_id,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  throw new Error("Reverse pickup failed after retries");
}









