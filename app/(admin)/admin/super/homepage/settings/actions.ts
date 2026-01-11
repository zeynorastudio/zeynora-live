"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { createAudit } from "@/lib/audit/log";
import { HomepageSettings } from "@/lib/homepage/types";
import { revalidatePath } from "next/cache";

export async function getHomepageSettings() {
  await requireSuperAdmin();
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("homepage_settings").select("*").limit(1).single();
  return data as HomepageSettings | null;
}

export async function updateHomepageSettings(settings: Partial<HomepageSettings>) {
  const session = await requireSuperAdmin();
  const supabase = createServiceRoleClient();

  // Check if row exists
  const { data: existing } = await supabase.from("homepage_settings").select("id").limit(1).single();

  const typedExisting = existing as { id: string } | null;
  let error;
  if (typedExisting) {
    const { error: updateError } = await supabase
      .from("homepage_settings")
      .update({ ...settings, updated_at: new Date().toISOString() } as unknown as never)
      .eq("id", typedExisting.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("homepage_settings")
      .insert(settings as unknown as never);
    error = insertError;
  }

  if (error) throw error;
  await createAudit(session.user.id, "update_homepage_settings", { settings });
  revalidatePath("/admin/super/homepage");
}



