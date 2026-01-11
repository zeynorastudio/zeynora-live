import { Database } from "./supabase";

export type AdminRole = "super_admin" | "admin";

export interface BatchUploadResponse {
  ok: boolean;
  uploaded: {
    filename: string;
    path: string;
    db_id?: string;
    public_url: string;
    warnings?: string[];
  }[];
  warnings?: string[];
}

export interface CreateProductPayload {
  uid: string;
  name: string;
  slug: string;
  category_id?: string;
  super_category?: string;
  subcategory?: string;
  price: number;
  cost_price?: number;
  description?: string; // If description added to schema later
  metadata?: any;
  active?: boolean;
}

export interface VariantGenerationPayload {
  colors: string[];
  sizes_with_stock: string; // "S-4, M-6"
  base_price?: number;
  base_cost?: number;
}

export interface ImageAttachPayload {
  images: {
    path: string;
    type?: string;
    sequence?: number;
    alt_text?: string;
    variant_sku?: string;
  }[];
}



