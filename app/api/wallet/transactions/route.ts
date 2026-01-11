import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTransactions } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet/transactions
 * Returns transaction history for authenticated user
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

    // Get limit from query params
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // Get transactions
    const transactions = await getTransactions(typedUserRecord.id, limit);

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch transactions",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
