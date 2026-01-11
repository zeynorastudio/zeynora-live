"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAudit } from "@/lib/audit/log";
import { HomepageHero } from "@/lib/homepage/types";
import { revalidatePath } from "next/cache";

export async function getHeroSlides() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("homepage_hero")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return data as HomepageHero[];
}

export async function createHeroSlide(data: {
  desktop_image?: string;
  desktop_video?: string;
  mobile_image?: string;
  mobile_video?: string;
  title?: string;
  subtitle?: string;
  cta_url?: string;
}) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  // Require at least one asset
  if (!data.desktop_image && !data.desktop_video) {
    throw new Error("At least one desktop asset (image or video) is required");
  }

  // Get max order index
  const { data: max } = await supabase
    .from("homepage_hero")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const typedMax = max as { order_index: number } | null;
  const newIndex = (typedMax?.order_index ?? -1) + 1;

  const { data: newSlide, error } = await supabase
    .from("homepage_hero")
    .insert({
      desktop_image: data.desktop_image || '',
      desktop_video: data.desktop_video || null,
      mobile_image: data.mobile_image || null,
      mobile_video: data.mobile_video || null,
      title: data.title || null,
      subtitle: data.subtitle || null,
      cta_url: data.cta_url || null,
      order_index: newIndex,
      status: 'draft',
      visible: true
    } as unknown as never)
    .select()
    .single();

  if (error) throw error;

  const typedSlide = newSlide as { id: string };
  await createAudit(session.user.id, "create_hero_slide", { id: typedSlide.id, ...data });
  revalidatePath("/admin/super/homepage");
  return newSlide;
}

export async function updateHeroSlide(id: string, updates: Partial<HomepageHero>) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_hero")
    .update({ ...updates, updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "update_hero_slide", { id, updates });
  revalidatePath("/admin/super/homepage");
}

export async function deleteHeroSlide(id: string) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("homepage_hero")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await createAudit(session.user.id, "delete_hero_slide", { id });
  revalidatePath("/admin/super/homepage");
}

export async function reorderHeroSlides(items: { id: string; order_index: number }[]) {
  const session = await requireSuperAdmin();
  const { updateOrderIndices } = await import("@/lib/admin/reorder");
  
  await updateOrderIndices("homepage_hero", items, session.user.id);
  revalidatePath("/admin/super/homepage");
}


