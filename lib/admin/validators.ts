import { z } from "zod";

// Shared Fields
const seoSchema = z.object({
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

// Category Schemas
export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  parent_id: z.string().nullable().optional(), // UUID or null
  position: z.number().int().default(0),
  is_active: z.boolean().default(true),
  show_in_megamenu: z.boolean().default(false),
  ...seoSchema.shape,
});

export const categoryReorderSchema = z.array(
  z.object({
    id: z.string(), // UUID
    parent_id: z.string().nullable(),
    position: z.number().int(),
  })
);

// Collection Schemas
export const ruleSchema = z.object({
  field: z.enum(["tags", "category", "price", "season", "occasion", "featured", "created_at"]),
  operator: z.enum(["equals", "contains", "gt", "lt", "in", "between"]),
  value: z.any(), // Value depends on field
});

export const collectionSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  is_manual: z.boolean().default(true),
  rule_json: z.array(ruleSchema).optional(), // For smart collections
  banner_path: z.string().optional(),
  tile_path: z.string().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(false),
  start_time: z.string().nullable().optional(), // ISO date string
  end_time: z.string().nullable().optional(),
  ...seoSchema.shape,
});

export const collectionAssignSchema = z.object({
  action: z.enum(["add", "remove"]),
  product_uids: z.array(z.string()),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
export type CollectionRule = z.infer<typeof ruleSchema>;

