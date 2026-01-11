import { z } from "zod";

export const productReorderSchema = z.array(
  z.object({
    product_uid: z.string().min(1),
    sort_order: z.number().int().min(1),
  })
);

export type ProductReorderInput = z.infer<typeof productReorderSchema>;
