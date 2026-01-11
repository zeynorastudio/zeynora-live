/**
 * Phase 3.4 — Global Shipping Configuration
 * 
 * Single source of truth for default shipping weight and dimensions.
 * This configuration is used for:
 * - Shiprocket rate calculation
 * - Shipment creation payloads
 * 
 * IMPORTANT: Do NOT hardcode weight/dimensions elsewhere.
 * Always import and use this module.
 */

/**
 * Global default shipping weight in kilograms
 * Used for all shipments regardless of product data
 */
export const GLOBAL_DEFAULT_WEIGHT_KG = 1.5;

/**
 * Global default box dimensions (standard dress box)
 * Medium apparel carton dimensions suitable for most clothing items
 */
export const GLOBAL_DEFAULT_DIMENSIONS = {
  length: 40,  // cm
  breadth: 30, // cm
  height: 10,  // cm
};

/**
 * Get the global default weight
 * @returns Default weight in kg (1.5)
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
 * Get the global default package configuration
 * @returns Complete package config with weight and dimensions
 */
export function getDefaultPackage() {
  return {
    weight: GLOBAL_DEFAULT_WEIGHT_KG,
    ...GLOBAL_DEFAULT_DIMENSIONS,
  };
}










