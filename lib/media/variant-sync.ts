/**
 * Variant Sync Logic (Strategy B)
 * 
 * Rules:
 * - If product has variants all sharing the SAME COLOR:
 *   - Assign the same gallery to ALL variants (no per-variant images)
 * - If future multi-color variant support is added:
 *   - (Function signature prepared but inactive for now)
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Sync gallery images to variants (Strategy B)
 * For single-color products: all variants share the same gallery
 * 
 * @param productUid - Product UID
 * @param imageIds - Array of image IDs to sync
 * @returns Promise<void>
 * 
 * NOTE: Currently inactive - single-color products don't need variant-specific images
 * All images are product-level and shared across all variants
 */
export async function syncGalleryToVariants(
  productUid: string,
  imageIds: string[]
): Promise<void> {
  // Strategy B: Single-color products
  // All variants share the same gallery (product-level images)
  // No per-variant image assignment needed
  
  // Future: If multi-color support is added, this function would:
  // 1. Check if all variants share the same color
  // 2. If yes: keep images product-level (current behavior)
  // 3. If no: assign images to specific color variants
  
  // For now, this is a no-op as images are already product-level
  // and variant_sku is set to null in product_images table
  
  return Promise.resolve();
}

/**
 * Check if product has variants with same color
 * (Helper for future multi-color support)
 */
export async function hasSingleColorVariants(productUid: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  
  const { data: variants } = await supabase
    .from("product_variants")
    .select("color_id")
    .eq("product_uid", productUid);
  
  if (!variants || variants.length === 0) return true;
  
  const colorIds = new Set(
    variants
      .map((v) => (v as { color_id: string | null }).color_id)
      .filter((id): id is string => id !== null)
  );
  
  // Single color if all variants have the same color_id (or all null)
  return colorIds.size <= 1;
}










