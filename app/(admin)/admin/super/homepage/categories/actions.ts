"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAudit } from "@/lib/audit/log";
import { HomepageCategory } from "@/lib/homepage/types";
import { revalidatePath } from "next/cache";
import { updateOrderIndices } from "@/lib/admin/reorder";

export async function getHomepageCategories() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  // Fetch joined data
  const { data, error } = await supabase
    .from("homepage_categories")
    .select("*, category:categories(name, slug)")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data as HomepageCategory[];
}

export async function getAvailableCategories() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");
    
  if (error) throw error;
  return data;
}

export async function createHomepageCategory(data: {
  category_id: string;
  image: string;
  title_override?: string;
}) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  // Get max order index
  const { data: max } = await supabase
    .from("homepage_categories")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const typedMax = max as { order_index: number } | null;
  const newIndex = (typedMax?.order_index ?? -1) + 1;

  const { data: newCat, error } = await supabase
    .from("homepage_categories")
    .insert({
      ...data,
      order_index: newIndex,
      status: 'draft',
      visible: true
    } as unknown as never)
    .select()
    .single();

  if (error) throw error;

  const typedCat = newCat as { id: string };
  await createAudit(session.user.id, "create_homepage_category", { id: typedCat.id, ...data });
  revalidatePath("/admin/super/homepage");
  return newCat;
}

export async function updateHomepageCategory(id: string, updates: Partial<HomepageCategory>) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_categories")
    .update({ ...updates, updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "update_homepage_category", { id, updates });
  revalidatePath("/admin/super/homepage");
}

export async function deleteHomepageCategory(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "delete_homepage_category", { id });
  revalidatePath("/admin/super/homepage");
}

export async function reorderHomepageCategories(items: { id: string; order_index: number }[]) {
  const session = await requireSuperAdmin();
  await updateOrderIndices("homepage_categories", items, session.user.id);
  revalidatePath("/admin/super/homepage");
}


