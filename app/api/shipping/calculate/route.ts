import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ShippingCalculationResponse {
  shipping_fee: number;
  estimated_delivery_range: {
    min_days: number;
    max_days: number;
  };
  free_shipping_applied: boolean;
  calculation_method: string;
}

/**
 * Calculate shipping fee based on pincode, order total, and admin settings
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pincode, order_total, weight } = body;

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Invalid pincode. Must be 6 digits." },
        { status: 400 }
      );
    }

    if (typeof order_total !== "number" || order_total < 0) {
      return NextResponse.json(
        { error: "Invalid order_total. Must be a positive number." },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch shipping settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("shipping_settings")
      .select("*")
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is OK for first-time setup
      console.error("Settings fetch error:", settingsError);
    }

    const settings = settingsData as Record<string, any> | null;
    const shippingSettings = settings || {
      flat_rate: 100, // Default ₹100
      free_above_amount: 2000, // Default free shipping above ₹2000
      shipping_slabs: null,
      cod_enabled: true,
      default_package_weight: 0.5,
      default_package_dimensions: { length: 35, breadth: 30, height: 5 },
      blocked_pincodes: [],
      region_overrides: null,
    };

    // Check if pincode is blocked
    const blockedPincodes = (shippingSettings.blocked_pincodes as string[]) || [];
    if (blockedPincodes.includes(pincode)) {
      return NextResponse.json(
        {
          error: "Shipping not available to this pincode",
          shipping_fee: 0,
          estimated_delivery_range: { min_days: 0, max_days: 0 },
        },
        { status: 400 }
      );
    }

    // Check free shipping threshold
    const freeAboveAmount = shippingSettings.free_above_amount || 0;
    if (order_total >= freeAboveAmount && freeAboveAmount > 0) {
      return NextResponse.json({
        shipping_fee: 0,
        estimated_delivery_range: calculateETA(pincode),
        free_shipping_applied: true,
        calculation_method: "free_shipping_threshold",
      });
    }

    // Check shipping slabs if configured
    const shippingSlabs = shippingSettings.shipping_slabs as
      | Array<{
          min_amount: number;
          max_amount: number;
          fee: number;
        }>
      | null;

    if (shippingSlabs && shippingSlabs.length > 0) {
      for (const slab of shippingSlabs) {
        if (
          order_total >= slab.min_amount &&
          (slab.max_amount === null || order_total <= slab.max_amount)
        ) {
          return NextResponse.json({
            shipping_fee: slab.fee,
            estimated_delivery_range: calculateETA(pincode),
            free_shipping_applied: false,
            calculation_method: "shipping_slab",
          });
        }
      }
    }

    // Default: Use flat rate
    const flatRate = shippingSettings.flat_rate || 100;

    return NextResponse.json({
      shipping_fee: flatRate,
      estimated_delivery_range: calculateETA(pincode),
      free_shipping_applied: false,
      calculation_method: "flat_rate",
    });
  } catch (error: any) {
    console.error("Shipping calculation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate ETA based on pincode
 */
function calculateETA(pincode: string): { min_days: number; max_days: number } {
  const METRO_PINCODE_PREFIXES = ["11", "40", "56", "50", "60", "70", "41", "38", "30", "39"];
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

