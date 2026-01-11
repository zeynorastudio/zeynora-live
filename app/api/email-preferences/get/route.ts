import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPreferences } from "@/lib/email-preferences";

export const dynamic = "force-dynamic";

/**
 * GET /api/email-preferences/get
 * Returns email preferences for authenticated user
 * Auth required
 */
export async function GET(req: NextRequest) {
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
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;
    if (!typedUserRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get preferences
    const preferences = await getPreferences(typedUserRecord.id);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error("Error fetching email preferences:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch email preferences",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
