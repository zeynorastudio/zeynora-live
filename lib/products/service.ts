/**
 * Product Service Layer
 * Typed service functions for product operations using service role client
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";
import { getPublicUrl } from "@/lib/utils/images";
import type { Database } from "@/types/supabase";

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
type VariantInsert = Database["public"]["Tables"]["product_variants"]["Insert"];
type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];
type ProductImageInsert = Database["public"]["Tables"]["product_images"]["Insert"];

export interface NormalizedProduct {
  uid: string;
  name: string;
  slug: string;
  category_id?: string | null;
  super_category?: string | null;
  subcategory?: string | null;
  style?: string | null;
  occasion?: string | null;
  season?: string | null;
  price: number;
  cost_price?: number | null;
  profit_percent?: number | null;
  profit_amount?: number | null;
  tags?: string[];
  main_image_path?: string | null;
  active?: boolean;
  featured?: boolean;
  best_selling?: boolean;
  new_launch?: boolean;
  on_sale?: boolean;
  strike_price?: number | null;
  sale_price?: number | null;
  sort_order?: number | null;
  metadata?: Record<string, any>;
}

export interface NormalizedVariant {
  product_uid: string;
  sku: string;
  color_id?: string | null;
  size_id?: string | null;
  stock: number;
  price?: number | null;
  cost?: number | null;
  active?: boolean;
}

export interface ProductListItem {
  uid: string;
  name: string;
  slug: string;
  price: number;
  strike_price: number | null;
  sale_price: number | null;
  on_sale: boolean;
  main_image_path: string | null;
  thumbnail_url: string;
  active: boolean;
  sort_order: number | null;
  created_at: string;
}

/**
 * Insert a new product
 */
export async function insertProduct(
  product: NormalizedProduct,
  actorId: string | null
): Promise<{ uid: string }> {
  const supabase = createServiceRoleClient();

  const insertData: ProductInsert = {
    uid: product.uid,
    name: product.name,
    slug: product.slug,
    category_id: product.category_id || null,
    super_category: product.super_category || null,
    subcategory: product.subcategory || null,
    style: product.style || null,
    occasion: (product.occasion as any) || null,
    season: (product.season as any) || null,
    description: product.description || null,
    price: product.price,
    cost_price: product.cost_price || null,
    profit_percent: product.profit_percent || null,
    profit_amount: product.profit_amount || null,
    tags: product.tags || [],
    main_image_path: product.main_image_path || null,
    active: product.active !== false,
    featured: product.featured || false,
    best_selling: product.best_selling || false,
    new_launch: product.new_launch || false,
    on_sale: product.on_sale || false,
    strike_price: product.strike_price || null,
    sale_price: product.sale_price || null,
    sort_order: product.sort_order || null,
    metadata: product.metadata || {},
  };

  const { data, error } = await supabase
    .from("products")
    .insert(insertData as unknown as never)
    .select("uid")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert product: ${error?.message || "Unknown error"}`);
  }

  const typedData = data as { uid: string };

  // Audit log
  await createAudit(actorId, "create_product", {
    product_uid: typedData.uid,
    name: product.name,
  });

  return { uid: typedData.uid };
}

/**
 * Upsert variants in batch
 */
export async function upsertVariantsBatch(
  variants: NormalizedVariant[],
  actorId: string | null
): Promise<void> {
  if (variants.length === 0) return;

  const supabase = createServiceRoleClient();

  const insertData: VariantInsert[] = variants.map((v) => ({
    product_uid: v.product_uid,
    sku: v.sku,
    color_id: v.color_id || null,
    size_id: v.size_id || null,
    stock: v.stock,
    price: v.price || null,
    cost: v.cost || null,
    active: v.active !== false,
  }));

  const { error } = await supabase
    .from("product_variants")
    .upsert(insertData as unknown as never, {
      onConflict: "sku",
    });

  if (error) {
    throw new Error(`Failed to upsert variants: ${error.message}`);
  }

  // Audit log
  await createAudit(actorId, "upsert_variants", {
    variant_count: variants.length,
    product_uid: variants[0]?.product_uid,
  });
}

/**
 * Get products list with thumbnails
 */
export async function getProductsList(opts?: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  orderBy?: "created_at" | "sort_order" | "name";
  orderDirection?: "asc" | "desc";
}): Promise<ProductListItem[]> {
  const supabase = createServiceRoleClient();
  const {
    page = 1,
    limit = 20,
    search,
    active,
    orderBy = "sort_order",
    orderDirection = "desc",
  } = opts || {};

  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select(
      "uid, name, slug, price, strike_price, sale_price, on_sale, main_image_path, active, sort_order, created_at",
      { count: "exact" }
    );

  if (search) {
    query = query.or(`uid.ilike.%${search}%,name.ilike.%${search}%`);
  }

  if (active !== undefined) {
    query = query.eq("active", active);
  }

  if (orderBy === "sort_order") {
    query = query.order("sort_order", {
      ascending: orderDirection === "asc",
      nullsFirst: false,
    });
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order(orderBy, { ascending: orderDirection === "asc" });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const typedProducts = (data || []) as Array<{
    uid: string;
    name: string;
    slug: string;
    price: number;
    strike_price: number | null;
    sale_price: number | null;
    on_sale: boolean | null;
    main_image_path: string | null;
    active: boolean;
    sort_order: number | null;
    created_at: string;
  }>;

  // Get thumbnails - batch query for products without main_image_path
  const productsNeedingThumbnails = typedProducts.filter((p) => !p.main_image_path);
  const productUids = productsNeedingThumbnails.map((p) => p.uid);

  let thumbnailMap = new Map<string, string>();
  if (productUids.length > 0) {
    const { data: thumbnailImages } = await supabase
      .from("product_images")
      .select("product_uid, image_path")
      .in("product_uid", productUids)
      .order("display_order", { ascending: true });

    if (thumbnailImages) {
      const seenUids = new Set<string>();
      for (const img of thumbnailImages) {
        const typedImg = img as { product_uid: string; image_path: string };
        if (!seenUids.has(typedImg.product_uid)) {
          seenUids.add(typedImg.product_uid);
          thumbnailMap.set(typedImg.product_uid, typedImg.image_path);
        }
      }
    }
  }

  // Build result with thumbnails
  return typedProducts.map((product) => {
    let thumbnailUrl: string;

    if (product.main_image_path) {
      thumbnailUrl = getPublicUrl("products", product.main_image_path);
    } else {
      const thumbnailPath = thumbnailMap.get(product.uid);
      if (thumbnailPath) {
        thumbnailUrl = getPublicUrl("products", thumbnailPath);
      } else {
        thumbnailUrl = getPublicUrl("products", null);
      }
    }

    return {
      ...product,
      strike_price: product.strike_price ?? null,
      sale_price: product.sale_price ?? null,
      on_sale: product.on_sale ?? false,
      thumbnail_url: thumbnailUrl,
    };
  });
}

/**
 * Set main image for product
 */
export async function setMainImage(
  uid: string,
  path: string,
  actorId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("products")
    .update({ main_image_path: path } as unknown as never)
    .eq("uid", uid);

  if (error) {
    throw new Error(`Failed to set main image: ${error.message}`);
  }

  await createAudit(actorId, "set_main_image", {
    product_uid: uid,
    image_path: path,
  });
}

/**
 * Add product image to gallery
 */
export async function addProductImage(
  productUid: string,
  imagePath: string,
  options?: {
    displayOrder?: number;
    isMain?: boolean;
    altText?: string;
    type?: string;
  }
): Promise<string> {
  const supabase = createServiceRoleClient();

  // Get current max display_order
  let displayOrder = options?.displayOrder;
  if (displayOrder === undefined) {
    const { data: existing } = await supabase
      .from("product_images")
      .select("display_order")
      .eq("product_uid", productUid)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const typedExisting = existing as { display_order: number | null } | null;
    displayOrder = (typedExisting?.display_order ?? -1) + 1;
  }

  const insertData: ProductImageInsert = {
    product_uid: productUid,
    image_path: imagePath,
    display_order: displayOrder,
    alt_text: options?.altText || null,
    type: options?.type || null,
    variant_sku: null, // Single-color products don't use variant_sku for images
  };

  const { data, error } = await supabase
    .from("product_images")
    .insert(insertData as unknown as never)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to add product image: ${error?.message || "Unknown error"}`);
  }

  const typedData = data as { id: string };

  // If this is the main image and product doesn't have one, set it
  if (options?.isMain) {
    const { data: product } = await supabase
      .from("products")
      .select("main_image_path")
      .eq("uid", productUid)
      .single();

    const typedProduct = product as { main_image_path: string | null } | null;
    if (!typedProduct?.main_image_path) {
      await setMainImage(productUid, imagePath, null);
    }
  }

  return typedData.id;
}

/**
 * Create product (wrapper for insertProduct with additional processing)
 * Used by admin product creation API
 */
export async function createProduct(
  input: Partial<NormalizedProduct> & { name: string; slug: string; price: number },
  actorId: string | null
): Promise<{ uid: string }> {
  const { generateNextZYNUID } = await import("./index");
  
  // Generate UID if not provided
  const uid = await generateNextZYNUID();
  
  // If category_id is provided directly, use it; otherwise subcategory should have been resolved in API route
  const product: NormalizedProduct = {
    uid,
    name: input.name,
    slug: input.slug,
    price: input.price,
    category_id: input.category_id || (input as any).category_id, // Use resolved category_id
    super_category: input.super_category || (input as any).super_category, // Use derived super_category
    subcategory: input.subcategory,
    style: input.style,
    occasion: input.occasion,
    season: input.season,
    description: input.description,
    cost_price: input.cost_price,
    tags: input.tags,
    main_image_path: input.main_image_path,
    active: input.active,
    featured: input.featured,
    best_selling: input.best_selling,
    new_launch: input.new_launch,
    on_sale: input.on_sale,
    strike_price: input.strike_price,
    sale_price: input.sale_price,
    sort_order: input.sort_order,
    metadata: input.metadata,
  };

  return insertProduct(product, actorId);
}

/**
 * Update product details
 * Used for admin product updates
 */
export async function updateProduct(
  uid: string,
  updates: Partial<NormalizedProduct>,
  actorId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Get current product for audit log
  const { data: currentProduct, error: fetchError } = await supabase
    .from("products")
    .select("*")
    .eq("uid", uid)
    .single();

  if (fetchError || !currentProduct) {
    throw new Error(`Product ${uid} not found`);
  }

  // Build update object, only include provided fields
  const updateData: Record<string, unknown> = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.slug !== undefined) updateData.slug = updates.slug;
  if (updates.category_id !== undefined) updateData.category_id = updates.category_id;
  if (updates.super_category !== undefined) updateData.super_category = updates.super_category;
  if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory;
  if (updates.style !== undefined) updateData.style = updates.style;
  if (updates.occasion !== undefined) updateData.occasion = updates.occasion;
  if (updates.season !== undefined) updateData.season = updates.season;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.price !== undefined) updateData.price = updates.price;
  if (updates.cost_price !== undefined) updateData.cost_price = updates.cost_price;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.main_image_path !== undefined) updateData.main_image_path = updates.main_image_path;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.featured !== undefined) updateData.featured = updates.featured;
  if (updates.best_selling !== undefined) updateData.best_selling = updates.best_selling;
  if (updates.new_launch !== undefined) updateData.new_launch = updates.new_launch;
  if (updates.on_sale !== undefined) updateData.on_sale = updates.on_sale;
  if (updates.strike_price !== undefined) updateData.strike_price = updates.strike_price;
  if (updates.sale_price !== undefined) updateData.sale_price = updates.sale_price;
  if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  // Add timestamp
  updateData.updated_at = new Date().toISOString();

  const { data: updatedRows, error: updateError } = await supabase
    .from("products")
    .update(updateData)
    .eq("uid", uid)
    .select("uid");

  if (updateError) {
    throw new Error(`Failed to update product: ${updateError.message}`);
  }

  // Verify that a row was actually updated
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error(`Product with uid ${uid} not found or update did not affect any rows`);
  }

  // Audit log
  await createAudit(actorId, "update_product", {
    product_uid: uid,
    updated_fields: Object.keys(updateData).filter(k => k !== "updated_at"),
  });
}

/**
 * Update variant stock with inventory logging
 * Used for admin stock adjustments - writes to inventory_log for traceability
 */
export async function updateVariantStock(
  sku: string,
  newStock: number,
  actorId: string | null,
  reason?: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Validate stock is non-negative
  if (newStock < 0) {
    throw new Error("Stock cannot be negative");
  }

  // Get current variant data
  const { data: variant, error: fetchError } = await supabase
    .from("product_variants")
    .select("id, sku, stock, product_uid")
    .eq("sku", sku)
    .single();

  if (fetchError || !variant) {
    throw new Error(`Variant with SKU ${sku} not found`);
  }

  const typedVariant = variant as {
    id: string;
    sku: string;
    stock: number | null;
    product_uid: string;
  };

  const previousStock = typedVariant.stock ?? 0;
  const stockDelta = newStock - previousStock;

  // Update the stock
  const { error: updateError } = await supabase
    .from("product_variants")
    .update({ 
      stock: newStock,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("sku", sku);

  if (updateError) {
    throw new Error(`Failed to update stock: ${updateError.message}`);
  }

  // Write to inventory_log for traceability
  const { error: logError } = await supabase
    .from("inventory_log")
    .insert({
      variant_id: typedVariant.id,
      change_type: "manual_adjustment",
      quantity: stockDelta,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: reason || "Admin stock adjustment",
      actor_id: actorId,
      created_at: new Date().toISOString(),
    } as unknown as never);

  if (logError) {
    // Log error but don't fail - stock update succeeded
    console.error("[INVENTORY] Failed to write inventory log:", {
      variant_id: typedVariant.id,
      sku,
      error: logError.message,
    });
  }

  // Audit log
  await createAudit(actorId, "update_variant_stock", {
    variant_id: typedVariant.id,
    sku,
    product_uid: typedVariant.product_uid,
    previous_stock: previousStock,
    new_stock: newStock,
    delta: stockDelta,
    reason: reason || "Admin stock adjustment",
  });
}

/**
 * Log inventory change for order-related stock decrements
 * Called after RPC decrement to maintain audit trail
 */
export async function logInventoryChange(
  variantId: string,
  changeType: "order_decrement" | "return_credit" | "manual_adjustment",
  quantity: number,
  orderId?: string,
  reason?: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error: logError } = await supabase
    .from("inventory_log")
    .insert({
      variant_id: variantId,
      change_type: changeType,
      quantity: quantity,
      order_id: orderId || null,
      reason: reason || null,
      actor_id: null, // System operation
      created_at: new Date().toISOString(),
    } as unknown as never);

  if (logError) {
    console.error("[INVENTORY] Failed to write inventory log:", {
      variant_id: variantId,
      change_type: changeType,
      quantity,
      error: logError.message,
    });
  }
}
