/**
 * FINAL — Shiprocket Shipping Rate Calculator
 * 
 * Calculates the INTERNAL shipping cost from Shiprocket.
 * This cost is NOT charged to customers (free shipping) but stored for analytics.
 * 
 * Uses:
 * - Global default weight and dimensions from config
 * - Shiprocket Rate API for courier availability and pricing
 * 
 * Returns:
 * - shipping_cost: Lowest available rate
 * - courier_name: Name of cheapest courier
 * - estimated_days: Delivery estimate
 */

import { authenticate, forceTokenRefresh, validateShiprocketEnv } from "./shiprocket-client";
import { getDefaultWeight, getDefaultDimensions } from "./config";

// Use SHIPROCKET_RATE_URL directly from ENV - never build URL
const SHIPROCKET_RATE_URL = process.env.SHIPROCKET_RATE_URL || "https://apiv2.shiprocket.in/v1/external/courier/serviceability/";

// Default pickup pincode (warehouse location)
const DEFAULT_PICKUP_PINCODE = process.env.SHIPROCKET_PICKUP_PINCODE || "110001";

interface ShippingRateResult {
  success: boolean;
  shipping_cost: number;
  courier_name?: string;
  courier_company_id?: number;
  estimated_days?: number;
  rate_id?: string;
  error?: string;
}

interface CourierData {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  freight_charge: number;
  cod_charges?: number;
  estimated_delivery_days: number;
  etd?: string;
  city?: string;
  state?: string;
  min_weight?: number;
  suppress_date?: string;
}

interface RateApiResponse {
  status: number;
  data: {
    available_courier_companies: CourierData[];
    currency?: string;
    recommended_courier_company_id?: number;
  };
}

/**
 * Calculate shipping cost using Shiprocket Rate API
 * 
 * Uses global default weight and dimensions from config.
 * 
 * @param deliveryPincode - Customer's delivery pincode (6 digits)
 * @param weight - Package weight in kg (optional, uses global default)
 * @param dimensions - Package dimensions (optional, uses global default)
 * @param codPayment - Is this a COD order? (default: false for prepaid)
 * @returns ShippingRateResult with calculated cost
 */
export async function calculateShippingRate(
  deliveryPincode: string,
  weight?: number,
  dimensions?: { length: number; breadth: number; height: number },
  codPayment: boolean = false
): Promise<ShippingRateResult> {
  // Validate ENV before proceeding
  const envValidation = validateShiprocketEnv();
  if (!envValidation.valid) {
    console.error("[SHIPROCKET_ENV_MISSING]", {
      missing: envValidation.missing,
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      shipping_cost: 0,
      error: `CONFIG_ERROR: Missing environment variables: ${envValidation.missing.join(", ")}`,
    };
  }

  // Validate pincode (6 digits)
  const cleanPincode = (deliveryPincode || "").replace(/\D/g, "");
  if (!cleanPincode || !/^\d{6}$/.test(cleanPincode)) {
    return {
      success: false,
      shipping_cost: 0,
      error: "Invalid delivery pincode - must be 6 digits",
    };
  }

  // Use global defaults from config (ENV-based)
  const shipmentWeight = weight || getDefaultWeight();
  const shipmentDimensions = dimensions || getDefaultDimensions();

  let token: string;
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount < maxRetries) {
    try {
      // Authenticate with Shiprocket
      token = await authenticate();

      // Call Shiprocket Rate API - use SHIPROCKET_RATE_URL directly from ENV
      const rateUrl = new URL(SHIPROCKET_RATE_URL);
      // Append query params to the URL
      Object.entries({
        pickup_postcode: DEFAULT_PICKUP_PINCODE,
        delivery_postcode: cleanPincode,
        weight: shipmentWeight.toString(),
        length: shipmentDimensions.length.toString(),
        breadth: shipmentDimensions.breadth.toString(),
        height: shipmentDimensions.height.toString(),
        cod: codPayment ? "1" : "0",
      }).forEach(([key, value]) => {
        rateUrl.searchParams.append(key, value);
      });

      const response = await fetch(rateUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle 401 - token expired, refresh and retry ONCE
      if (response.status === 401 && retryCount < maxRetries - 1) {
        console.warn("[SHIPPING_RATE_401]", {
          pincode: cleanPincode,
          action: "Forcing token refresh and retrying",
          timestamp: new Date().toISOString(),
        });
        await forceTokenRefresh();
        retryCount++;
        continue;
      }

      if (!response.ok) {
        console.error("[SHIPPING_RATE_API_ERROR]", {
          pincode: cleanPincode,
          status: response.status,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          shipping_cost: 0,
          error: `API returned ${response.status}`,
        };
      }

      const data: RateApiResponse = await response.json();

      if (!data.data?.available_courier_companies?.length) {
        console.warn("[SHIPPING_RATE_NO_COURIERS]", {
          pincode: cleanPincode,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          shipping_cost: 0,
          error: "No couriers available for this pincode",
        };
      }

      // Get the cheapest available courier
      const couriers = data.data.available_courier_companies;
      const cheapestCourier = couriers.reduce((min, curr) => 
        (curr.freight_charge || curr.rate) < (min.freight_charge || min.rate) ? curr : min
      );

      // Calculate total shipping cost (freight + COD if applicable)
      const freightCharge = cheapestCourier.freight_charge || cheapestCourier.rate || 0;
      const codCharge = codPayment ? (cheapestCourier.cod_charges || 0) : 0;
      const totalShippingCost = freightCharge + codCharge;

      return {
        success: true,
        shipping_cost: totalShippingCost,
        courier_name: cheapestCourier.courier_name,
        courier_company_id: cheapestCourier.courier_company_id,
        estimated_days: cheapestCourier.estimated_delivery_days,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If it's a 401 error and we haven't exhausted retries, continue
      if (errorMessage.includes("401") && retryCount < maxRetries - 1) {
        console.warn("[SHIPPING_RATE_401_CAUGHT]", {
          pincode: cleanPincode,
          retry_count: retryCount,
          timestamp: new Date().toISOString(),
        });
        await forceTokenRefresh();
        retryCount++;
        continue;
      }
      
      console.error("[SHIPPING_RATE_ERROR]", {
        pincode: cleanPincode,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      
      // Return 0 cost and continue - don't block order flow
      return {
        success: false,
        shipping_cost: 0,
        error: errorMessage,
      };
    }
  }

  // Should not reach here, but return failure if we do
  return {
    success: false,
    shipping_cost: 0,
    error: "Rate calculation failed after retries",
  };
}

/**
 * Get all available shipping rates for a pincode
 * Useful for admin analytics or future courier selection
 */
export async function getAllShippingRates(
  deliveryPincode: string,
  weight?: number,
  dimensions?: { length: number; breadth: number; height: number }
): Promise<{
  success: boolean;
  couriers: Array<{
    courier_name: string;
    courier_company_id: number;
    shipping_cost: number;
    estimated_days: number;
  }>;
  error?: string;
}> {
  const cleanPincode = (deliveryPincode || "").replace(/\D/g, "");
  if (!cleanPincode || !/^\d{6}$/.test(cleanPincode)) {
    return {
      success: false,
      couriers: [],
      error: "Invalid delivery pincode",
    };
  }

  // Use global defaults from config
  const shipmentWeight = weight || getDefaultWeight();
  const shipmentDimensions = dimensions || getDefaultDimensions();

  let token: string;
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount < maxRetries) {
    try {
      token = await authenticate();

      // Call Shiprocket Rate API - use SHIPROCKET_RATE_URL directly from ENV
      const rateUrl = new URL(SHIPROCKET_RATE_URL);
      // Append query params to the URL
      Object.entries({
        pickup_postcode: DEFAULT_PICKUP_PINCODE,
        delivery_postcode: cleanPincode,
        weight: shipmentWeight.toString(),
        length: shipmentDimensions.length.toString(),
        breadth: shipmentDimensions.breadth.toString(),
        height: shipmentDimensions.height.toString(),
        cod: "0",
      }).forEach(([key, value]) => {
        rateUrl.searchParams.append(key, value);
      });

      const response = await fetch(rateUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle 401 - token expired, refresh and retry ONCE
      if (response.status === 401 && retryCount < maxRetries - 1) {
        console.warn("[SHIPPING_ALL_RATES_401]", {
          pincode: cleanPincode,
          action: "Forcing token refresh and retrying",
          timestamp: new Date().toISOString(),
        });
        await forceTokenRefresh();
        retryCount++;
        continue;
      }

      if (!response.ok) {
        console.error("[SHIPPING_ALL_RATES_API_ERROR]", {
          pincode: cleanPincode,
          status: response.status,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          couriers: [],
          error: `API returned ${response.status}`,
        };
      }

      const data: RateApiResponse = await response.json();

      if (!data.data?.available_courier_companies?.length) {
        return {
          success: false,
          couriers: [],
          error: "No couriers available",
        };
      }

      const couriers = data.data.available_courier_companies.map((c) => ({
        courier_name: c.courier_name,
        courier_company_id: c.courier_company_id,
        shipping_cost: c.freight_charge || c.rate || 0,
        estimated_days: c.estimated_delivery_days,
      }));

      // Sort by cost (cheapest first)
      couriers.sort((a, b) => a.shipping_cost - b.shipping_cost);

      return {
        success: true,
        couriers,
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // If it's a 401 error and we haven't exhausted retries, continue
      if (errorMessage.includes("401") && retryCount < maxRetries - 1) {
        console.warn("[SHIPPING_ALL_RATES_401_CAUGHT]", {
          pincode: cleanPincode,
          retry_count: retryCount,
          timestamp: new Date().toISOString(),
        });
        await forceTokenRefresh();
        retryCount++;
        continue;
      }
      
      console.error("[SHIPPING_ALL_RATES_ERROR]", {
        pincode: cleanPincode,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      
      return {
        success: false,
        couriers: [],
        error: errorMessage,
      };
    }
  }

  // Should not reach here, but return failure if we do
  return {
    success: false,
    couriers: [],
    error: "Rate calculation failed after retries",
  };
}
