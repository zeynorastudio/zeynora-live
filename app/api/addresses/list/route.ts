import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * List Addresses API
 * Returns all addresses for the authenticated user (sanitized)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
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

    // Use service-level client for reads
    const serviceSupabase = createServiceRoleClient();

    // Fetch addresses
    const { data: addresses, error: fetchError } = await serviceSupabase
      .from("addresses")
      .select("id, full_name, phone, line1, line2, city, state, pincode, country, is_default, created_at")
      .eq("user_id", typedUserRecord.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Address fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch addresses", details: fetchError.message },
        { status: 500 }
      );
    }

    // Type assertion for addresses
    const typedAddresses = (addresses || []) as Array<{
      id: string;
      full_name: string | null;
      phone: string | null;
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      country: string | null;
      is_default: boolean | null;
      created_at: string;
    }>;

    // Sanitize addresses (omit user_id, format response)
    const sanitizedAddresses = typedAddresses.map((addr) => ({
      id: addr.id,
      recipient_name: addr.full_name || "",
      phone: addr.phone || "",
      address_line_1: addr.line1 || "",
      address_line_2: addr.line2 || undefined,
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      country: addr.country || "India",
      is_default: addr.is_default || false,
      created_at: addr.created_at,
    }));

    return NextResponse.json({
      success: true,
      addresses: sanitizedAddresses,
    });
  } catch (error: any) {
    console.error("Unexpected error in addresses/list:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
