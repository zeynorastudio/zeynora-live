import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import {
  ImportSummary,
  ImportPreview,
  ProductCSVRow,
  VariantCSVRow,
  NormalizedProduct,
  NormalizedVariant,
} from "./types";
import {
  parseCsvStringToRows,
  readCsvFromPath,
} from "./parser";
import {
  normalizeProductRow,
  normalizeVariantRow,
} from "./normalizers";
import { mergeProductAndVariantData } from "./merger";
import { productCSVSchema, variantCSVSchema } from "./validation";
import { getEnumValues } from "./helpers";
import slugify from "slugify";
import crypto from "crypto";

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

function safeSlugify(text: string): string {
  return slugify(text || "", { lower: true, strict: true, trim: true });
}

/**
 * Compute SHA256 hash of string
 */
function computeHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Generate next sequential UID in format ZYN-XXXX
 * Finds max existing ZYN- prefix UID and increments
 * NEVER uses fallback - throws error if query fails
 */
async function generateNextZYNUID(supabase: SupabaseClient): Promise<string> {
  const { data: existingProducts, error } = await supabase
    .from("products")
    .select("uid")
    .like("uid", "ZYN-%");
  
  if (error) {
    console.error("❌ Error fetching existing UIDs:", error);
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
 * Parse Images_JSON string to array
 */
function parseImagesJSON(imagesJson: string | null | undefined): string[] {
  if (!imagesJson || imagesJson.trim() === "") return [];
  
  try {
    const parsed = JSON.parse(imagesJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((url): url is string => typeof url === "string" && url.trim() !== "");
    }
    if (typeof parsed === "string") {
      return [parsed].filter(url => url.trim() !== "");
    }
  } catch {
    // Not valid JSON, try comma-separated
    if (imagesJson.includes(",")) {
      return imagesJson.split(",").map(s => s.trim()).filter(s => s !== "");
    }
    // Single URL
    return [imagesJson.trim()].filter(s => s !== "");
  }
  
  return [];
}

/**
 * Merge variant image rows by SKU
 * Uses first non-empty Images_JSON for each SKU
 */
function mergeVariantImagesBySKU(
  variantRows: Array<{ sku: string; images_json?: string | null }>
): Map<string, string[]> {
  const merged = new Map<string, string[]>();
  
  for (const row of variantRows) {
    const sku = row.sku;
    if (!sku) continue;
    
    // If SKU already processed, skip (use first row)
    if (merged.has(sku)) continue;
    
    const images = parseImagesJSON(row.images_json);
    if (images.length > 0) {
      merged.set(sku, images);
    }
  }
  
  return merged;
}

/**
 * Parse Tag_List from variants CSV (comma-separated)
 */
function parseTagList(tagList: string | null | undefined): string[] {
  if (!tagList || tagList.trim() === "") return [];
  return tagList.split(",").map(t => safeSlugify(t.trim())).filter(t => t !== "");
}

/**
 * Preview import (dry-run mode)
 */
export async function previewImport(
  productsCSV: string,
  variantsCSV: string
): Promise<ImportPreview> {
  const preview: ImportPreview = {
    productsToCreate: 0,
    variantsToCreate: 0,
    productsNeedingUID: [],
    generatedUIDs: new Map(),
    duplicateSKUs: [],
    variantImageMergePlan: new Map(),
    missingImages: [],
    conflicts: [],
    errors: [],
  };
  
  const supabase = createServiceRoleClient();
  
  // Parse CSVs
  const productHeaders = Object.keys(productCSVSchema.shape);
  const variantHeaders = Object.keys(variantCSVSchema.shape);
  
  const productRows = parseCsvStringToRows(productsCSV, productHeaders) as unknown as ProductCSVRow[];
  const variantRows = parseCsvStringToRows(variantsCSV, variantHeaders) as unknown as VariantCSVRow[];
  
  // Check for products needing UID
  const productsNeedingUID: ProductCSVRow[] = [];
  for (const row of productRows) {
    if (!row.UID || row.UID.trim() === "") {
      productsNeedingUID.push(row);
    }
  }
  
  // Generate UIDs
  for (const row of productsNeedingUID) {
    try {
      const generatedUID = await generateNextZYNUID(supabase);
      const rowKey = JSON.stringify(row);
      preview.generatedUIDs.set(rowKey, generatedUID);
      preview.productsNeedingUID.push(rowKey);
    } catch (error: any) {
      preview.errors.push({
        row: productRows.indexOf(row) + 2,
        file: "product",
        message: `Failed to generate UID: ${error.message}`,
      });
    }
  }
  
  // Check for existing UIDs
  const allUIDs = productRows
    .map(row => row.UID || preview.generatedUIDs.get(JSON.stringify(row)))
    .filter((uid): uid is string => !!uid);
  
  if (allUIDs.length > 0) {
    const { data: existing } = await supabase
      .from("products")
      .select("uid")
      .in("uid", allUIDs);
    
    const existingUIDs = new Set((existing || []).map((p: any) => p.uid));
    for (const uid of allUIDs) {
      if (existingUIDs.has(uid)) {
        preview.conflicts.push({
          type: "uid",
          value: uid,
          message: `Product with UID ${uid} already exists`,
        });
      }
    }
  }
  
  // Check for duplicate SKUs across different products
  const skuToProduct = new Map<string, string>();
  for (const row of variantRows) {
    const sku = row.Variant_SKU?.trim();
    if (!sku) continue;
    
    if (skuToProduct.has(sku)) {
      const existingProduct = skuToProduct.get(sku);
      if (existingProduct !== row.Product_UID) {
        preview.conflicts.push({
          type: "sku",
          value: sku,
          message: `SKU ${sku} appears in multiple products: ${existingProduct} and ${row.Product_UID}`,
        });
      }
    } else {
      skuToProduct.set(sku, row.Product_UID);
    }
  }
  
  // Check for duplicate SKUs in same product (multiple rows)
  const skuCounts = new Map<string, number[]>();
  variantRows.forEach((row, idx) => {
    const sku = row.Variant_SKU?.trim();
    if (!sku) return;
    
    if (!skuCounts.has(sku)) {
      skuCounts.set(sku, []);
    }
    skuCounts.get(sku)!.push(idx + 2); // +2 because CSV is 1-based and header is row 1
  });
  
  for (const [sku, rows] of skuCounts.entries()) {
    if (rows.length > 1) {
      preview.duplicateSKUs.push({ sku, rows });
    }
  }
  
  // Merge variant images by SKU
  const variantImageRows = variantRows.map(row => ({
    sku: row.Variant_SKU?.trim() || "",
    images_json: row.Images_JSON,
  }));
  preview.variantImageMergePlan = mergeVariantImagesBySKU(variantImageRows);
  
  // Check for missing images
  for (const row of productRows) {
    if (!row["Main Image URL"] || row["Main Image URL"].trim() === "") {
      const uid = row.UID || preview.generatedUIDs.get(JSON.stringify(row));
      if (uid) {
        preview.missingImages.push({ product_uid: uid, type: "main" });
      }
    }
  }
  
  preview.productsToCreate = productRows.length;
  preview.variantsToCreate = variantRows.length;
  
  return preview;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImageToStorage(
  supabase: SupabaseClient,
  imageUrl: string,
  productUid: string,
  variantSku?: string,
  imageIndex: number = 0
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.statusText} (${res.status})`);
    }
    
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    
    // Naming: products/{uid}/{sku}-{index}.ext or products/{uid}/main-{index}.ext
    const filename = variantSku 
      ? `${variantSku}-${imageIndex.toString().padStart(2, "0")}.${ext}`
      : `main-${imageIndex.toString().padStart(2, "0")}.${ext}`;
    
    const storagePath = `products/${productUid}/${filename}`;
    
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(storagePath, buffer, { upsert: true, contentType: blob.type });

    if (uploadError) {
      throw uploadError;
    }

    return storagePath;
  } catch (error: any) {
    console.error(`❌ Image upload failed for ${imageUrl}:`, error.message);
    throw error;
  }
}

/**
 * Main import function
 */
export async function runImport(
  productsCsv: string,
  variantsCsv: string,
  options?: {
    isFilePath?: boolean;
    revalidatePaths?: string[];
    dryRun?: boolean;
    userId?: string | null;
    autoCreateMissingCategories?: boolean;
    updateExisting?: boolean; // If false, skip existing products/variants instead of updating
  }
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    success: true,
    total_products_processed: 0,
    total_variants_processed: 0,
    products_created: 0,
    products_updated: 0,
    variants_created: 0,
    variants_updated: 0,
    categories_created: 0,
    tags_created: 0,
    images_queued: 0,
    errors: [],
    writeErrors: [],
    imageErrors: [],
    skuConflicts: [],
    products_with_pending_images: [],
    skipped_rows_count: 0,
    warnings: [],
  };

  const supabase = createServiceRoleClient();
  
  // Generate batch ID and file hashes
  const batchId = `import-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const productsHash = computeHash(productsCsv);
  const variantsHash = computeHash(variantsCsv);
  
  // Create import run record (only if not dry run)
  let importRunId: string | null = null;
  if (!options?.dryRun) {
    try {
      const { data: importRun, error: runError } = await supabase
        .from("import_runs")
        .insert({
          batch_id: batchId,
          status: "processing",
          products_file_hash: productsHash,
          variants_file_hash: variantsHash,
          created_by: options?.userId || null,
        } as any)
        .select("id")
        .single();
      
      if (runError) {
        console.error("❌ Failed to create import run:", runError);
        summary.errors.push({
          row_index: 0,
          file_type: "product",
          error_message: `Failed to create import run: ${runError.message}`,
        });
        summary.success = false;
        return summary;
      }
      
      importRunId = (importRun as any)?.id || null;
      console.log(`📝 Created import run: ${batchId} (ID: ${importRunId})`);
    } catch (error: any) {
      console.error("❌ Exception creating import run:", error);
      summary.errors.push({
        row_index: 0,
        file_type: "product",
        error_message: `Exception creating import run: ${error.message}`,
      });
      summary.success = false;
      return summary;
    }
  }
  
  // Helper function to add row error
  const addRowError = (rowIndex: number, fileType: "product" | "variant", message: string, dataSnippet?: any) => {
    summary.errors.push({
      row_index: rowIndex,
      file_type: fileType,
      error_message: message,
      data_snippet: dataSnippet,
    });
    summary.skipped_rows_count++;
    console.error(`❌ Row ${rowIndex} (${fileType}): ${message}`);
  };
  
  // Helper function to add warning
  const addWarning = (message: string) => {
    summary.warnings.push(message);
    console.warn(`⚠️ ${message}`);
  };

  try {
    // 1. Parse Inputs
    let productRows: Record<string, string>[] = [];
    let variantRows: Record<string, string>[] = [];

    const productHeaders = Object.keys(productCSVSchema.shape);
    const variantHeaders = Object.keys(variantCSVSchema.shape);

    if (options?.isFilePath) {
      const pContent = readCsvFromPath(productsCsv);
      const vContent = readCsvFromPath(variantsCsv);
      productRows = parseCsvStringToRows(pContent, productHeaders);
      variantRows = parseCsvStringToRows(vContent, variantHeaders);
    } else {
      productRows = parseCsvStringToRows(productsCsv, productHeaders);
      variantRows = parseCsvStringToRows(variantsCsv, variantHeaders);
    }

    summary.total_products_processed = productRows.length;
    summary.total_variants_processed = variantRows.length;

    console.log(`📊 Processing ${productRows.length} products and ${variantRows.length} variants`);

    // 2. Generate UIDs for products missing UID
    const uidMap = new Map<string, string>();
    for (const row of productRows) {
      if (!row.UID || row.UID.trim() === "") {
        try {
          const generatedUID = await generateNextZYNUID(supabase);
          uidMap.set(JSON.stringify(row), generatedUID);
          console.log(`✅ Generated UID: ${generatedUID}`);
        } catch (error: any) {
          summary.errors.push({
            row_index: productRows.indexOf(row) + 2,
            file_type: "product",
            error_message: `Failed to generate UID: ${error.message}`,
            data_snippet: row,
          });
          summary.skipped_rows_count++;
        }
      }
    }

    // 3. Validate & Normalize Products
    const validProducts: NormalizedProduct[] = [];
    
    productRows.forEach((row, idx) => {
      const validation = productCSVSchema.safeParse(row);
      if (!validation.success) {
        summary.errors.push({
          row_index: idx + 2,
          file_type: "product",
          error_message: validation.error.message,
          data_snippet: row,
        });
        summary.skipped_rows_count++;
        return;
      }

      try {
        // Assign UID if missing
        if (!row.UID || row.UID.trim() === "") {
          row.UID = uidMap.get(JSON.stringify(row)) || "";
        }
        
        const normalized = normalizeProductRow(row as unknown as ProductCSVRow);
        validProducts.push(normalized);
      } catch (e: any) {
        summary.errors.push({
          row_index: idx + 2,
          file_type: "product",
          error_message: e.message,
          data_snippet: row,
        });
        summary.skipped_rows_count++;
      }
    });

    // 4. Collect tags from variants CSV (Tag_List)
    const productTagsMap = new Map<string, Set<string>>();
    variantRows.forEach((row) => {
      const productUid = (row as any).Product_UID?.trim();
      if (!productUid) return;
      
      const tagList = (row as any).Tag_List;
      if (tagList) {
        const tags = parseTagList(tagList);
        if (!productTagsMap.has(productUid)) {
          productTagsMap.set(productUid, new Set());
        }
        tags.forEach(tag => productTagsMap.get(productUid)!.add(tag));
      }
    });

    // 5. Group Variants by Product UID & Normalize
    const variantsByProduct: Record<string, NormalizedVariant[]> = {};
    validProducts.forEach(p => {
      variantsByProduct[p.uid] = [];
    });

    variantRows.forEach((row, idx) => {
      const validation = variantCSVSchema.safeParse(row);
      if (!validation.success) {
        summary.errors.push({
          row_index: idx + 2,
          file_type: "variant",
          error_message: validation.error.message,
          data_snippet: row,
        });
        summary.skipped_rows_count++;
        return;
      }

      try {
        const productContext = validProducts.find(p => p.uid === (row as any).Product_UID);
        const normalized = normalizeVariantRow(row as unknown as VariantCSVRow, productContext);
        
        if (variantsByProduct[normalized.product_uid]) {
          variantsByProduct[normalized.product_uid].push(normalized);
        } else {
          summary.errors.push({
            row_index: idx + 2,
            file_type: "variant",
            error_message: `Variant references unknown Product UID: ${normalized.product_uid}`,
            data_snippet: row,
          });
          summary.skipped_rows_count++;
        }
      } catch (e: any) {
        summary.errors.push({
          row_index: idx + 2,
          file_type: "variant",
          error_message: e.message,
          data_snippet: row,
        });
        summary.skipped_rows_count++;
      }
    });

    // 6. Merge variant images by SKU
    const variantImageMap = mergeVariantImagesBySKU(
      variantRows.map(row => ({
        sku: (row as any).Variant_SKU?.trim() || "",
        images_json: (row as any).Images_JSON,
      }))
    );

    // 7. Dry run mode
    if (options?.dryRun) {
      console.log("[DryRun] Skipping DB writes. Calculating potential ops...");
      
      let potentialVariants = 0;
      for (const product of validProducts) {
        const rawVariants = variantsByProduct[product.uid] || [];
        const finalVariants = mergeProductAndVariantData(product, rawVariants);
        potentialVariants += finalVariants.length;
      }

      summary.products_created = validProducts.length; 
      summary.variants_created = potentialVariants;
      
      console.log(`[DryRun] Would create ${summary.products_created} products and ${summary.variants_created} variants`);
      return summary;
    }

    // 8. DB Preparations - Collect metadata
    const categoriesToUpsert = new Map<string, { name: string; slug: string; parent?: string }>();
    const colorsToUpsert = new Set<string>();
    const sizesToUpsert = new Set<string>();
    const tagsToUpsert = new Set<string>();

    validProducts.forEach(p => {
      p.colors.forEach(c => colorsToUpsert.add(c));
      
      // Use tags from variants CSV if available, otherwise from product
      const productTags = productTagsMap.get(p.uid);
      if (productTags && productTags.size > 0) {
        productTags.forEach(tag => tagsToUpsert.add(tag));
      } else {
        p.tags.forEach(t => tagsToUpsert.add(t));
      }
      
      const superCat = p.super_category ? { name: p.super_category, slug: safeSlugify(p.super_category) } : null;
      const cat = p.category ? { name: p.category, slug: safeSlugify(p.category) } : null;
      const subCat = p.subcategory ? { name: p.subcategory, slug: safeSlugify(p.subcategory) } : null;

      if (superCat) categoriesToUpsert.set(superCat.slug, { ...superCat });
      if (cat) categoriesToUpsert.set(cat.slug, { ...cat, parent: superCat?.slug });
      if (subCat) categoriesToUpsert.set(subCat.slug, { ...subCat, parent: cat?.slug || superCat?.slug });
    });

    Object.values(variantsByProduct).flat().forEach(v => {
      if (v.color) colorsToUpsert.add(v.color);
      if (v.size) sizesToUpsert.add(v.size);
    });

    // 9. Upsert Metadata Tables
    // Colors
    const colorMap = new Map<string, string>();
    for (const colorName of colorsToUpsert) {
      const slug = safeSlugify(colorName);
      
      const { data, error } = await supabase.from("colors").upsert(
        { name: colorName, slug } as any,
        { onConflict: "slug" }
      ).select("id, slug").single();

      if (!error && data) {
        colorMap.set(colorName, (data as any).id);
        colorMap.set(slug, (data as any).id);
      }
    }

    // Sizes
    const sizeMap = new Map<string, string>();
    for (const sizeCode of sizesToUpsert) {
      const { data, error } = await supabase.from("sizes").upsert(
        { code: sizeCode, label: sizeCode } as any,
        { onConflict: "code" }
      ).select("id, code").single();

      if (!error && data) {
        sizeMap.set(sizeCode, (data as any).id);
      }
    }

    // Tags
    const tagMap = new Map<string, string>();
    for (const tagSlug of tagsToUpsert) {
      const name = tagSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      // Tags table might not exist, skip if error
      let tagData: any = null;
      let tagError: any = null;
      try {
        const result = await supabase.from("tags").upsert(
          { name, slug: tagSlug } as any,
          { onConflict: "slug" }
        ).select("id, slug").single();
        tagData = result.data;
        tagError = result.error;
      } catch (e) {
        console.warn("⚠️ Tags table not found, skipping tag creation");
        tagError = { message: "Tags table not found" };
      }
      
      const data = tagData;
      const error = tagError;

      if (!error && data) {
        tagMap.set(tagSlug, (data as any).id);
        summary.tags_created++;
      }
    }

    // Categories
    const categoryMap = new Map<string, string>();
    const upsertCategory = async (slug: string, name: string, parentSlug?: string) => {
      if (categoryMap.has(slug)) return categoryMap.get(slug);

      const parentId = parentSlug ? categoryMap.get(parentSlug) : null;
      const { data, error } = await supabase.from("categories").upsert(
        { name, slug, parent_id: parentId } as any,
        { onConflict: "slug" }
      ).select("id").single();

      if (data) {
        categoryMap.set(slug, (data as any).id);
        summary.categories_created++;
        return (data as any).id;
      }
      return null;
    };

    // Upsert categories in order of dependency
    for (const [slug, c] of categoriesToUpsert) {
      if (!c.parent) await upsertCategory(slug, c.name);
    }
    for (const [slug, c] of categoriesToUpsert) {
      if (c.parent && categoryMap.has(c.parent)) await upsertCategory(slug, c.name, c.parent);
    }
    for (const [slug, c] of categoriesToUpsert) {
      if (!categoryMap.has(slug)) await upsertCategory(slug, c.name, c.parent);
    }

    // 9.5. Load enum values for validation
    const validOccasions = await getEnumValues("z_occasion");
    const validSeasons = await getEnumValues("z_season");
    // Note: z_style might not exist as an enum, so we'll handle it gracefully
    const validStyles = await getEnumValues("z_style");

    // Helper function to validate enum value
    const validateEnumValue = (value: string | null, validValues: string[]): string | null => {
      if (!value) return null;
      return validValues.includes(value) ? value : null;
    };

    // 10. Process Each Product
    for (const product of validProducts) {
      const rawVariants = variantsByProduct[product.uid] || [];
      const finalVariants = mergeProductAndVariantData(product, rawVariants);

      let categoryId: string | null = null;
      if (product.subcategory) categoryId = categoryMap.get(safeSlugify(product.subcategory)) || null;
      else if (product.category) categoryId = categoryMap.get(safeSlugify(product.category)) || null;
      else if (product.super_category) categoryId = categoryMap.get(safeSlugify(product.super_category)) || null;

      // Get tags for this product (from variants CSV if available)
      const productTags = productTagsMap.get(product.uid);
      const tagsArray = productTags && productTags.size > 0 
        ? Array.from(productTags)
        : product.tags;

      // Validate enum values before insert - set to null if invalid
      const validatedOccasion = validateEnumValue(product.occasion, validOccasions);
      const validatedSeason = validateEnumValue(product.season, validSeasons);
      const validatedStyle = validStyles.length > 0 
        ? validateEnumValue(product.style, validStyles)
        : product.style; // If z_style enum doesn't exist, use as-is

      // Upsert Product with robust error handling
      const productPayload = {
        uid: product.uid,
        name: product.name,
        slug: product.slug,
        category_id: categoryId,
        super_category: product.super_category || null,
        subcategory: product.subcategory || null,
        style: validatedStyle || null,
        occasion: validatedOccasion as any || null,
        season: validatedSeason as any || null,
        featured: product.is_featured,
        best_selling: product.is_best_selling,
        active: product.is_active,
        price: product.price,
        cost_price: product.cost_price || null,
        profit_percent: product.profit_percentage || null,
        profit_amount: product.profit_amount || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        main_image_path: null, // Will be set after image upload
      };
      
      // Check if product already exists (if updateExisting is false)
      if (options?.updateExisting === false) {
        const { data: existing } = await supabase
          .from("products")
          .select("uid")
          .eq("uid", product.uid)
          .single();
        
        if (existing) {
          // Product exists and updateExisting=false, skip it
          addWarning(`Product ${product.uid} already exists, skipping (updateExisting=false)`);
          summary.skipped_rows_count++;
          summary.warnings.push(`Skipped existing product: ${product.uid} (${product.name})`);
          continue; // Skip to next product
        }
      }

      let productUpsertSuccess = false;
      let productWasCreated = false;
      
      try {
        const { data: upsertData, error: upsertErr } = await supabase.from("products")
          .upsert(productPayload as any, { onConflict: "uid" })
          .select("uid, created_at")
          .single();

        if (upsertErr) {
          // Record error and try fallback INSERT
          console.error(`❌ Product upsert failed for ${product.uid}:`, upsertErr.message);
          addRowError(
            validProducts.indexOf(product) + 2,
            "product",
            `Upsert failed: ${upsertErr.message}`,
            product
          );
          
          // Fallback: try plain INSERT to detect DB errors
          try {
            const { data: insertData, error: insertErr } = await supabase.from("products")
              .insert(productPayload as any)
              .select("uid, created_at")
              .single();

            if (insertErr) {
              addRowError(
                validProducts.indexOf(product) + 2,
                "product",
                `Insert fallback failed: ${insertErr.message}`,
                product
              );
              continue; // Skip this product
            }

            // Success: treat as created
            productUpsertSuccess = true;
            productWasCreated = true;
            summary.products_created++;
            console.log(`✅ Product ${product.uid} created via fallback INSERT`);
          } catch (insertException: any) {
            addRowError(
              validProducts.indexOf(product) + 2,
              "product",
              `Insert exception: ${insertException.message}`,
              product
            );
            continue; // Skip this product
          }
        } else if (!upsertData) {
          // Upsert returned no data - try fallback INSERT
          console.warn(`⚠️ Product upsert returned no data for ${product.uid}, trying INSERT fallback`);
          try {
            const { data: insertData, error: insertErr } = await supabase.from("products")
              .insert(productPayload as any)
              .select("uid, created_at")
              .single();

            if (insertErr) {
              addRowError(
                validProducts.indexOf(product) + 2,
                "product",
                `Insert fallback failed: ${insertErr.message}`,
                product
              );
              continue;
            }

            productUpsertSuccess = true;
            productWasCreated = true;
            summary.products_created++;
            console.log(`✅ Product ${product.uid} created via fallback INSERT (no upsert data)`);
          } catch (insertException: any) {
            addRowError(
              validProducts.indexOf(product) + 2,
              "product",
              `Insert exception: ${insertException.message}`,
              product
            );
            continue;
          }
        } else {
            // Upsert succeeded - determine if created or updated
            productUpsertSuccess = true;
            const upsertDataTyped = upsertData as { uid: string; created_at?: string } | null;
            const createdAt = upsertDataTyped?.created_at ? new Date(upsertDataTyped.created_at) : null;
          const now = new Date();
          
          if (createdAt) {
            const diffMs = now.getTime() - createdAt.getTime();
            if (diffMs < 60000) {
              productWasCreated = true;
              summary.products_created++;
            } else {
              summary.products_updated++;
            }
          } else {
            // No created_at, assume created
            productWasCreated = true;
            summary.products_created++;
          }
          console.log(`✅ Product ${product.uid} ${productWasCreated ? 'created' : 'updated'}`);
        }
      } catch (upsertException: any) {
        addRowError(
          validProducts.indexOf(product) + 2,
          "product",
          `Upsert exception: ${upsertException.message}`,
          product
        );
        continue; // Skip this product
      }
      
      // If product upsert failed, skip to next product
      if (!productUpsertSuccess) {
        continue;
      }

      // Upsert Product Tags (Pivot table - if exists)
      if (tagsArray.length > 0) {
        const tagLinks = tagsArray.map(t => {
          const tId = tagMap.get(t);
          return tId ? { product_uid: product.uid, tag_id: tId } : null;
        }).filter(Boolean) as Array<{ product_uid: string; tag_id: string }>;
        
        if (tagLinks.length > 0) {
          // Check if product_tags table exists by trying to insert
          try {
            await supabase.from("product_tags").upsert(tagLinks as any, { onConflict: "product_uid,tag_id" });
          } catch (e) {
            // Table might not exist, skip silently
            console.warn("⚠️ product_tags table not found, skipping tag links");
          }
        }
      }

      // Upload main image if provided
      let mainImagePath: string | null = null;
      if (product.main_image_url) {
        try {
          mainImagePath = await uploadImageToStorage(supabase, product.main_image_url, product.uid);
          if (mainImagePath) {
            const updateData = { main_image_path: mainImagePath };
            // @ts-expect-error - Supabase type inference issue with update chain
            await supabase.from("products").update(updateData).eq("uid", product.uid);
            summary.images_queued++;
          }
        } catch (error: any) {
          summary.imageErrors.push({
            product_uid: product.uid,
            url: product.main_image_url,
            reason: error.message
          });
          summary.products_with_pending_images.push(product.uid);
        }
      }

      // Upsert Variants
      for (const v of finalVariants) {
        const colorId = v.color ? (colorMap.get(v.color) || colorMap.get("default")) : colorMap.get("default");
        const sizeId = v.size ? sizeMap.get(v.size) : null;

        if (!colorId || !sizeId) {
          summary.errors.push({
            row_index: -1,
            file_type: "variant",
            error_message: `Missing Color/Size ID for SKU ${v.sku}`,
            data_snippet: v,
          });
          continue;
        }

        // Get merged images for this SKU
        const images = variantImageMap.get(v.sku) || v.images || [];
        const imagesJson = images.length > 0 ? images : null;

        const variantInsert = {
          product_uid: product.uid,
          sku: v.sku,
          color_id: colorId,
          size_id: sizeId,
          stock: v.stock,
          price: v.price || product.price,
          cost: v.cost || null,
          active: v.is_active,
          images: imagesJson as any,
        };
        
        // Check if variant already exists (if updateExisting is false)
        if (options?.updateExisting === false) {
          const { data: existing } = await supabase
            .from("product_variants")
            .select("sku")
            .eq("sku", v.sku)
            .single();
          
          if (existing) {
            // Variant exists and updateExisting=false, skip it
            addWarning(`Variant SKU ${v.sku} already exists, skipping (updateExisting=false)`);
            summary.skipped_rows_count++;
            summary.warnings.push(`Skipped existing variant: ${v.sku}`);
            continue; // Skip to next variant
          }
        }

        let variantUpsertSuccess = false;
        let variantWasCreated = false;
        
        try {
          const { data: upsertData, error: upsertErr } = await supabase.from("product_variants")
            .upsert(variantInsert as any, { onConflict: "sku" })
            .select("sku, created_at")
            .single();

          if (upsertErr) {
            // Record error and try fallback INSERT
            console.error(`❌ Variant upsert failed for ${v.sku}:`, upsertErr.message);
            addRowError(
              -1, // Row index not available in merged variants
              "variant",
              `Upsert failed for SKU ${v.sku}: ${upsertErr.message}`,
              v
            );
            
            // Fallback: try plain INSERT
            try {
              const { data: insertData, error: insertErr } = await supabase.from("product_variants")
                .insert(variantInsert as any)
                .select("sku, created_at")
                .single();

              if (insertErr) {
                addRowError(
                  -1,
                  "variant",
                  `Insert fallback failed for SKU ${v.sku}: ${insertErr.message}`,
                  v
                );
                continue; // Skip this variant
              }

              variantUpsertSuccess = true;
              variantWasCreated = true;
              summary.variants_created++;
              console.log(`✅ Variant ${v.sku} created via fallback INSERT`);
            } catch (insertException: any) {
              addRowError(
                -1,
                "variant",
                `Insert exception for SKU ${v.sku}: ${insertException.message}`,
                v
              );
              continue;
            }
          } else if (!upsertData) {
            // Upsert returned no data - try fallback INSERT
            console.warn(`⚠️ Variant upsert returned no data for ${v.sku}, trying INSERT fallback`);
            try {
              const { data: insertData, error: insertErr } = await supabase.from("product_variants")
                .insert(variantInsert as any)
                .select("sku, created_at")
                .single();

              if (insertErr) {
                addRowError(
                  -1,
                  "variant",
                  `Insert fallback failed for SKU ${v.sku}: ${insertErr.message}`,
                  v
                );
                continue;
              }

              variantUpsertSuccess = true;
              variantWasCreated = true;
              summary.variants_created++;
              console.log(`✅ Variant ${v.sku} created via fallback INSERT (no upsert data)`);
            } catch (insertException: any) {
              addRowError(
                -1,
                "variant",
                `Insert exception for SKU ${v.sku}: ${insertException.message}`,
                v
              );
              continue;
            }
          } else {
            // Upsert succeeded - determine if created or updated
            variantUpsertSuccess = true;
            const upsertDataTyped = upsertData as { sku: string; created_at?: string } | null;
            const createdAt = upsertDataTyped?.created_at ? new Date(upsertDataTyped.created_at) : null;
            const now = new Date();
            
            if (createdAt) {
              const diffMs = now.getTime() - createdAt.getTime();
              if (diffMs < 60000) {
                variantWasCreated = true;
                summary.variants_created++;
              } else {
                summary.variants_updated++;
              }
            } else {
              variantWasCreated = true;
              summary.variants_created++;
            }
            console.log(`✅ Variant ${v.sku} ${variantWasCreated ? 'created' : 'updated'}`);
          }
        } catch (upsertException: any) {
          addRowError(
            -1,
            "variant",
            `Upsert exception for SKU ${v.sku}: ${upsertException.message}`,
            v
          );
          continue;
        }
        
        // If variant upsert failed, skip image upload
        if (!variantUpsertSuccess) {
          continue;
        }

        // Upload variant images
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            try {
              const imagePath = await uploadImageToStorage(supabase, images[i], product.uid, v.sku, i);
              if (imagePath) {
                // Create product_images record
                await supabase.from("product_images").insert({
                  product_uid: product.uid,
                  image_path: imagePath,
                  type: "variant",
                  display_order: i,
                  alt_text: `${product.uid} variant ${v.sku} image ${i + 1}`,
                } as any);
                summary.images_queued++;
              }
            } catch (error: any) {
              summary.imageErrors.push({
                product_uid: product.uid,
                url: images[i],
                reason: error.message
              });
            }
          }
        }
      }
    }

    // Set batch ID in summary
    summary.batchId = batchId;

    // Update import_runs record with final summary (only if not dry run)
    if (!options?.dryRun && importRunId) {
      try {
        const finalStatus = summary.errors.length > 0 && summary.products_created === 0 && summary.variants_created === 0
          ? "failed"
          : "completed";
        
        const updatePayload: any = {
          status: finalStatus,
          completed_at: new Date().toISOString(),
          summary: {
            products_created: summary.products_created,
            products_updated: summary.products_updated,
            variants_created: summary.variants_created,
            variants_updated: summary.variants_updated,
            images_queued: summary.images_queued,
            errors: summary.errors,
            warnings: summary.warnings,
            skipped_rows_count: summary.skipped_rows_count,
          },
          errors: summary.errors,
        };
        // @ts-expect-error - Supabase type inference issue with update chain
        await supabase.from("import_runs").update(updatePayload).eq("id", importRunId);
        
        console.log(`📝 Updated import run ${batchId} with status: ${finalStatus}`);
      } catch (updateError: any) {
        console.error("❌ Failed to update import run:", updateError);
        addWarning(`Failed to update import run record: ${updateError.message}`);
      }
    }

    console.log("✅ Import Summary:", {
      batch_id: batchId,
      products_created: summary.products_created,
      products_updated: summary.products_updated,
      variants_created: summary.variants_created,
      variants_updated: summary.variants_updated,
      images_queued: summary.images_queued,
      errors: summary.errors.length,
      warnings: summary.warnings.length,
      skipped_rows: summary.skipped_rows_count,
    });

  } catch (globalError: any) {
    console.error("❌ Critical Importer Failure:", globalError);
    summary.success = false;
    summary.errors.push({
      row_index: 0,
      file_type: "product",
      error_message: `Critical Importer Failure: ${globalError.message}`,
    });
    
    // Update import_runs status to failed if record exists
    if (!options?.dryRun && importRunId) {
      try {
        const failedPayload = {
          status: "failed",
          completed_at: new Date().toISOString(),
          errors: summary.errors as any,
        };
        // @ts-expect-error - Supabase type inference issue with update chain
        await supabase.from("import_runs").update(failedPayload as any).eq("id", importRunId);
      } catch (updateError: any) {
        console.error("❌ Failed to update import run status to failed:", updateError);
      }
    }
  }

  return summary;
}
