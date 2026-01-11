export interface ProductCSVRow {
  UID: string;
  "Product Name": string;
  Slug: string;
  Category: string;
  "Super Category": string;
  Subcategory: string;
  Style: string;
  Occasion: string;
  Season: string;
  Featured: string;
  "Best Selling": string;
  Active: string;
  Price: string;
  "Cost Price": string;
  "Profit %": string;
  "Profit Amount": string;
  "SEO Title": string;
  "SEO Description": string;
  Colors: string;
  Sizes_With_Stock: string;
  Tags: string;
  "Main Image URL": string;
}

export interface VariantCSVRow {
  Product_UID: string;
  Product_Name: string;
  Slug: string;
  Category: string;
  Subcategory: string;
  Style: string;
  Season: string;
  Occasion: string;
  Variant_SKU: string;
  Color: string;
  Size: string;
  Stock: string;
  Price: string;
  Cost: string;
  Active: string;
  Tag_List?: string; // Comma-separated tags for product
  Images_JSON: string;
}

export interface NormalizedProduct {
  uid: string;
  name: string;
  slug: string;
  category: string | null;
  super_category: string | null;
  subcategory: string | null;
  style: string | null;
  occasion: string | null;
  season: string | null;
  is_featured: boolean;
  is_best_selling: boolean;
  is_active: boolean;
  price: number;
  cost_price: number;
  profit_percentage: number;
  profit_amount: number;
  seo_title: string;
  seo_description: string;
  colors: string[];
  sizes_with_stock: Record<string, number>;
  tags: string[];
  single_color?: boolean;
  main_image_url: string;
}

export interface NormalizedVariant {
  product_uid: string;
  sku: string;
  color: string | null;
  size: string | null;
  stock: number;
  price: number;
  cost: number;
  is_active: boolean;
  images: string[];
}

export interface ImportSummary {
  success: boolean;
  total_products_processed: number;
  total_variants_processed: number;
  products_created: number;
  products_updated: number;
  variants_created: number;
  variants_updated: number;
  categories_created: number;
  tags_created: number;
  images_queued: number;
  errors: Array<{
    row_index: number;
    file_type: "product" | "variant";
    error_message: string;
    data_snippet?: any;
  }>;
  writeErrors: Array<{
    type: string;
    message: string;
    uid?: string;
    sku?: string;
  }>;
  imageErrors: Array<{product_uid: string; url: string; reason: string}>;
  skuConflicts: Array<{sku: string; resolvedTo: string}>;
  products_with_pending_images: string[];
  skipped_rows_count: number;
  warnings: string[];
  batchId?: string;
}

export interface ImportPreview {
  productsToCreate: number;
  variantsToCreate: number;
  productsNeedingUID: string[];
  generatedUIDs: Map<string, string>;
  duplicateSKUs: Array<{ sku: string; rows: number[] }>;
  variantImageMergePlan: Map<string, string[]>;
  missingImages: Array<{ product_uid: string; type: "main" | "variant" }>;
  conflicts: Array<{ type: "uid" | "sku"; value: string; message: string }>;
  errors: Array<{ row: number; file: "product" | "variant"; message: string }>;
}
