"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAudit } from "@/lib/audit/log";
import { HomepageBanner } from "@/lib/homepage/types";
import { revalidatePath } from "next/cache";
import { updateOrderIndices } from "@/lib/admin/reorder";

export async function getHomepageBanners() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("homepage_banners").select("*").order("order_index");
  if (error) throw error;
  return data as HomepageBanner[];
}

export async function createHomepageBanner(data: { desktop_image: string; mobile_image?: string; title?: string; link?: string }) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  
  const { data: max } = await supabase.from("homepage_banners").select("order_index").order("order_index", { ascending: false }).limit(1).single();
  const typedMax = max as { order_index: number } | null;
  const newIndex = (typedMax?.order_index ?? -1) + 1;

  const { data: newBanner, error } = await supabase
    .from("homepage_banners")
    .insert({ ...data, order_index: newIndex, status: 'draft', visible: true } as unknown as never)
    .select()
    .single();

  if (error) throw error;
  const typedBanner = newBanner as { id: string };
  await createAudit(session.user.id, "create_homepage_banner", { id: typedBanner.id, ...data });
  revalidatePath("/admin/super/homepage");
  return newBanner;
}

export async function updateHomepageBanner(id: string, updates: Partial<HomepageBanner>) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("homepage_banners").update({ ...updates, updated_at: new Date().toISOString() } as unknown as never).eq("id", id);
  if (error) throw error;
  await createAudit(session.user.id, "update_homepage_banner", { id, updates });
  revalidatePath("/admin/super/homepage");
}

export async function deleteHomepageBanner(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
  if (error) throw error;
  await createAudit(session.user.id, "delete_homepage_banner", { id });
  revalidatePath("/admin/super/homepage");
}

export async function reorderHomepageBanners(items: { id: string; order_index: number }[]) {
  const session = await requireSuperAdmin();
  await updateOrderIndices("homepage_banners", items, session.user.id);
  revalidatePath("/admin/super/homepage");
}



