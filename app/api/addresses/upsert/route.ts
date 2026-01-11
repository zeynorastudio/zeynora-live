/**
 * POST /api/addresses/upsert
 * 
 * Creates or updates an address for the authenticated user.
 * If addressPayload.id is present, updates existing address; otherwise creates new.
 * 
 * DB Table: addresses
 * RLS: Users can only insert/update their own addresses (user_id = auth.uid())
 */

import { createServerClient } from "@/lib/supabase/server";
import { upsertAddress, AddressPayload } from "@/lib/data/addresses";
import { NextResponse } from "next/server";

// Validation helpers
function validatePhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

function validatePincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}

function validateAddressPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length === 0) {
    return { valid: false, error: "Name is required and must be non-empty" };
  }

  if (!payload.phone || typeof payload.phone !== "string") {
    return { valid: false, error: "Phone is required" };
  }

  if (!validatePhone(payload.phone.trim())) {
    return { valid: false, error: "Phone must be exactly 10 digits" };
  }

  if (!payload.address_line1 || typeof payload.address_line1 !== "string" || payload.address_line1.trim().length === 0) {
    return { valid: false, error: "Address line 1 is required and must be non-empty" };
  }

  if (!payload.city || typeof payload.city !== "string" || payload.city.trim().length === 0) {
    return { valid: false, error: "City is required and must be non-empty" };
  }

  if (!payload.state || typeof payload.state !== "string" || payload.state.trim().length === 0) {
    return { valid: false, error: "State is required and must be non-empty" };
  }

  if (!payload.pincode || typeof payload.pincode !== "string") {
    return { valid: false, error: "Pincode is required" };
  }

  if (!validatePincode(payload.pincode.trim())) {
    return { valid: false, error: "Pincode must be exactly 6 digits" };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as AddressPayload;

    // Validate inputs
    const validation = validateAddressPayload(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Ensure country defaults to "India" if not provided
    const addressPayload: AddressPayload = {
      ...body,
      country: body.country || "India",
    };

    const address = await upsertAddress(user.id, addressPayload);

    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    console.error("Error upserting address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save address" },
      { status: 500 }
    );
  }
}


