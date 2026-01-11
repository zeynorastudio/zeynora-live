"use server";

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";

const shippingSettingsSchema = z.object({
  flat_rate: z.number().min(0),
  free_above_amount: z.number().min(0).nullable(),
  shipping_slabs: z
    .array(
      z.object({
        min_amount: z.number().min(0),
        max_amount: z.number().min(0).nullable(),
        fee: z.number().min(0),
      })
    )
    .nullable(),
  cod_enabled: z.boolean(),
  default_package_weight: z.number().min(0),
  default_package_dimensions: z.object({
    length: z.number().min(1),
    breadth: z.number().min(1),
    height: z.number().min(1),
  }),
  blocked_pincodes: z.array(z.string()).nullable(),
  region_overrides: z.record(z.any()).nullable(),
});

export async function updateShippingSettings(data: z.infer<typeof shippingSettingsSchema>) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input
    const validation = shippingSettingsSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: "Invalid settings data",
        details: validation.error.errors,
      };
    }

    const supabase = createServiceRoleClient();

    // Check if settings exist
    const { data: existing } = await supabase
      .from("shipping_settings")
      .select("id")
      .single();

    const typedExisting = existing as { id: string } | null;
    if (typedExisting) {
      // Update existing
      const { error } = await supabase.from("shipping_settings").update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      } as unknown as never).eq("id", typedExisting.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Insert new
      const { error } = await supabase.from("shipping_settings").insert({
        ...validation.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as never);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "shipping_settings_updated",
        target_resource: "shipping_settings",
        performed_by: session.user.id,
        details: validation.data,
      } as unknown as never);
    } catch (auditError) {
      console.error("Audit log error:", auditError);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Update shipping settings error:", error);
    return { success: false, error: error.message || "Failed to update settings" };
  }
}






