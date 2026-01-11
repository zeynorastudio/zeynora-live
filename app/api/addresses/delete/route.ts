import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Delete Address API
 * Deletes an address with ownership validation
 * Policy: If deleting the only default address and other addresses exist, block deletion
 */
export async function POST(req: NextRequest) {
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

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { address_id } = body;

    if (!address_id || typeof address_id !== "string") {
      return NextResponse.json(
        { error: "address_id is required" },
        { status: 400 }
      );
    }

    // Use service-level client
    const serviceSupabase = createServiceRoleClient();

    // Verify ownership and get address details
    const { data: address, error: fetchError } = await serviceSupabase
      .from("addresses")
      .select("id, user_id, is_default")
      .eq("id", address_id)
      .single();

    if (fetchError || !address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    const typedAddress = address as {
      id: string;
      user_id: string;
      is_default: boolean | null;
    };

    if (typedAddress.user_id !== typedUserRecord.id) {
      return NextResponse.json(
        { error: "Unauthorized - address does not belong to user" },
        { status: 403 }
      );
    }

    // Check if this is the only address
    const { data: allAddresses } = await serviceSupabase
      .from("addresses")
      .select("id, is_default")
      .eq("user_id", typedUserRecord.id);

    const typedAllAddresses = (allAddresses || []) as Array<{ id: string; is_default: boolean | null }>;
    const addressCount = typedAllAddresses.length;

    // Policy: If deleting the only default address and other addresses exist, require setting another default first
    if (typedAddress.is_default && addressCount > 1) {
      return NextResponse.json(
        {
          error: "Cannot delete default address. Please set another address as default first.",
        },
        { status: 400 }
      );
    }

    // Delete address
    const { error: deleteError } = await serviceSupabase
      .from("addresses")
      .delete()
      .eq("id", address_id)
      .eq("user_id", typedUserRecord.id);

    if (deleteError) {
      console.error("Address delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete address", details: deleteError.message },
        { status: 500 }
      );
    }

    // If this was the only address or it was default and now no addresses exist, no need to promote
    // If other addresses exist and this wasn't default, no action needed

    // Write audit log
    try {
      await (serviceSupabase.from("admin_audit_logs") as any).insert({
        action: "address_deleted",
        target_resource: "addresses",
        target_id: address_id,
        performed_by: typedUserRecord.id,
        details: {
          was_default: typedAddress.is_default,
          total_addresses_before: addressCount,
        },
      });
    } catch (auditError) {
      console.error("Audit log error (non-fatal):", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error: any) {
    console.error("Unexpected error in addresses/delete:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
