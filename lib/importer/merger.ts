import { NormalizedProduct, NormalizedVariant } from "./types";

export function mergeProductAndVariantData(
  product: NormalizedProduct,
  variantsFromCsv: NormalizedVariant[]
): NormalizedVariant[] {
  const mergedVariants: NormalizedVariant[] = [];
  const processedSkus = new Set<string>();

  // Helper to handle SKU conflict
  const registerVariant = (v: NormalizedVariant) => {
    let finalSku = v.sku;
    let counter = 1;
    while (processedSkus.has(finalSku)) {
      finalSku = `${v.sku}-${counter}`;
      counter++;
    }
    v.sku = finalSku;
    processedSkus.add(finalSku);
    mergedVariants.push(v);
  };

  // 1. Determine if we use CSV variants or Auto-generate
  // "variantsCsv rows override auto-generated variants from product CSV"
  // "Deduplicate by SKU"
  // Actually, we might have BOTH? "if variants CSV contains entries for product, those will override"
  // This usually means if *any* variants exist in CSV for this product, use ONLY those.
  // OR it means merge them?
  // "produce variantSeed array for auto-generation: all color×size combinations (if variants CSV contains entries for product, those will override)"
  // This implies: If variants exist in CSV, ignore seed? Or merge?
  // "Merge priority: variantsCsv rows override auto-generated variants"
  // Usually, if detailed variants are provided, we discard the simple "Sizes_With_Stock" matrix because the CSV is the source of truth.
  // Let's assume: If `variantsFromCsv.length > 0`, use ONLY `variantsFromCsv`.
  // If `variantsFromCsv` is empty, generate from seed.
  
  const useCsv = variantsFromCsv.length > 0;

  if (useCsv) {
    for (const v of variantsFromCsv) {
      // Enforce single color logic
      // "Ensure for single-color products variants keep color value equal to internal default color group"
      // If product.colors is ["default"], then variant.color MUST be "default"
      if (product.colors.length === 1 && product.colors[0] === "default") {
        v.color = "default";
      }
      registerVariant(v);
    }
  } else {
    // Generate from Seed
    // Product has colors[] and sizes_with_stock { "S": 10 }
    // If single color, colors=["default"]
    
    for (const color of product.colors) {
      for (const [size, stock] of Object.entries(product.sizes_with_stock)) {
         const sku = `${product.uid}-${color === "default" ? "def" : color}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
         
         const newVariant: NormalizedVariant = {
           product_uid: product.uid,
           sku,
           color,
           size,
           stock,
           price: product.price,
           cost: product.cost_price,
           is_active: product.is_active,
           images: [] // inherit main image? usually variants don't have images unless specific.
         };
         registerVariant(newVariant);
      }
    }
  }

  return mergedVariants;
}
