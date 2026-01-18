/**
 * FINAL — Global Shipping Configuration (ENV-Based)
 * 
 * Single source of truth for default shipping weight and dimensions.
 * All values are read from environment variables with safe fallbacks.
 * 
 * Environment Variables:
 * - DEFAULT_SHIPMENT_WEIGHT (kg, default: 1.5)
 * - DEFAULT_SHIPMENT_LENGTH (cm, default: 40)
 * - DEFAULT_SHIPMENT_BREADTH (cm, default: 30)
 * - DEFAULT_SHIPMENT_HEIGHT (cm, default: 10)
 * - SHIPROCKET_PICKUP_LOCATION (default: "Primary")
 * 
 * This configuration is used for:
 * - Shiprocket rate calculation
 * - Shipment creation payloads
 * 
 * IMPORTANT: Do NOT hardcode weight/dimensions elsewhere.
 * Always import and use this module.
 */

/**
 * Parse environment variable to number with fallback
 */
function parseEnvNumber(envKey: string, fallback: number): number {
  const value = process.env[envKey];
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

/**
 * Global default shipping weight in kilograms
 * Source: DEFAULT_SHIPMENT_WEIGHT env var
 */
export const GLOBAL_DEFAULT_WEIGHT_KG = parseEnvNumber("DEFAULT_SHIPMENT_WEIGHT", 1.5);

/**
 * Global default box dimensions
 * Source: DEFAULT_SHIPMENT_* env vars
 */
export const GLOBAL_DEFAULT_DIMENSIONS = {
  length: parseEnvNumber("DEFAULT_SHIPMENT_LENGTH", 40),  // cm
  breadth: parseEnvNumber("DEFAULT_SHIPMENT_BREADTH", 30), // cm
  height: parseEnvNumber("DEFAULT_SHIPMENT_HEIGHT", 10),  // cm
};

/**
 * Pickup location for Shiprocket
 * Source: SHIPROCKET_PICKUP_LOCATION env var
 */
export const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION || "Primary";

/**
 * Get the global default weight
 * @returns Default weight in kg from env or fallback (1.5)
 */
export function getDefaultWeight(): number {
  return GLOBAL_DEFAULT_WEIGHT_KG;
}

/**
 * Get the global default dimensions
 * @returns Default box dimensions (length, breadth, height in cm)
 */
export function getDefaultDimensions(): { length: number; breadth: number; height: number } {
  return { ...GLOBAL_DEFAULT_DIMENSIONS };
}

/**
 * Get the pickup location
 * @returns Pickup location name from env or "Primary"
 */
export function getPickupLocation(): string {
  return SHIPROCKET_PICKUP_LOCATION;
}

/**
 * Get the global default package configuration
 * @returns Complete package config with weight and dimensions
 */
export function getDefaultPackage() {
  return {
    weight: GLOBAL_DEFAULT_WEIGHT_KG,
    ...GLOBAL_DEFAULT_DIMENSIONS,
    pickup_location: SHIPROCKET_PICKUP_LOCATION,
  };
}

/**
 * Validate package configuration
 * @returns true if all values are valid positive numbers
 */
export function isPackageConfigValid(): boolean {
  return (
    GLOBAL_DEFAULT_WEIGHT_KG > 0 &&
    GLOBAL_DEFAULT_DIMENSIONS.length > 0 &&
    GLOBAL_DEFAULT_DIMENSIONS.breadth > 0 &&
    GLOBAL_DEFAULT_DIMENSIONS.height > 0
  );
}
