/**
 * GET /api/addresses/get?addressId=xxx
 * 
 * Returns a single address by ID for the authenticated user.
 * 
 * DB Table: addresses
 * RLS: Users can only access their own addresses (user_id = auth.uid())
 */

import { createServerClient } from "@/lib/supabase/server";
import { getAddress } from "@/lib/data/addresses";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("addressId");

    if (!addressId) {
      return NextResponse.json(
        { error: "addressId query parameter is required" },
        { status: 400 }
      );
    }

    // Get user record first
    const { data: userRecord } = await supabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;

    if (!typedUserRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const address = await getAddress(typedUserRecord.id, addressId);

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error("Error fetching address:", error);
    return NextResponse.json(
      { error: "Failed to fetch address" },
      { status: 500 }
    );
  }
}


