/**
 * Logistics Defaults Configuration
 * 
 * Centralized source for shipping logistics defaults with environment variable support.
 * Provides hard safe fallbacks if env values are missing or invalid.
 * 
 * IMPORTANT:
 * - All values must be numbers
 * - If env values are missing or invalid, fallback silently to defaults
 * - NO DB interaction
 * - This is a single immutable object export
 */

/**
 * Default weight in kilograms
 * Falls back to 1.5 kg if env is missing or invalid
 */
const DEFAULT_WEIGHT_KG = ((): number => {
  const envValue = process.env.SHIPROCKET_DEFAULT_WEIGHT_KG;
  if (!envValue) return 1.5;
  const parsed = parseFloat(envValue);
  return isNaN(parsed) || parsed <= 0 ? 1.5 : parsed;
})();

/**
 * Default length in centimeters
 * Falls back to 16 cm if env is missing or invalid
 */
const DEFAULT_LENGTH_CM = ((): number => {
  const envValue = process.env.SHIPROCKET_DEFAULT_LENGTH_CM;
  if (!envValue) return 16;
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) || parsed <= 0 ? 16 : parsed;
})();

/**
 * Default breadth in centimeters
 * Falls back to 13 cm if env is missing or invalid
 */
const DEFAULT_BREADTH_CM = ((): number => {
  const envValue = process.env.SHIPROCKET_DEFAULT_BREADTH_CM;
  if (!envValue) return 13;
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) || parsed <= 0 ? 13 : parsed;
})();

/**
 * Default height in centimeters
 * Falls back to 4 cm if env is missing or invalid
 */
const DEFAULT_HEIGHT_CM = ((): number => {
  const envValue = process.env.SHIPROCKET_DEFAULT_HEIGHT_CM;
  if (!envValue) return 4;
  const parsed = parseInt(envValue, 10);
  return isNaN(parsed) || parsed <= 0 ? 4 : parsed;
})();

/**
 * Immutable logistics defaults object
 * Contains weight and dimensions with safe fallbacks
 */
export const LOGISTICS_DEFAULTS = {
  weightKg: DEFAULT_WEIGHT_KG,
  lengthCm: DEFAULT_LENGTH_CM,
  breadthCm: DEFAULT_BREADTH_CM,
  heightCm: DEFAULT_HEIGHT_CM,
} as const;


