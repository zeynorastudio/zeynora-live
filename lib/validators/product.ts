import { z } from "zod";

/**
 * Product creation validation schema
 */
export const productCreateSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  costPrice: z.number().min(0).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  superCategory: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  occasion: z.enum(['wedding', 'festive', 'casual', 'party', 'formal', 'semi_formal', 'daily', 'premium']).optional().nullable(),
  season: z.enum(['summer', 'winter', 'spring', 'autumn', 'all_seasons']).optional().nullable(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  sizesWithStock: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  bestSelling: z.boolean().default(false),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/**
 * Product update validation schema
 */
export const productUpdateSchema = productCreateSchema.partial();

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
