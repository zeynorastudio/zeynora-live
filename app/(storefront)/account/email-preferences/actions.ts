"use server";

/**
 * ZEYNORA Customer Email Preferences Actions
 * 
 * Server actions for customers to update their own email preferences.
 * Enforces: customers can only update their own preferences.
 */

import { createServerClient } from "@/lib/supabase/server";
import { updatePreferences } from "@/lib/email-preferences";
import { revalidatePath } from "next/cache";

export interface UpdateEmailPreferencesInput {
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
 * Update current user's email preferences
 * 
 * @param input - Partial preferences object
 * @returns ActionResult
 */
export async function updateEmailPreferencesAction(
  input: UpdateEmailPreferencesInput
): Promise<ActionResult> {
  try {
    // Verify session
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Get user record
    const { data: userRecord } = await supabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;
    if (!typedUserRecord) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Update preferences (customer can only update own)
    await updatePreferences(
      typedUserRecord.id,
      input,
      typedUserRecord.id,
      false // Not super admin
    );

    // Revalidate the page
    revalidatePath("/account/email-preferences");

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error updating email preferences:", error);
    return {
      success: false,
      error: error.message || "Failed to update preferences",
    };
  }
}
