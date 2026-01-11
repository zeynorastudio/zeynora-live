import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getBalance, deductCredits } from "@/lib/wallet";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/code/create
 * Creates a one-time secure code for in-store redemption
 * Auth required
 * 
 * Body: { amount: number }
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
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;

    if (!typedUserRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    // Check balance
    const balance = await getBalance(typedUserRecord.id);
    if (balance.balance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${balance.balance}` },
        { status: 400 }
      );
    }

    // Generate secure random code (8 characters, alphanumeric)
    const code = randomBytes(4).toString("hex").toUpperCase();

    // Set expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Store code in database
    const serviceSupabase = createServiceRoleClient();
    const { data: codeRecord, error: codeError } = await serviceSupabase
      .from("one_time_codes")
      .insert({
        user_id: typedUserRecord.id,
        code: code,
        amount: amount,
        expires_at: expiresAt.toISOString(),
        used: false,
      } as unknown as never)
      .select()
      .single();

    if (codeError || !codeRecord) {
      console.error("Failed to create one-time code:", codeError);
      return NextResponse.json(
        { error: "Failed to create redemption code" },
        { status: 500 }
      );
    }

    const typedCodeRecord = codeRecord as { id: string };

    return NextResponse.json({
      success: true,
      code: code,
      amount: amount,
      expires_at: expiresAt.toISOString(),
      message: "Code created successfully. Use this code at the store within 15 minutes.",
    });
  } catch (error: any) {
    console.error("Error creating one-time code:", error);
    return NextResponse.json(
      {
        error: "Failed to create redemption code",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
