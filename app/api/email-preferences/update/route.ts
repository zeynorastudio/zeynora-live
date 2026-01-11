import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { updatePreferences } from "@/lib/email-preferences";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updatePreferencesSchema = z.object({
  master_toggle: z.boolean().optional(),
  marketing_emails: z.boolean().optional(),
  new_arrivals: z.boolean().optional(),
  sale_announcements: z.boolean().optional(),
  restock_alerts: z.boolean().optional(),
  wishlist_alerts: z.boolean().optional(),
  abandoned_cart: z.boolean().optional(),
});

/**
 * POST /api/email-preferences/update
 * Updates email preferences for authenticated user
 * Auth required
 * Customers can only update their own preferences
 */
export async function POST(req: NextRequest) {
  try {
    // Verify session
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user record
    const { data: userRecord } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as {
      id: string;
      role: string | null;
    } | null;

    if (!typedUserRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const validation = updatePreferencesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if user is super admin (for future admin API support)
    const isSuperAdmin = typedUserRecord.role === "super_admin";

    // Update preferences (customers can only update own)
    const updatedPreferences = await updatePreferences(
      typedUserRecord.id,
      validation.data,
      typedUserRecord.id,
      isSuperAdmin
    );

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error: any) {
    console.error("Error updating email preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to update email preferences",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
