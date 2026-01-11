import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { validateAddressPayload } from "@/lib/addresses/validators";
import { checkServiceability } from "@/lib/shipping/serviceability";

export const dynamic = "force-dynamic";

/**
 * Update Address API
 * Updates an existing address with ownership validation and serviceability check
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

    // Validate payload
    const validation = validateAddressPayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Use service-level client for reads/writes
    const serviceSupabase = createServiceRoleClient();

    // Verify ownership
    const { data: existingAddress, error: fetchError } = await serviceSupabase
      .from("addresses")
      .select("id, user_id, is_default, pincode")
      .eq("id", address_id)
      .single();

    if (fetchError || !existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    const typedExistingAddress = existingAddress as {
      id: string;
      user_id: string;
      is_default: boolean | null;
      pincode: string | null;
    };

    if (typedExistingAddress.user_id !== typedUserRecord.id) {
      return NextResponse.json(
        { error: "Unauthorized - address does not belong to user" },
        { status: 403 }
      );
    }

    // Check serviceability if pincode changed
    const pincodeChanged = body.pincode && body.pincode !== typedExistingAddress.pincode;
    if (pincodeChanged) {
      const serviceabilityResult = await checkServiceability(body.pincode);
      if (!serviceabilityResult.serviceable) {
        return NextResponse.json(
          {
            error: "We do not ship to this pincode yet. Please contact support for assistance.",
            reason: serviceabilityResult.reason,
          },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset all other defaults first
    const shouldSetDefault = body.save_as_default === true;
    if (shouldSetDefault) {
      await (serviceSupabase.from("addresses") as any)
        .update({ is_default: false })
        .eq("user_id", typedUserRecord.id)
        .neq("id", address_id);
    }

    // Prepare update payload
    const updatePayload: {
      full_name?: string;
      phone?: string;
      line1?: string;
      line2?: string | null;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      is_default?: boolean;
    } = {};

    if (body.recipient_name) updatePayload.full_name = body.recipient_name.trim();
    if (body.phone) updatePayload.phone = body.phone.replace(/\D/g, "");
    if (body.address_line_1) updatePayload.line1 = body.address_line_1.trim();
    if (body.address_line_2 !== undefined) updatePayload.line2 = body.address_line_2?.trim() || null;
    if (body.city) updatePayload.city = body.city.trim();
    if (body.state) updatePayload.state = body.state.trim();
    if (body.pincode) updatePayload.pincode = body.pincode.trim();
    if (body.country) updatePayload.country = body.country.trim();
    if (shouldSetDefault) updatePayload.is_default = true;

    // Update address
    const { data: updatedAddress, error: updateError } = await (serviceSupabase
      .from("addresses") as any)
      .update(updatePayload)
      .eq("id", address_id)
      .eq("user_id", typedUserRecord.id)
      .select()
      .single();

    if (updateError || !updatedAddress) {
      console.error("Address update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update address", details: updateError?.message },
        { status: 500 }
      );
    }

    const typedUpdatedAddress = updatedAddress as {
      id: string;
      full_name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      pincode: string;
      country: string;
      is_default: boolean | null;
      created_at: string;
    };

    // Write audit log
    try {
      await (serviceSupabase.from("admin_audit_logs") as any).insert({
        action: "address_updated",
        target_resource: "addresses",
        target_id: address_id,
        performed_by: typedUserRecord.id,
        details: {
          pincode_changed: pincodeChanged,
          is_default_changed: shouldSetDefault,
          fields_updated: Object.keys(updatePayload),
        },
      });
    } catch (auditError) {
      console.error("Audit log error (non-fatal):", auditError);
    }

    // Return sanitized address
    const response = {
      id: typedUpdatedAddress.id,
      label: body.label || null,
      recipient_name: typedUpdatedAddress.full_name,
      phone: typedUpdatedAddress.phone,
      address_line_1: typedUpdatedAddress.line1,
      address_line_2: typedUpdatedAddress.line2,
      city: typedUpdatedAddress.city,
      state: typedUpdatedAddress.state,
      pincode: typedUpdatedAddress.pincode,
      country: typedUpdatedAddress.country,
      is_default: typedUpdatedAddress.is_default,
      created_at: typedUpdatedAddress.created_at,
    };

    return NextResponse.json({
      success: true,
      address: response,
    });
  } catch (error: any) {
    console.error("Unexpected error in addresses/update:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
