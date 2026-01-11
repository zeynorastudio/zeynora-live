import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

// Helper to normalize product data if needed (placeholder)
function normalizeProduct(p: any) {
  return p;
}

export async function getCollectionBySlug(slug: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("collections") // Assuming 'collections' table exists
    .select("*")
    .eq("slug", slug)
    .single();
  
  if (error) return null;
  const typedCollection = data as { product_uids?: string[] | null } | null;
  return typedCollection;
}

export async function getCollectionProducts(collection_slug: string) {
  return unstable_cache(
    async () => {
      const collection = await getCollectionBySlug(collection_slug);
      // Assuming collection has product_uids array or logic
      const typedCollection = collection as { product_uids?: string[] | null } | null;
      if (!typedCollection || !typedCollection.product_uids || typedCollection.product_uids.length === 0) {
        return [];
      }

      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .in("uid", typedCollection.product_uids)
        .eq("active", true)
        // Phase 4.6 Requirement:
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) return [];

      return (data || []).map(normalizeProduct);
    },
    [`collection-products-${collection_slug}`],
    { tags: ["collections", "products", `collection-products-${collection_slug}`] }
  )();
}

export async function getCollections() {
  const supabase = await createServerClient();
  const { data } = await supabase.from("collections").select("*").eq("is_active", true); // assuming is_active
  return data || [];
}
