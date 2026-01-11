/**
 * SKU Generator - Phase 2
 * 
 * RULES:
 * 1. NEVER regenerate or modify an existing SKU
 * 2. Auto-generate ONLY if SKU is missing/null/empty
 * 3. Format: ZYN-{PRODUCT_UID}-{SIZE}
 * 
 * EXAMPLES:
 * - Existing: ZYN-0011-BLA-XL → KEEP AS IS
 * - Missing: null → ZYN-8F2A3C-M
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Generate SKU for a variant if it doesn't already have one
 * @param productUid Product UID
 * @param sizeCode Size code (e.g., "M", "L", "XL")
 * @param existingSku Existing SKU (if any)
 * @returns SKU string
 */
export function generateVariantSku(
  productUid: string,
  sizeCode: string,
  existingSku?: string | null
): string {
  // NEVER modify existing SKU
  if (existingSku && existingSku.trim().length > 0) {
    console.log(`[SKU_GEN] Preserving existing SKU: ${existingSku}`);
    return existingSku;
  }

  // Generate new SKU: ZYN-{PRODUCT_UID}-{SIZE}
  const newSku = `ZYN-${productUid}-${sizeCode}`.toUpperCase();
  console.log(`[SKU_GEN] Generated new SKU: ${newSku}`);
  return newSku;
}

/**
 * Backfill missing SKUs for a product's variants
 * This is called when editing a product to ensure all variants have SKUs
 * @param productUid Product UID
 * @returns Count of SKUs generated
 */
export async function backfillProductVariantSkus(productUid: string): Promise<number> {
  const supabase = createServiceRoleClient();
  
  try {
    // Fetch all variants for this product that have null/empty SKU
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("id, sku, sizes(code)")
      .eq("product_uid", productUid)
      .or("sku.is.null,sku.eq.");

    if (error) {
      console.error("[SKU_BACKFILL] Error fetching variants:", error);
      return 0;
    }

    const typedVariants = variants as Array<{
      id: string;
      sku: string | null;
      sizes: { code: string } | null;
    }>;

    if (!typedVariants || typedVariants.length === 0) {
      console.log("[SKU_BACKFILL] No variants need SKU backfill");
      return 0;
    }

    let count = 0;
    
    for (const variant of typedVariants) {
      const sizeCode = variant.sizes?.code;
      if (!sizeCode) {
        console.warn(`[SKU_BACKFILL] Variant ${variant.id} has no size, skipping`);
        continue;
      }

      const newSku = generateVariantSku(productUid, sizeCode);
      
      const { error: updateError } = await supabase
        .from("product_variants")
        .update({ sku: newSku } as unknown as never)
        .eq("id", variant.id);

      if (updateError) {
        console.error(`[SKU_BACKFILL] Failed to update variant ${variant.id}:`, updateError);
      } else {
        count++;
        console.log(`[SKU_BACKFILL] Updated variant ${variant.id} with SKU: ${newSku}`);
      }
    }

    console.log(`[SKU_BACKFILL] Backfilled ${count} SKUs for product ${productUid}`);
    return count;
  } catch (error) {
    console.error("[SKU_BACKFILL] Unexpected error:", error);
    return 0;
  }
}

/**
 * Validate SKU format (optional, for future use)
 * @param sku SKU string
 * @returns true if valid
 */
export function isValidSkuFormat(sku: string): boolean {
  // Accept any non-empty string for now (legacy SKUs may have different formats)
  return Boolean(sku && sku.trim().length > 0);
}
















