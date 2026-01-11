/**
 * Phase 4.3 — Shiprocket Reverse Pickup
 * Handles reverse pickup (RTO) for return requests
 */

import { authenticate } from "./shiprocket-client";

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
 */
export async function createReversePickup(
  payload: ReversePickupPayload
): Promise<ReversePickupResponse> {
  const token = await authenticate();

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
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(
        `Shiprocket reverse pickup error: ${response.status} - ${data.message || JSON.stringify(data)}`
      );
    }

    return data as ReversePickupResponse;
  } catch (error: any) {
    console.error("Shiprocket reverse pickup error:", error);
    throw error;
  }
}









