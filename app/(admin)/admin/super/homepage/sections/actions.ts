"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAudit } from "@/lib/audit/log";
import { HomepageSection, HomepageSectionProduct } from "@/lib/homepage/types";
import { revalidatePath } from "next/cache";
import { updateOrderIndices } from "@/lib/admin/reorder";

export async function getHomepageSections() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("homepage_sections")
    .select("*, products:homepage_section_products(*, product:products(uid, name, slug, main_image_path))")
    .order("order_index", { ascending: true });

  if (error) throw error;

  // Sort products within sections by order_index
  const sections = data.map((section: any) => ({
    ...section,
    products: (section.products || []).sort((a: any, b: any) => a.order_index - b.order_index)
  }));

  return sections as HomepageSection[];
}

export async function createHomepageSection(data: {
  title: string;
  subtitle?: string;
  source_type: 'automatic' | 'manual';
  source_meta?: any;
  product_count?: number;
}) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { data: max } = await supabase
    .from("homepage_sections")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .single();
  
  const typedMax = max as { order_index: number } | null;
  const newIndex = (typedMax?.order_index ?? -1) + 1;

  const { data: newSection, error } = await supabase
    .from("homepage_sections")
    .insert({
      ...data,
      order_index: newIndex,
      status: 'draft',
      visible: true,
      product_count: data.product_count || 8
    } as unknown as never)
    .select()
    .single();

  if (error) throw error;

  const typedSection = newSection as { id: string };
  await createAudit(session.user.id, "create_homepage_section", { id: typedSection.id, ...data });
  revalidatePath("/admin/super/homepage");
  return newSection;
}

export async function updateHomepageSection(id: string, updates: Partial<HomepageSection>) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_sections")
    .update({ ...updates, updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", id);

  if (error) throw error;
  
  await createAudit(session.user.id, "update_homepage_section", { id, updates });
  revalidatePath("/admin/super/homepage");
}

export async function deleteHomepageSection(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
  if (error) throw error;

  await createAudit(session.user.id, "delete_homepage_section", { id });
  revalidatePath("/admin/super/homepage");
}

export async function reorderHomepageSections(items: { id: string; order_index: number }[]) {
  const session = await requireSuperAdmin();
  await updateOrderIndices("homepage_sections", items, session.user.id);
  revalidatePath("/admin/super/homepage");
}

// --- Product Management for Manual Sections ---

export async function addProductToSection(sectionId: string, productUid: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  // Get max index
  const { data: max } = await supabase
    .from("homepage_section_products")
    .select("order_index")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const typedMax = max as { order_index: number } | null;
  const newIndex = (typedMax?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from("homepage_section_products")
    .insert({
      section_id: sectionId,
      product_id: productUid,
      order_index: newIndex
    } as unknown as never)
    .select("*, product:products(uid, name, slug, main_image_path)")
    .single();

  if (error) throw error;

  await createAudit(session.user.id, "add_section_product", { sectionId, productUid });
  revalidatePath("/admin/super/homepage");
  return data;
}

export async function removeProductFromSection(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("homepage_section_products").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/admin/super/homepage");
}

export async function searchProducts(query: string) {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from("products")
    .select("uid, name, main_image_path, price")
    .ilike("name", `%${query}%`)
    .limit(10);
    
  if (error) throw error;
  return data;
}



