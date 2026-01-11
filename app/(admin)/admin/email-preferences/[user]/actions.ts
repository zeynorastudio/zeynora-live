"use server";

/**
 * ZEYNORA Admin Email Preferences Actions
 * 
 * Server actions for Super Admin to update any user's email preferences.
 * Enforces: only Super Admin can use these actions.
 */

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createServerClient } from "@/lib/supabase/server";
import { updatePreferences } from "@/lib/email-preferences";
import { revalidatePath } from "next/cache";

export interface UpdateEmailPreferencesAdminInput {
  user_id: string;
  master_toggle?: boolean;
  marketing_emails?: boolean;
  new_arrivals?: boolean;
  sale_announcements?: boolean;
  restock_alerts?: boolean;
  wishlist_alerts?: boolean;
  abandoned_cart?: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Update any user's email preferences (Super Admin only)
 * 
 * @param input - Preferences update with user_id
 * @returns ActionResult
 */
export async function updateEmailPreferencesAdminAction(
  input: UpdateEmailPreferencesAdminInput
): Promise<ActionResult> {
  try {
    // Enforce Super Admin only
    const session = await requireSuperAdmin();

    const { user_id, ...preferencesUpdate } = input;

    if (!user_id) {
      return {
        success: false,
        error: "user_id is required",
      };
    }

    // Get admin user record
    const supabase = await createServerClient();
    const { data: adminRecord } = await supabase
      .from("users")
      .select("id")
      .eq("auth_uid", session.user.id)
      .single();

    const typedAdminRecord = adminRecord as { id: string } | null;
    if (!typedAdminRecord) {
      return {
        success: false,
        error: "Admin user not found",
      };
    }

    // Update preferences (Super Admin can update any user)
    await updatePreferences(
      user_id,
      preferencesUpdate,
      typedAdminRecord.id,
      true // Is super admin
    );

    // Revalidate the page
    revalidatePath(`/admin/email-preferences/${user_id}`);

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error updating email preferences:", error);
    
    // Check if it's a permission error
    if (error.message?.includes("Forbidden") || error.message?.includes("Super admin")) {
      return {
        success: false,
        error: "Forbidden: Super admin access required",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to update preferences",
    };
  }
}



