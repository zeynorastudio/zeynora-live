import { createServiceRoleClient } from "@/lib/supabase/server";
import { CategoryInput, categoryReorderSchema } from "@/lib/admin/validators";
import { z } from "zod";

export async function getCategoryTree() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("position", { ascending: true }); // sort_order/position

  if (error) throw error;
  // Build tree in client or here? 
  // Let's return flat list sorted by position, client builds tree for UI
  return data || [];
}

export async function createCategory(input: CategoryInput, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(input as unknown as never)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>, userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("categories")
    .update(input as unknown as never)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string) {
  const supabase = createServiceRoleClient();
  // Check children?
  // For now, standard delete. Database constraints (FK) might block if children exist or cascade.
  // Assuming cascade or user must handle. UI should warn.
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderCategories(items: z.infer<typeof categoryReorderSchema>): Promise<void> {
  const supabase = createServiceRoleClient();
  // Bulk update position/parent
  // Supabase doesn't support bulk update of different values efficiently without upsert or RPC.
  // We'll iterate for safety (scale is usually small for categories < 100).
  // Or use upsert with ID.
  const updates = items.map((item: z.infer<typeof categoryReorderSchema>[number]) => ({
    id: item.id,
    parent_id: item.parent_id,
    position: item.position,
    updated_at: new Date().toISOString()
  }));

  // We need to fetch existing fields to satisfy NOT NULL if upserting? 
  // "categories" usually has required name/slug. Upsert requires them if it's an insert. 
  // But for update on ID match, we can do partial? 
  // Supabase JS `upsert` performs INSERT on conflict UPDATE. If row exists, it updates.
  // BUT if we omit required fields (name), does it fail? 
  // Yes, typically `upsert` payload must satisfy constraint if it were an insert.
  // So `update` in loop is safer for partial updates unless we use a custom RPC `update_category_positions`.
  
  for (const update of updates) {
    await supabase.from("categories").update(update as unknown as never).eq("id", update.id);
  }
}

