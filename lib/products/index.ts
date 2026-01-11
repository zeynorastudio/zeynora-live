import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";
import slugify from "slugify";
import type { Database } from "@/types/supabase";
import { processProductInput } from "./helpers";

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Generate next sequential UID in format ZYN-XXXX
 * Finds max existing ZYN- prefix UID and increments
 */
export async function generateNextZYNUID(): Promise<string> {
  const supabase = createServiceRoleClient();
  
  const { data: existingProducts, error } = await supabase
    .from("products")
    .select("uid")
    .like("uid", "ZYN-%");
  
  if (error) {
    console.error("[PRODUCT_CREATE] Error fetching existing UIDs:", { error: error.message });
    throw new Error(`Failed to query existing UIDs: ${error.message}`);
  }
  
  const typedProducts = (existingProducts || []) as Array<{ uid?: string | null }>;
  
  let maxNumber = 0;
  for (const product of typedProducts) {
    if (!product.uid) continue;
    const match = product.uid.match(/ZYN-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }
  
  // Increment and zero-pad to 4 digits
  const nextNumber = maxNumber + 1;
  return `ZYN-${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Parse Sizes_With_Stock CSV format: M-9,L-4,XL-12
 * Returns array of { size: string, stock: number }
 */
export function parseSizesWithStock(sizesStock: string): Array<{ size: string; stock: number }> {
  if (!sizesStock || sizesStock.trim() === "") return [];
  
  const parts = sizesStock.split(",").map((s) => s.trim()).filter((s) => s !== "");
  const result: Array<{ size: string; stock: number }> = [];
  
  for (const part of parts) {
    const match = part.match(/^([A-Z0-9]+)-(\d+)$/);
    if (match) {
      const size = match[1];
      const stock = parseInt(match[2], 10);
      if (!isNaN(stock) && stock >= 0) {
        result.push({ size, stock });
      }
    }
  }
  
  return result;
}

/**
 * Generate SKU from UID, color short, and size
 * Format: <UID>-<COLORSHORT>-<SIZE>
 */
export function generateVariantSKU(uid: string, colorName: string, size: string): string {
  const colorShort = slugify(colorName, { lower: true, strict: true, trim: true })
    .substring(0, 3)
    .toUpperCase() || "COL";
  return `${uid}-${colorShort}-${size}`;
}

/**
 * Find or create color by name
 */
async function findOrCreateColor(supabase: SupabaseClient, colorName: string): Promise<string | null> {
  if (!colorName || colorName.trim() === "") return null;
  
  const slug = slugify(colorName, { lower: true, strict: true, trim: true });
  
  // Try to find existing
  const { data: existing } = await supabase
    .from("colors")
    .select("id")
    .eq("slug", slug)
    .single();
  
  if (existing) {
    const typed = existing as { id: string };
    return typed.id;
  }
  
  // Create new color
  const { data: created, error } = await supabase
    .from("colors")
    .insert({
      name: colorName,
      slug,
    } as unknown as never)
    .select("id")
    .single();
  
  if (error || !created) {
    console.warn(`Failed to create color ${colorName}:`, error);
    return null;
  }
  
  const typedCreated = created as { id: string };
  return typedCreated.id;
}

/**
 * Find size by code
 */
async function findSizeByCode(supabase: SupabaseClient, sizeCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("sizes")
    .select("id")
    .eq("code", sizeCode.toUpperCase())
    .single();
  
  if (error || !data) {
    console.warn(`Size ${sizeCode} not found`);
    return null;
  }
  
  const typed = data as { id: string };
  return typed.id;
}

interface CreateProductInput {
  name: string;
  price: number;
  costPrice?: number;
  categoryId?: string | null;
  superCategory?: string | null;
  subcategory?: string | null; // Can be "Name" or "Name (Category)"
  categoryOverride?: string | null; // Manual category override
  style?: string | null;
  occasion?: string | null;
  season?: string | null;
  description?: string;
  sortOrder?: number;
  // Tags will be AUTO-GENERATED - manual tags ignored
  active?: boolean;
  featured?: boolean;
  bestSelling?: boolean;
  newLaunch?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  // Variant creation
  colors?: string[]; // Comma-separated or array
  sizesWithStock?: string; // CSV format: M-9,L-4,XL-12
  mainImageUrl?: string | null;
}

interface CreateVariantInput {
  sku: string;
  colorId: string | null;
  sizeId: string | null;
  stock: number;
  price?: number;
  active?: boolean;
}

/**
 * Create product with variants
 */
export async function createProductWithVariants(
  input: CreateProductInput,
  actorId: string | null
): Promise<{ productUid: string; variantSkus: string[] }> {
  const supabase = createServiceRoleClient();
  
  // Generate UID
  const uid = await generateNextZYNUID();
  
  // Generate slug
  const slugBase = slugify(input.name, { lower: true, strict: true, trim: true });
  let slug = slugBase;
  let slugCounter = 1;
  
  // Ensure unique slug
  while (true) {
    const { data: existing } = await supabase
      .from("products")
      .select("uid")
      .eq("slug", slug)
      .single();
    
    if (!existing) break;
    
    slug = `${slugBase}-${slugCounter}`;
    slugCounter++;
  }
  
  // PHASE 1.1: Process product input using unified logic
  const processed = processProductInput({
    subcategoryInput: input.subcategory,
    categoryOverride: input.categoryOverride,
    superCategory: input.superCategory,
    occasion: input.occasion,
    style: input.style,
    season: input.season,
    is_featured: input.featured || false,
    is_best_selling: input.bestSelling || false,
    is_new_launch: input.newLaunch || false,
  });
  
  // Calculate profit
  const profit_percentage =
    input.price > 0 && input.costPrice
      ? ((input.price - input.costPrice) / input.price) * 100
      : null;
  const profit_amount = input.price && input.costPrice ? input.price - input.costPrice : null;
  
  // SEO defaults - use effective category
  const categoryName = processed.effectiveCategory || "Zeynora";
  const seoTitle = input.seoTitle || `${input.name} | ${categoryName}`;
  const seoDescription =
    input.seoDescription || `Buy ${input.name} — premium quality. Fast delivery.`;
  
  // Create product with auto-generated fields
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      uid,
      name: input.name,
      slug,
      description: input.description || null,
      category_id: input.categoryId || null,
      super_category: processed.effectiveCategory || null,
      subcategory: processed.subcategory || null,
      category_override: processed.categoryOverride || null,
      style: input.style || null,
      occasion: (input.occasion as any) || null,
      season: (input.season as any) || null,
      price: input.price,
      cost_price: input.costPrice || null,
      profit_percent: profit_percentage,
      profit_amount: profit_amount,
      active: input.active !== false,
      featured: input.featured || false,
      best_selling: input.bestSelling || false,
      new_launch: input.newLaunch || false,
      tags: processed.tags, // AUTO-GENERATED TAGS
      sort_order: input.sortOrder ?? 999,
      main_image_path: input.mainImageUrl || null,
      metadata: {
        description: input.description || "",
        seo_title: seoTitle,
        seo_description: seoDescription,
      },
    } as unknown as never)
    .select("uid")
    .single();
  
  if (productError || !product) {
    throw new Error(`Failed to create product: ${productError?.message || "Unknown error"}`);
  }
  
  const typedProduct = product as { uid: string };
  
  // Parse colors - SINGLE COLOR ONLY (take first if multiple provided)
  let colorName: string | null = null;
  if (input.colors) {
    const colorsInput = input.colors as string[] | string;
    if (typeof colorsInput === "string") {
      const colorParts = colorsInput.split(",").map((c: string) => c.trim()).filter((c: string) => c !== "");
      colorName = colorParts[0] || null; // Take first color only
    } else if (Array.isArray(colorsInput) && colorsInput.length > 0) {
      colorName = colorsInput[0]; // Take first color only
    }
  }
  
  // Parse sizes with stock
  const sizesStock = input.sizesWithStock ? parseSizesWithStock(input.sizesWithStock) : [];
  
  // Create variants - SINGLE COLOR ONLY with atomic rollback
  const variantSkus: string[] = [];
  const createdVariantSkus: string[] = []; // Track created variants for rollback
  
  if (sizesStock.length > 0) {
    // Get color ID if color provided
    const colorId = colorName ? await findOrCreateColor(supabase, colorName) : null;
    
    // Create variant for each size (single color only)
    for (const { size, stock } of sizesStock) {
      const sizeId = await findSizeByCode(supabase, size);
      // Generate SKU: ZYN-xxxx-{COLOR_ABBR}-{SIZE}
      const sku = colorName 
        ? generateVariantSKU(uid, colorName, size)
        : `${uid}-${size}`;
      
      const { error: variantError } = await supabase
        .from("product_variants")
        .insert({
          product_uid: uid,
          sku,
          color_id: colorId,
          size_id: sizeId,
          stock,
          price: input.price, // Use product price as default
          active: input.active !== false,
        } as unknown as never);
      
      if (variantError) {
        console.error("[PRODUCT_CREATE] Variant creation failed, initiating rollback:", {
          product_uid: uid,
          failed_sku: sku,
          error: variantError.message,
          created_variants: createdVariantSkus,
        });
        
        // ATOMIC ROLLBACK: Delete all created variants first
        if (createdVariantSkus.length > 0) {
          const { error: deleteVariantsError } = await supabase
            .from("product_variants")
            .delete()
            .in("sku", createdVariantSkus);
          
          if (deleteVariantsError) {
            console.error("[PRODUCT_CREATE] Failed to rollback variants:", {
              product_uid: uid,
              error: deleteVariantsError.message,
            });
          }
        }
        
        // Then delete the product
        const { error: deleteProductError } = await supabase
          .from("products")
          .delete()
          .eq("uid", uid);
        
        if (deleteProductError) {
          console.error("[PRODUCT_CREATE] Failed to rollback product:", {
            product_uid: uid,
            error: deleteProductError.message,
          });
        }
        
        // Log rollback event to audit
        await createAudit(actorId, "product_creation_rollback", {
          product_uid: uid,
          name: input.name,
          failed_variant_sku: sku,
          reason: variantError.message,
          variants_rolled_back: createdVariantSkus.length,
        });
        
        throw new Error(`Failed to create variant ${sku}: ${variantError.message}`);
      }
      
      // Track successfully created variant
      createdVariantSkus.push(sku);
      variantSkus.push(sku);
    }
  } else {
    // No sizes provided - mark product as inactive and warn
    await supabase
      .from("products")
      .update({ active: false } as unknown as never)
      .eq("uid", uid);
    console.warn("[PRODUCT_CREATE] Product created without variants - marked as inactive:", {
      product_uid: uid,
      name: input.name,
    });
  }
  
  // Audit log
  await createAudit(actorId, "create_product", {
    product_uid: uid,
    name: input.name,
    variant_count: variantSkus.length,
  });
  
  return { productUid: uid, variantSkus };
}


