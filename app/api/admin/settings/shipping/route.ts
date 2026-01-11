import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Get shipping settings
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { data: settings, error } = await supabase
      .from("shipping_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is OK
      console.error("Settings fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      settings: settings || null,
    });
  } catch (error: any) {
    console.error("Get shipping settings error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}























