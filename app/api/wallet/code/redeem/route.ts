import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { deductCredits, getBalance } from "@/lib/wallet";
import { getAdminSession } from "@/lib/auth/getAdminSession";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/code/redeem
 * Redeems a one-time code (Admin only)
 * Validates code, deducts credits, marks code as used
 * 
 * Body: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin session
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Valid code is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Find code
    const { data: codeRecord, error: codeError } = await serviceSupabase
      .from("one_time_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 404 }
      );
    }

    const typedCodeRecord = codeRecord as {
      id: string;
      user_id: string;
      amount: number;
      expires_at: string;
      used: boolean;
    };

    // Validate: not expired
    const expiresAt = new Date(typedCodeRecord.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: "Code has expired" },
        { status: 400 }
      );
    }

    // Validate: not used
    if (typedCodeRecord.used) {
      return NextResponse.json(
        { error: "Code has already been used" },
        { status: 400 }
      );
    }

    // Validate: sufficient balance
    const balance = await getBalance(typedCodeRecord.user_id);
    if (balance.balance < typedCodeRecord.amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${balance.balance}` },
        { status: 400 }
      );
    }

    // Deduct credits
    const deductResult = await deductCredits(
      typedCodeRecord.user_id,
      typedCodeRecord.amount,
      null,
      `In-store redemption via code ${code}`,
      session.user.id
    );

    // Mark code as used
    const { error: updateError } = await serviceSupabase
      .from("one_time_codes")
      .update({
        used: true,
        used_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedCodeRecord.id);

    if (updateError) {
      console.error("Failed to mark code as used:", updateError);
      // Credits already deducted, but code not marked - log for manual fix
    }

    // Get user info for response
    const { data: userRecord } = await serviceSupabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", typedCodeRecord.user_id)
      .single();

    const typedUserRecord = userRecord as {
      id: string;
      email: string;
      full_name: string | null;
    } | null;

    return NextResponse.json({
      success: true,
      message: "Code redeemed successfully",
      amount: typedCodeRecord.amount,
      user: typedUserRecord ? {
        id: typedUserRecord.id,
        email: typedUserRecord.email,
        name: typedUserRecord.full_name,
      } : null,
      remaining_balance: deductResult.new_balance,
    });
  } catch (error: any) {
    console.error("Error redeeming code:", error);
    return NextResponse.json(
      {
        error: "Failed to redeem code",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
