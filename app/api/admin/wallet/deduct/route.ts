import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { deductCredits } from "@/lib/wallet";
import { requireSuperAdmin } from "@/lib/admin/roles";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/wallet/deduct
 * Super Admin only - Deduct credits from user wallet
 * 
 * Body: { user_id: string, amount: number, notes?: string, reference?: string }
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    const body = await req.json();
    const { user_id, amount, notes, reference } = body;

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    // Get admin user record
    const { data: adminRecord } = await authSupabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedAdminRecord = adminRecord as { id: string } | null;

    if (!typedAdminRecord) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    // Deduct credits
    const result = await deductCredits(
      user_id,
      amount,
      reference || null,
      notes || null,
      typedAdminRecord.id
    );

    return NextResponse.json({
      success: true,
      new_balance: result.new_balance,
      message: `Successfully deducted ₹${amount.toLocaleString()} from wallet`,
    });
  } catch (error: any) {
    console.error("Error deducting credits:", error);
    return NextResponse.json(
      {
        error: "Failed to deduct credits",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
