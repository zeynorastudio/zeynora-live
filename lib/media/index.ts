import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";
import slugify from "slugify";
import type { Database } from "@/types/supabase";

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Normalize image path to consistent format for database storage
 * Standard format: supabase://products/{path}
 */
export function normalizeImagePath(path: string, bucket: string = "products"): string {
  if (!path) return path;
  
  // Already in standard format
  if (path.startsWith(`supabase://${bucket}/`)) {
    return path;
  }
  
  // Remove any existing prefixes to get clean path
  let cleanPath = path;
  
  // Handle supabase:// without bucket
  if (cleanPath.startsWith("supabase://")) {
    cleanPath = cleanPath.replace("supabase://", "");
  }
  
  // Remove bucket prefix if present
  if (cleanPath.startsWith(`${bucket}/`)) {
    cleanPath = cleanPath.substring(bucket.length + 1);
  }
  
  // Remove leading slash
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.substring(1);
  }
  
  return `supabase://${bucket}/${cleanPath}`;
}

/**
 * Extract storage path from normalized image path for Supabase storage operations
 * Returns path without bucket prefix for storage.remove() calls
 */
export function extractStoragePath(imagePath: string, bucket: string = "products"): string {
  let path = imagePath;
  
  // Remove supabase://bucket/ prefix
  if (path.startsWith(`supabase://${bucket}/`)) {
    path = path.replace(`supabase://${bucket}/`, "");
  } else if (path.startsWith("supabase://")) {
    path = path.replace("supabase://", "");
  }
  
  // Remove bucket/ prefix if still present
  if (path.startsWith(`${bucket}/`)) {
    path = path.substring(bucket.length + 1);
  }
  
  // Remove leading slash
  if (path.startsWith("/")) {
    path = path.substring(1);
  }
  
  return path;
}

/**
 * Generate normalized filename from original filename
 * Uses timestamp + normalized slug
 */
export function generateImageFilename(originalFilename: string, productUid: string): string {
  const timestamp = Date.now();
  const extension = originalFilename.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = originalFilename.replace(/\.[^/.]+$/, ""); // Remove extension
  const slug = slugify(baseName, { lower: true, strict: true, trim: true }) || "image";
  
  return `${timestamp}-${slug}.${extension}`;
}

/**
 * Generate storage path for product image
 * Format: products/{product_uid}/{filename}
 * Supports nested paths like products/{uid}/gallery/{filename}
 */
export function generateProductImagePath(productUid: string, filename: string): string {
  // If filename already includes path separators (e.g., "gallery/file.jpg"), use as-is
  if (filename.includes("/")) {
    return `products/${productUid}/${filename}`;
  }
  return `products/${productUid}/${filename}`;
}

/**
 * Upload image to Supabase storage
 * Returns the storage path
 */
export async function uploadProductImage(
  productUid: string,
  file: File | Buffer,
  filename?: string
): Promise<string> {
  const supabase = createServiceRoleClient();
  
  const finalFilename = filename || generateImageFilename(
    file instanceof File ? file.name : "image.jpg",
    productUid
  );
  
  const storagePath = generateProductImagePath(productUid, finalFilename);
  
  const fileBuffer = file instanceof File 
    ? Buffer.from(await file.arrayBuffer())
    : file;
  
  const { data, error } = await supabase.storage
    .from("products")
    .upload(storagePath, fileBuffer, {
      contentType: file instanceof File ? file.type : "image/jpeg",
      upsert: false, // Don't overwrite - caller should delete old file first if needed
    });
  
  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
  
  // Return path for database storage
  return `supabase://products/${storagePath}`;
}

/**
 * Save product image record to database
 */
export async function saveProductImage(
  productUid: string,
  imagePath: string,
  options?: {
    variantSku?: string | null;
    displayOrder?: number;
    altText?: string;
    type?: string;
    isMain?: boolean;
  }
): Promise<string> {
  const supabase = createServiceRoleClient();
  
  // Get current max display_order for this product
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
  
  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_uid: productUid,
      image_path: imagePath,
      variant_sku: options?.variantSku || null,
      display_order: displayOrder,
      alt_text: options?.altText || null,
      type: options?.type || null,
    } as unknown as never)
    .select("id")
    .single();
  
  if (error) {
    throw new Error(`Failed to save image record: ${error.message}`);
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
      await setProductMainImage(productUid, imagePath, null);
    }
  }
  
  return typedData.id;
}

/**
 * Update product main image
 */
export async function setProductMainImage(
  productUid: string,
  imagePath: string,
  actorId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();
  
  const { error } = await supabase
    .from("products")
    .update({ main_image_path: imagePath } as unknown as never)
    .eq("uid", productUid);
  
  if (error) {
    throw new Error(`Failed to set main image: ${error.message}`);
  }
  
  // Audit log
  await createAudit(actorId, "set_main_image", {
    product_uid: productUid,
    image_path: imagePath,
  });
}

/**
 * Update display order for product images
 */
export async function updateImageDisplayOrder(
  imageId: string,
  displayOrder: number
): Promise<void> {
  const supabase = createServiceRoleClient();
  
  const { error } = await supabase
    .from("product_images")
    .update({ display_order: displayOrder } as unknown as never)
    .eq("id", imageId);
  
  if (error) {
    throw new Error(`Failed to update display order: ${error.message}`);
  }
}

/**
 * Assign image to variant SKU
 */
export async function assignImageToVariant(
  imageId: string,
  variantSku: string | null,
  actorId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();
  
  // Verify variant exists if SKU provided
  if (variantSku) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("sku")
      .eq("sku", variantSku)
      .single();
    
    if (error || !data) {
      throw new Error(`Variant SKU ${variantSku} not found`);
    }
  }
  
  const { error: updateError } = await supabase
    .from("product_images")
    .update({ variant_sku: variantSku } as unknown as never)
    .eq("id", imageId);
  
  if (updateError) {
    throw new Error(`Failed to assign image to variant: ${updateError.message}`);
  }
  
  // Audit log
  await createAudit(actorId, "assign_image_to_variant", {
    image_id: imageId,
    variant_sku: variantSku,
  });
}

/**
 * Delete product image (both storage and DB record)
 */
export async function deleteProductImage(
  imageId: string,
  actorId: string | null
): Promise<void> {
  const supabase = createServiceRoleClient();
  
  // Get image record to find storage path
  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("image_path, product_uid")
    .eq("id", imageId)
    .single();
  
  if (fetchError || !image) {
    throw new Error(`Image not found: ${imageId}`);
  }
  
  const typedImage = image as { image_path: string; product_uid: string | null };
  
  // Extract storage path using utility function for consistent handling
  const storagePath = extractStoragePath(typedImage.image_path, "products");
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("products")
    .remove([storagePath]);
  
  if (storageError) {
    console.warn(`Failed to delete from storage: ${storageError.message}`);
    // Continue with DB deletion even if storage deletion fails
  }
  
  // Delete DB record
  const { error: dbError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);
  
  if (dbError) {
    throw new Error(`Failed to delete image record: ${dbError.message}`);
  }
  
  // Audit log
  await createAudit(actorId, "delete_product_image", {
    image_id: imageId,
    product_uid: typedImage.product_uid,
    image_path: typedImage.image_path,
  });
}


