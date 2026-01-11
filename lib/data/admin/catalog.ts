import { createServerClient } from "@/lib/supabase/server";

export type AdminCatalogItem = {
  uid: string;
  name: string;
  slug: string;
  active: boolean;
  category: string | null;
  variants: {
    sku: string;
    color: string;
    size: string;
    stock: number;
    color_name?: string; 
    size_code?: string;  
  }[];
};

export async function getAdminCatalog(): Promise<AdminCatalogItem[]> {
  const supabase = await createServerClient();
  
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      uid,
      name,
      slug,
      active,
      category_id,
      categories (name),
      product_variants (
        sku,
        stock,
        color_id,
        size_id,
        colors (name),
        sizes (code)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching admin catalog:", error);
    return [];
  }

  // Normalize
  return (products || []).map((p: any) => ({
    uid: p.uid,
    name: p.name,
    slug: p.slug,
    active: p.active,
    category: p.categories?.name || "Uncategorized",
    variants: (p.product_variants || []).map((v: any) => ({
      sku: v.sku,
      stock: v.stock,
      color: v.colors?.name || "Unknown",
      size: v.sizes?.code || "OS",
    })),
  }));
}
