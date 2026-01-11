import { z } from "zod";

/**
 * Product Schema - Phase 1.1 Unified Data Model
 * 
 * KEY RULES:
 * 1. Subcategory is MANDATORY
 * 2. Category is auto-derived (or manually overridden)
 * 3. Tags are AUTO-GENERATED (no manual input)
 * 4. Sort order is mandatory
 * 5. All visibility flags must be supported
 */

// Base product schema without refinement (so we can call .partial() on it)
const productBaseSchema = z.object({
  // Required fields
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters"),
  price: z.number().min(0, "Price must be 0 or greater"),
  
  // Subcategory is MANDATORY (format: "Name" or "Name (Category)")
  subcategory: z.string().min(1, "Subcategory is required"),
  
  // Sort order is MANDATORY (lower number = higher priority)
  sort_order: z.number().int().min(0).default(999),
  
  // Optional descriptive fields
  description: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  occasion: z.string().optional().nullable(),
  season: z.string().optional().nullable(),
  
  // Category fields (auto-derived from subcategory, but can be overridden)
  category_override: z.string().optional().nullable(),
  super_category: z.string().optional().nullable(), // Legacy/denormalized
  
  // Tags are AUTO-GENERATED - DO NOT ACCEPT MANUAL INPUT
  // This field is marked as optional here but will be auto-populated
  tags: z.array(z.string()).optional().default([]),
  
  // Pricing fields
  cost_price: z.number().min(0).optional().nullable(),
  strike_price: z.number().min(0).optional().nullable(),
  on_sale: z.boolean().default(false),
  
  // Visibility flags
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_best_selling: z.boolean().default(false),
  is_new_launch: z.boolean().default(false),
  
  // Variant creation support (for initial product creation)
  colors: z.array(z.string()).optional().default([]),
  sizes_with_stock: z.string().optional().nullable(),
});

// Create schema with sale validation refinement
export const productCreateSchema = productBaseSchema.refine((data) => {
  // Sale validation: if on_sale is true, strike_price must be > price
  if (data.on_sale && data.strike_price !== null && data.strike_price !== undefined) {
    return data.strike_price > data.price;
  }
  return true;
}, {
  message: "Strike price must be greater than regular price when on sale",
  path: ["strike_price"],
});

// Update schema: make all fields optional except uid, apply same refinement
export const productUpdateSchema = productBaseSchema.partial().extend({
  uid: z.string().min(1),
}).refine((data) => {
  // Sale validation: only validate if on_sale is true and strike_price is provided
  if (data.on_sale && data.strike_price !== null && data.strike_price !== undefined && data.price !== undefined) {
    return data.strike_price > data.price;
  }
  return true;
}, {
  message: "Strike price must be greater than regular price when on sale",
  path: ["strike_price"],
});

export const variantStockSchema = z.object({
  stock: z.number().min(0),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

