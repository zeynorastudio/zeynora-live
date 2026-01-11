/**
 * POST /api/addresses/set-default
 * 
 * Atomically sets an address as default for the authenticated user.
 * Unsets all other default addresses for the user, then sets the chosen one.
 * 
 * DB Table: addresses
 * RLS: Users can only set default for their own addresses (user_id = auth.uid())
 */

import { createServerClient } from "@/lib/supabase/server";
import { setDefaultAddress } from "@/lib/data/addresses";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { addressId: string };

    if (!body.addressId || typeof body.addressId !== "string") {
      return NextResponse.json(
        { error: "addressId is required" },
        { status: 400 }
      );
    }

    const address = await setDefaultAddress(user.id, body.addressId);

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    console.error("Error setting default address:", error);
    
    // Check if it's a not found error
    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: "Address not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to set default address" },
      { status: 500 }
    );
  }
}


