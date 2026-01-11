import { z } from "zod";

export const variantUpdateSchema = z.object({
  sku: z.string().min(1),
  stock: z.number().int().min(0),
  price: z.number().min(0).optional(), // Super admin only
  cost: z.number().min(0).optional(),  // Super admin only
  active: z.boolean().optional(),      // Super admin only
});

export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;
