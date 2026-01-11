/**
 * Shipping Serviceability Helper Functions
 * Pure helper functions for serviceability checks
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { authenticate } from "./shiprocket-client";
import { getDefaultWeight } from "./config";

const METRO_PINCODE_PREFIXES = ["11", "40", "56", "50", "60", "70", "41", "38", "30", "39"];

interface ServiceabilityResult {
  serviceable: boolean;
  available_couriers: string[];
  cod_available: boolean;
  estimated_delivery_range: {
    min_days: number;
    max_days: number;
  };
  reason?: string;
}

/**
 * Check pincode serviceability
 */
export async function checkServiceability(
  pincode: string,
  weight: number = getDefaultWeight()
): Promise<ServiceabilityResult> {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    return {
      serviceable: false,
      available_couriers: [],
      cod_available: false,
      estimated_delivery_range: { min_days: 0, max_days: 0 },
      reason: "Invalid pincode format",
    };
  }

  const supabase = createServiceRoleClient();

  // Check blocked pincodes from settings
  const { data: settingsData } = await supabase
    .from("shipping_settings")
    .select("blocked_pincodes")
    .single();

  const settings = settingsData as { blocked_pincodes?: string[] } | null;
  const blockedPincodes = (settings?.blocked_pincodes as string[]) || [];

  if (blockedPincodes.includes(pincode)) {
    return {
      serviceable: false,
      available_couriers: [],
      cod_available: false,
      estimated_delivery_range: { min_days: 0, max_days: 0 },
      reason: "Pincode is blocked",
    };
  }

  // Try Shiprocket API if credentials available
  const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
  const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;

  if (SHIPROCKET_EMAIL && SHIPROCKET_PASSWORD) {
    try {
      const token = await authenticate();
      const response = await fetch(
        `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_pincode=110001&delivery_pincode=${pincode}&weight=${weight}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const availableCouriers = data.data?.available_courier_companies || [];

        if (availableCouriers.length > 0) {
          return {
            serviceable: true,
            available_couriers: availableCouriers.map((c: any) => c.courier_name || c.name),
            cod_available: availableCouriers.some(
              (c: any) => c.cod === true || c.cod_available === true
            ),
            estimated_delivery_range: calculateETA(pincode),
          };
        }
      }
    } catch (apiError) {
      console.error("Shiprocket API error, using fallback:", apiError);
      // Fall through to fallback logic
    }
  }

  // Fallback: Demo logic
  const invalidPatterns = ["000000", "111111", "999999"];
  if (invalidPatterns.includes(pincode)) {
    return {
      serviceable: false,
      available_couriers: [],
      cod_available: false,
      estimated_delivery_range: { min_days: 0, max_days: 0 },
      reason: "Invalid pincode pattern",
    };
  }

  // Default: Serviceable
  return {
    serviceable: true,
    available_couriers: ["Blue Dart", "FedEx", "DTDC", "Delhivery"],
    cod_available: true,
    estimated_delivery_range: calculateETA(pincode),
  };
}

/**
 * Calculate ETA based on pincode
 */
function calculateETA(pincode: string): { min_days: number; max_days: number } {
  const pincodePrefix = pincode.substring(0, 2);
  const isMetro = METRO_PINCODE_PREFIXES.includes(pincodePrefix);
  const originIsMetro = true; // Assume origin is metro

  if (originIsMetro && isMetro) {
    return { min_days: 2, max_days: 4 };
  } else if (originIsMetro && !isMetro) {
    return { min_days: 4, max_days: 6 };
  } else {
    return { min_days: 6, max_days: 9 };
  }
}























