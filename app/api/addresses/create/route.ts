import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { validateAddressPayload } from "@/lib/addresses/validators";
import { checkServiceability } from "@/lib/shipping/serviceability";

export const dynamic = "force-dynamic";

/**
 * Create Address API
 * Creates a new address for the authenticated user with serviceability check
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

    // Validate payload
    const validation = validateAddressPayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check serviceability server-side
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

    // Use service-level client for writes
    const serviceSupabase = createServiceRoleClient();

    // Check if this is the first address (auto-set as default)
    const { data: existingAddresses } = await serviceSupabase
      .from("addresses")
      .select("id")
      .eq("user_id", typedUserRecord.id)
      .limit(1);

    const typedExistingAddresses = (existingAddresses || []) as Array<{ id: string }>;
    const isFirstAddress = typedExistingAddresses.length === 0;
    const shouldSetDefault = body.save_as_default !== false && (isFirstAddress || body.save_as_default === true);

    // If setting as default, unset all other defaults first
    if (shouldSetDefault) {
      await (serviceSupabase.from("addresses") as any)
        .update({ is_default: false })
        .eq("user_id", typedUserRecord.id);
    }

    // Prepare address payload
    const addressPayload: {
      user_id: string;
      full_name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      pincode: string;
      country: string;
      is_default: boolean;
    } = {
      user_id: typedUserRecord.id,
      full_name: body.recipient_name.trim(),
      phone: body.phone.replace(/\D/g, ""), // Clean phone to digits only
      line1: body.address_line_1.trim(),
      line2: body.address_line_2?.trim() || null,
      city: body.city.trim(),
      state: body.state.trim(),
      pincode: body.pincode.trim(),
      country: body.country || "India",
      is_default: shouldSetDefault,
    };

    // Insert address
    const { data: newAddress, error: insertError } = await (serviceSupabase
      .from("addresses") as any)
      .insert(addressPayload)
      .select()
      .single();

    if (insertError || !newAddress) {
      console.error("Address insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create address", details: insertError?.message },
        { status: 500 }
      );
    }

    const typedNewAddress = newAddress as {
      id: string;
      full_name: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      pincode: string;
      country: string;
      is_default: boolean;
      created_at: string;
    };

    // Write audit log
    try {
      await (serviceSupabase.from("admin_audit_logs") as any).insert({
        action: "address_created",
        target_resource: "addresses",
        target_id: typedNewAddress.id,
        performed_by: typedUserRecord.id,
        details: {
          pincode: body.pincode,
          city: body.city,
          state: body.state,
          is_default: shouldSetDefault,
          serviceability_checked: true,
        },
      });
    } catch (auditError) {
      console.error("Audit log error (non-fatal):", auditError);
    }

    // Return sanitized address (omit user_id)
    const response = {
      id: typedNewAddress.id,
      label: body.label || null,
      recipient_name: typedNewAddress.full_name,
      phone: typedNewAddress.phone,
      address_line_1: typedNewAddress.line1,
      address_line_2: typedNewAddress.line2,
      city: typedNewAddress.city,
      state: typedNewAddress.state,
      pincode: typedNewAddress.pincode,
      country: typedNewAddress.country,
      is_default: typedNewAddress.is_default,
      created_at: typedNewAddress.created_at,
    };

    return NextResponse.json({
      success: true,
      address: response,
    });
  } catch (error: any) {
    console.error("Unexpected error in addresses/create:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}






