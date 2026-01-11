import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet/balance
 * Returns current wallet balance and expiring credits
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

    // Get balance
    const balance = await getBalance(typedUserRecord.id);

    return NextResponse.json({
      success: true,
      balance: balance.balance,
      expiring_soon: balance.expiring_soon,
    });
  } catch (error: any) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch wallet balance",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
