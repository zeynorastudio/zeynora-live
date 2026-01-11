import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children: CategoryNode[];
  is_featured?: boolean;
  tile_image_path?: string | null;
  description?: string | null;
}

function normalizeCategory(cat: any): CategoryNode {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    parent_id: cat.parent_id,
    children: [],
    is_featured: cat.is_featured || false,
    tile_image_path: cat.tile_image_path || null,
    description: cat.description || null,
  };
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return unstable_cache(
    async () => {
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id, is_featured, tile_image_path, description")
        .order("name");

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      // Type assertion
      const typedData = (data || []) as Array<{
        id: string;
        name: string;
        slug: string;
        parent_id: string | null;
        is_featured?: boolean;
        tile_image_path?: string | null;
        description?: string | null;
      }>;

      const map = new Map<string, CategoryNode>();
      const roots: CategoryNode[] = [];

      // 1. Create nodes
      typedData.forEach((cat) => {
        map.set(cat.id, normalizeCategory(cat));
      });

      // 2. Link children
      typedData.forEach((cat) => {
        if (cat.parent_id) {
          const parent = map.get(cat.parent_id);
          if (parent) {
            const child = map.get(cat.id);
            if (child) {
              parent.children.push(child);
            }
          }
        } else {
          const root = map.get(cat.id);
          if (root) {
            roots.push(root);
          }
        }
      });

      return roots;
    },
    ["category-tree"],
    { tags: ["categories"] }
  )();
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, banner_image_path, image_path")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  const typedData = data as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    banner_image_path: string | null;
    image_path: string | null;
  };

  return {
    id: typedData.id,
    name: typedData.name,
    slug: typedData.slug,
    description: typedData.description || "",
    banner_image_path: typedData.banner_image_path,
    images: {
      hero: typedData.banner_image_path || typedData.image_path,
    },
  };
}
