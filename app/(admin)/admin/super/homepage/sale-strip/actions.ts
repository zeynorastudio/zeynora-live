"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAudit } from "@/lib/audit/log";
import { HomepageSaleStrip } from "@/lib/homepage/types";

export async function getSaleStrips(): Promise<HomepageSaleStrip[]> {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("homepage_sale_strips" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as HomepageSaleStrip[];
}

export async function createSaleStrip(data: { sale_text: string; visible?: boolean }) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { data: newRow, error } = await supabase
    .from("homepage_sale_strips" as any)
    .insert({
      sale_text: data.sale_text,
      visible: data.visible ?? true,
      status: "draft",
    } as unknown as never)
    .select()
    .single();

  if (error) throw error;

  const typedNewRow = newRow as { id: string };
  await createAudit(session.user.id, "create_sale_strip", { id: typedNewRow.id });
  revalidateSaleStripViews();
  return newRow as HomepageSaleStrip;
}

export async function updateSaleStrip(id: string, updates: Partial<HomepageSaleStrip>) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_sale_strips" as any)
    .update({ ...updates, updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "update_sale_strip", { id, updates });
  revalidateSaleStripViews();
}

export async function publishSaleStrip(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  await supabase
    .from("homepage_sale_strips" as any)
    .update({ status: "draft" } as unknown as never)
    .eq("status", "published");

  const { error } = await supabase
    .from("homepage_sale_strips" as any)
    .update({ status: "published", updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "publish_sale_strip", { id });
  revalidateSaleStripViews();
}

export async function unpublishSaleStrip(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_sale_strips" as any)
    .update({ status: "draft", updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "unpublish_sale_strip", { id });
  revalidateSaleStripViews();
}

export async function deleteSaleStrip(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_sale_strips" as any)
    .delete()
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "delete_sale_strip", { id });
  revalidateSaleStripViews();
}

export async function getProducts() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("uid, name, slug, price, main_image_path")
    .eq("active", true)
    .order("name");
    
  if (error) throw error;
  return data || [];
}

export async function updateSaleStripProducts(id: string, productIds: string[]) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_sale_strips" as any)
    .update({ 
      product_ids: productIds,
      updated_at: new Date().toISOString() 
    } as unknown as never)
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "update_sale_strip_products", { id, productIds });
  revalidateSaleStripViews();
}

export async function getSaleStripProducts(id: string): Promise<string[]> {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("homepage_sale_strips" as any)
    .select("product_ids")
    .eq("id", id)
    .single();

  if (error) throw error;
  const typedData = data as { product_ids: string[] | null } | null;
  return typedData?.product_ids || [];
}

function revalidateSaleStripViews() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/super/homepage");
}
