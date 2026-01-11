import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTransactions } from "@/lib/wallet";
import { requireSuperAdmin } from "@/lib/admin/roles";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/wallet/transactions
 * Super Admin only - Get transaction history for a user
 * 
 * Query: ?user_id=uuid&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require Super Admin
    await requireSuperAdmin(user.id);

    // Get query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    if (!userId) {
      return NextResponse.json(
        { error: "user_id query parameter is required" },
        { status: 400 }
      );
    }

    // Get transactions
    const transactions = await getTransactions(userId, limit);

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
