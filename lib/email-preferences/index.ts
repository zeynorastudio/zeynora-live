/**
 * ZEYNORA Email Preferences Server Module
 * 
 * Manages user email preferences with:
 * - Optional categories (marketing, new arrivals, sales, restock, wishlist, abandoned cart)
 * - Master toggle to disable all marketing emails
 * - Mandatory system-critical emails (always ON, cannot be disabled)
 * - Super Admin can update any user's preferences
 * - Customers can only update their own preferences
 * 
 * All writes use service-level Supabase client for security.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface EmailPreferences {
  id: string;
  user_id: string;
  master_toggle: boolean; // If true, all optional emails disabled
  marketing_emails: boolean;
  new_arrivals: boolean;
  sale_announcements: boolean;
  restock_alerts: boolean;
  wishlist_alerts: boolean;
  abandoned_cart: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailPreferencesUpdate {
  master_toggle?: boolean;
  marketing_emails?: boolean;
  new_arrivals?: boolean;
  sale_announcements?: boolean;
  restock_alerts?: boolean;
  wishlist_alerts?: boolean;
  abandoned_cart?: boolean;
}

/**
 * Get email preferences for a user
 * Creates default preferences if none exist
 */
export async function getPreferences(userId: string): Promise<EmailPreferences> {
  const supabase = createServiceRoleClient();

  // Try to fetch existing preferences
  const { data: preferences, error } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Preferences don't exist, create defaults
    const defaultPreferences: Partial<EmailPreferences> = {
      user_id: userId,
      master_toggle: false,
      marketing_emails: true,
      new_arrivals: true,
      sale_announcements: true,
      restock_alerts: true,
      wishlist_alerts: true,
      abandoned_cart: true,
    };

    const { data: newPreferences, error: createError } = await supabase
      .from("email_preferences")
      .insert(defaultPreferences as unknown as never)
      .select()
      .single();

    if (createError || !newPreferences) {
      throw new Error(`Failed to create default preferences: ${createError?.message}`);
    }

    return newPreferences as EmailPreferences;
  }

  if (error) {
    throw new Error(`Failed to fetch preferences: ${error.message}`);
  }

  return preferences as EmailPreferences;
}

/**
 * Update email preferences for a user
 * 
 * Business Rules:
 * - If master_toggle is true, all optional categories are set to false
 * - Mandatory emails cannot be disabled (handled at application level)
 * - Only super admin can update other users' preferences
 * 
 * @param userId - User ID whose preferences to update
 * @param updates - Partial preferences object
 * @param performedBy - User ID performing the update (for audit)
 * @param isSuperAdmin - Whether the performer is a super admin
 */
export async function updatePreferences(
  userId: string,
  updates: EmailPreferencesUpdate,
  performedBy: string,
  isSuperAdmin: boolean = false
): Promise<EmailPreferences> {
  // Enforce: only super admin can update other users' preferences
  if (!isSuperAdmin && performedBy !== userId) {
    throw new Error("Forbidden: You can only update your own preferences");
  }

  const supabase = createServiceRoleClient();

  // Get current preferences
  const currentPreferences = await getPreferences(userId);

  // Build update object
  const updateData: Partial<EmailPreferencesUpdate> = {};

  // Handle master toggle: if enabled, disable all optional categories
  if (updates.master_toggle !== undefined) {
    updateData.master_toggle = updates.master_toggle;
    if (updates.master_toggle === true) {
      // Master toggle ON → disable all optional emails
      updateData.marketing_emails = false;
      updateData.new_arrivals = false;
      updateData.sale_announcements = false;
      updateData.restock_alerts = false;
      updateData.wishlist_alerts = false;
      updateData.abandoned_cart = false;
    } else {
      // Master toggle OFF → allow individual toggles to be set
      // Only update if explicitly provided
      if (updates.marketing_emails !== undefined) {
        updateData.marketing_emails = updates.marketing_emails;
      }
      if (updates.new_arrivals !== undefined) {
        updateData.new_arrivals = updates.new_arrivals;
      }
      if (updates.sale_announcements !== undefined) {
        updateData.sale_announcements = updates.sale_announcements;
      }
      if (updates.restock_alerts !== undefined) {
        updateData.restock_alerts = updates.restock_alerts;
      }
      if (updates.wishlist_alerts !== undefined) {
        updateData.wishlist_alerts = updates.wishlist_alerts;
      }
      if (updates.abandoned_cart !== undefined) {
        updateData.abandoned_cart = updates.abandoned_cart;
      }
    }
  } else {
    // Master toggle not being changed, update individual categories
    // But if master toggle is currently ON, ignore individual updates
    if (currentPreferences.master_toggle === false) {
      if (updates.marketing_emails !== undefined) {
        updateData.marketing_emails = updates.marketing_emails;
      }
      if (updates.new_arrivals !== undefined) {
        updateData.new_arrivals = updates.new_arrivals;
      }
      if (updates.sale_announcements !== undefined) {
        updateData.sale_announcements = updates.sale_announcements;
      }
      if (updates.restock_alerts !== undefined) {
        updateData.restock_alerts = updates.restock_alerts;
      }
      if (updates.wishlist_alerts !== undefined) {
        updateData.wishlist_alerts = updates.wishlist_alerts;
      }
      if (updates.abandoned_cart !== undefined) {
        updateData.abandoned_cart = updates.abandoned_cart;
      }
    }
  }

  // Update preferences
  const { data: updatedPreferences, error: updateError } = await supabase
    .from("email_preferences")
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("user_id", userId)
    .select()
    .single();

  if (updateError || !updatedPreferences) {
    throw new Error(`Failed to update preferences: ${updateError?.message}`);
  }

  // Write audit log (if super admin updated another user)
  if (isSuperAdmin && performedBy !== userId) {
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "email_preferences_updated",
        target_resource: "email_preferences",
        target_id: userId,
        performed_by: performedBy,
        details: {
          updated_fields: Object.keys(updateData),
          previous_values: currentPreferences,
          new_values: updatedPreferences,
        },
      } as unknown as never);
    } catch (auditError) {
      console.error("Failed to write audit log:", auditError);
      // Non-fatal
    }
  }

  return updatedPreferences as EmailPreferences;
}

/**
 * Check if a specific email type should be sent to a user
 * 
 * @param userId - User ID to check
 * @param emailType - Type of email ('mandatory', 'marketing', 'new_arrivals', 'restock', 'wishlist', 'abandoned_cart')
 * @returns true if email should be sent, false otherwise
 */
export async function shouldSendEmail(
  userId: string,
  emailType: "mandatory" | "marketing" | "new_arrivals" | "restock" | "wishlist" | "abandoned_cart"
): Promise<boolean> {
  // Mandatory emails always sent
  if (emailType === "mandatory") {
    return true;
  }

  // Get preferences
  const preferences = await getPreferences(userId);

  // If master toggle is ON, no optional emails
  if (preferences.master_toggle === true) {
    return false;
  }

  // Check specific preference
  switch (emailType) {
    case "marketing":
      return preferences.marketing_emails === true;
    case "new_arrivals":
      return preferences.new_arrivals === true;
    case "restock":
      return preferences.restock_alerts === true;
    case "wishlist":
      return preferences.wishlist_alerts === true;
    case "abandoned_cart":
      return preferences.abandoned_cart === true;
    default:
      return false;
  }
}




