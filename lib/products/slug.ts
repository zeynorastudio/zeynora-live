import { createServiceRoleClient } from "@/lib/supabase/server";

export async function generateUniqueSlug(
  base: string, 
  collection: "products" | "categories" = "products",
  excludeUid?: string
): Promise<string> {
  const supabase = createServiceRoleClient();
  let slug = base;
  let counter = 1;

  while (true) {
    let query = supabase
      .from(collection)
      .select("uid")
      .eq("slug", slug);
    
    // Exclude current product if updating
    if (excludeUid && collection === "products") {
      query = query.neq("uid", excludeUid);
    }
    
    const { data } = await query.single();
    
    if (!data) return slug; // Unique

    slug = `${base}-${counter}`;
    counter++;
  }
}

