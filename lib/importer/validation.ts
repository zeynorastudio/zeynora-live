import { z } from "zod";

export const productCSVSchema = z.object({
  UID: z.string().optional(), // UID is optional - will be generated if missing
  "Product Name": z.string().min(1, "Product Name is required"),
  Slug: z.string().min(1, "Slug is required"),
  Category: z.string(),
  "Super Category": z.string(),
  Subcategory: z.string(),
  Style: z.string(),
  Occasion: z.string(),
  Season: z.string(),
  Featured: z.string(), // "TRUE"/"FALSE" or "1"/"0"
  "Best Selling": z.string(),
  Active: z.string(),
  Price: z.string(),
  "Cost Price": z.string(),
  "Profit %": z.string(),
  "Profit Amount": z.string(),
  "SEO Title": z.string(),
  "SEO Description": z.string(),
  Colors: z.string(),
  Sizes_With_Stock: z.string(), // e.g. "S:10|M:5"
  Tags: z.string(),
  "Main Image URL": z.string(),
});

export const variantCSVSchema = z.object({
  Product_UID: z.string().min(1, "Product_UID is required"),
  Product_Name: z.string(),
  Slug: z.string(),
  Category: z.string(),
  Subcategory: z.string(),
  Style: z.string(),
  Season: z.string(),
  Occasion: z.string(),
  Variant_SKU: z.string().min(1, "Variant_SKU is required"),
  Color: z.string(),
  Size: z.string(),
  Stock: z.string(),
  Price: z.string(),
  Cost: z.string(),
  Active: z.string(),
  Tag_List: z.string().optional(), // Comma-separated tags for product
  Images_JSON: z.string(), // JSON string
});

