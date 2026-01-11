/**
 * Shiprocket Shipping Rate Calculator
 * 
 * Phase 3.1 — Internal shipping cost calculation
 * 
 * This module calculates the INTERNAL shipping cost from Shiprocket
 * that we pay to the carrier. This cost is NOT charged to customers
 * (free shipping) but stored for analytics and margin calculations.
 */

import { authenticate } from "./shiprocket-client";
import { getDefaultWeight, getDefaultDimensions, getDefaultPackage } from "./config";

const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1";

// Default pickup pincode (warehouse location)
const DEFAULT_PICKUP_PINCODE = process.env.SHIPROCKET_PICKUP_PINCODE || "110001";

// Phase 3.4: Use global default package configuration
const DEFAULT_PACKAGE = getDefaultPackage();

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
 * Phase 3.4: Always uses global default weight and dimensions
 * 
 * @param deliveryPincode - Customer's delivery pincode
 * @param weight - Package weight in kg (optional, uses global default 1.5 kg)
 * @param dimensions - Package dimensions (optional, uses global default)
 * @param codPayment - Is this a COD order? (default: false for prepaid)
 * @returns ShippingRateResult with calculated cost
 */
export async function calculateShippingRate(
  deliveryPincode: string,
  weight: number = getDefaultWeight(),
  dimensions?: { length: number; breadth: number; height: number },
  codPayment: boolean = false
): Promise<ShippingRateResult> {
  // Validate pincode
  if (!deliveryPincode || !/^\d{6}$/.test(deliveryPincode)) {
    return {
      success: false,
      shipping_cost: 0,
      error: "Invalid delivery pincode",
    };
  }

  // Phase 3.4: Always use global default dimensions
  const dims = dimensions || getDefaultDimensions();

  try {
    // Authenticate with Shiprocket
    const token = await authenticate();

    // Build query parameters for rate API
    const params = new URLSearchParams({
      pickup_postcode: DEFAULT_PICKUP_PINCODE,
      delivery_postcode: deliveryPincode,
      weight: weight.toString(),
      length: dims.length.toString(),
      breadth: dims.breadth.toString(),
      height: dims.height.toString(),
      cod: codPayment ? "1" : "0",
    });

    // Call Shiprocket Rate API
    const response = await fetch(
      `${SHIPROCKET_BASE_URL}/external/courier/serviceability/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("[SHIPPING_RATE] API response not ok:", response.status);
      // Return 0 as per Phase 3.1 requirements (continue silently)
      return {
        success: false,
        shipping_cost: 0,
        error: `API returned ${response.status}`,
      };
    }

    const data: RateApiResponse = await response.json();

    if (!data.data?.available_courier_companies?.length) {
      console.warn("[SHIPPING_RATE] No couriers available for pincode:", deliveryPincode);
      return {
        success: false,
        shipping_cost: 0,
        error: "No couriers available",
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
    console.error("[SHIPPING_RATE] Error calculating rate:", errorMessage);
    
    // Per Phase 3.1: If Shiprocket API fails, set shipping_cost = 0 and continue silently
    return {
      success: false,
      shipping_cost: 0,
      error: errorMessage,
    };
  }
}

/**
 * Get all available shipping rates for a pincode
 * Useful for admin analytics or future courier selection
 */
export async function getAllShippingRates(
  deliveryPincode: string,
  weight: number = getDefaultWeight(),
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
  if (!deliveryPincode || !/^\d{6}$/.test(deliveryPincode)) {
    return {
      success: false,
      couriers: [],
      error: "Invalid delivery pincode",
    };
  }

  // Phase 3.4: Always use global default dimensions
  const dims = dimensions || getDefaultDimensions();

  try {
    const token = await authenticate();

    const params = new URLSearchParams({
      pickup_postcode: DEFAULT_PICKUP_PINCODE,
      delivery_postcode: deliveryPincode,
      weight: weight.toString(),
      length: dims.length.toString(),
      breadth: dims.breadth.toString(),
      height: dims.height.toString(),
      cod: "0",
    });

    const response = await fetch(
      `${SHIPROCKET_BASE_URL}/external/courier/serviceability/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
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
    return {
      success: false,
      couriers: [],
      error: errorMessage,
    };
  }
}



