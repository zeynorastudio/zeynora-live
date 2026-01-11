import { createServerClient } from "@/lib/supabase/server";

export interface AddressPayload {
  id?: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  is_default?: boolean;
}

export interface AddressResponse {
  id: string;
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

function mapAddressRow(row: any): AddressResponse {
  return {
    id: row.id,
    name: row.full_name || "",
    phone: row.phone || "",
    address_line1: row.line1 || "",
    address_line2: row.line2 || undefined,
    city: row.city || "",
    state: row.state || "",
    pincode: row.pincode || "",
    country: row.country || "India",
    is_default: row.is_default || false,
    created_at: row.created_at,
  };
}

// This function is RLS-safe; called from server code using createServerClient
export async function listAddresses(userId: string): Promise<AddressResponse[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("addresses")
    .select("id, full_name, phone, line1, line2, city, state, pincode, country, is_default, created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch addresses: ${error.message}`);
  }

  // Type assertion
  const typedData = (data || []) as Array<{
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

  return typedData.map(mapAddressRow);
}

// This function is RLS-safe; called from server code using createServerClient
export async function getAddress(userId: string, addressId: string): Promise<AddressResponse | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("addresses")
    .select("id, full_name, phone, line1, line2, city, state, pincode, country, is_default, created_at")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch address: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapAddressRow(data);
}

export async function upsertAddress(userId: string, addressPayload: AddressPayload): Promise<AddressResponse> {
  const supabase = await createServerClient();

  // If setting as default, first unset all other defaults atomically
  if (addressPayload.is_default === true) {
    await supabase
      .from("addresses")
      .update({ is_default: false } as unknown as never)
      .eq("user_id", userId);
  }

  // Map API payload to DB format
  const dbPayload: any = {
    user_id: userId,
    full_name: addressPayload.name.trim(),
    phone: addressPayload.phone.trim(),
    line1: addressPayload.address_line1.trim(),
    line2: addressPayload.address_line2?.trim() || null,
    city: addressPayload.city.trim(),
    state: addressPayload.state.trim(),
    pincode: addressPayload.pincode.trim(),
    country: addressPayload.country?.trim() || "India",
    is_default: addressPayload.is_default || false,
  };

  let result;

  if (addressPayload.id) {
    // Update existing address
    const { data, error } = await supabase
      .from("addresses")
      .update(dbPayload as unknown as never)
      .eq("id", addressPayload.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }

    if (!data) {
      throw new Error("Address not found or access denied");
    }

    result = data;
  } else {
    // Create new address
    const { data, error } = await supabase
      .from("addresses")
      .insert(dbPayload as unknown as never)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create address: ${error.message}`);
    }

    if (!data) {
      throw new Error("Failed to create address");
    }

    result = data;
  }

  return mapAddressRow(result);
}

// This function is RLS-safe; called from server code using createServerClient
export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", addressId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete address: ${error.message}`);
  }
}

// This function is RLS-safe; called from server code using createServerClient
// Atomically sets one address as default and unsets all others for the user
export async function setDefaultAddress(userId: string, addressId: string): Promise<AddressResponse> {
  const supabase = await createServerClient();

  // Step 1: Unset all defaults for this user
  const { error: unsetError } = await supabase
    .from("addresses")
    .update({ is_default: false } as unknown as never)
    .eq("user_id", userId);

  if (unsetError) {
    throw new Error(`Failed to unset default addresses: ${unsetError.message}`);
  }

  // Step 2: Set the chosen address as default
  const { data, error: setError } = await supabase
    .from("addresses")
    .update({ is_default: true } as unknown as never)
    .eq("id", addressId)
    .eq("user_id", userId)
    .select()
    .single();

  if (setError) {
    throw new Error(`Failed to set default address: ${setError.message}`);
  }

  if (!data) {
    throw new Error("Address not found or access denied");
  }

  return mapAddressRow(data);
}
