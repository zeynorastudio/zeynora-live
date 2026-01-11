"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getCustomerByAuthUid } from "@/lib/auth/customers";
import { validatePhone } from "@/lib/auth/customers";
import { revalidatePath } from "next/cache";

export interface AddressFormData {
  id?: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  is_default?: boolean;
}

export interface AddressActionResult {
  success: boolean;
  error?: string;
  addressId?: string;
}

const MAX_ADDRESSES = 3;

/**
 * Get customer ID from auth session
 */
async function getCustomerId(): Promise<string | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const customer = await getCustomerByAuthUid(supabase, user.id);
  return customer?.id || null;
}

/**
 * Get user_id for addresses table (via customer -> users mapping)
 * Since addresses.user_id references users.id, we need to find the users.id
 * that corresponds to the customer's auth_uid
 */
async function getUserIdForCustomer(customerId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  
  // Get customer's auth_uid
  const { data: customer } = await supabase
    .from("customers")
    .select("auth_uid")
    .eq("id", customerId)
    .single();

  const typedCustomer = customer as { auth_uid: string | null } | null;
  if (!typedCustomer?.auth_uid) {
    return null;
  }

  // Find users.id for this auth_uid
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", typedCustomer.auth_uid)
    .maybeSingle();

  const typedUser = user as { id: string } | null;
  return typedUser?.id || null;
}

/**
 * Count addresses for customer
 */
async function countAddressesForCustomer(customerId: string): Promise<number> {
  const userId = await getUserIdForCustomer(customerId);
  if (!userId) {
    return 0;
  }

  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Error counting addresses:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Create new address
 * Enforces max 3 addresses per customer
 */
export async function createAddressAction(
  data: AddressFormData
): Promise<AddressActionResult> {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate phone if provided
    if (data.phone) {
      const phoneValidation = validatePhone(data.phone);
      if (!phoneValidation.valid) {
        return { success: false, error: phoneValidation.error };
      }
    }

    // Check address count
    const currentCount = await countAddressesForCustomer(customerId);
    if (currentCount >= MAX_ADDRESSES) {
      return {
        success: false,
        error: `Maximum ${MAX_ADDRESSES} addresses allowed. Please delete an existing address first.`,
      };
    }

    const userId = await getUserIdForCustomer(customerId);
    if (!userId) {
      return { success: false, error: "Failed to retrieve user information" };
    }

    const supabase = createServiceRoleClient();

    // If this is set as default, unset other defaults
    if (data.is_default) {
      await (supabase
        .from("addresses") as any)
        .update({ is_default: false })
        .eq("user_id", userId)
        .neq("is_default", false); // Only update if there are existing defaults
    }

    // Create address
    const { data: address, error } = await (supabase
      .from("addresses") as any)
      .insert({
        user_id: userId,
        customer_id: customerId, // Also set customer_id if column exists
        full_name: data.full_name.trim(),
        phone: data.phone.trim() || null,
        line1: data.line1.trim(),
        line2: data.line2?.trim() || null,
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim(),
        country: data.country?.trim() || "India",
        is_default: data.is_default || false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating address:", error);
      return { success: false, error: "Failed to create address" };
    }

    const typedAddress = address as { id: string } | null;
    if (!typedAddress) {
      return { success: false, error: "Failed to create address" };
    }

    revalidatePath("/account/addresses");
    return { success: true, addressId: typedAddress.id };
  } catch (error: any) {
    console.error("Create address error:", error);
    return { success: false, error: error.message || "Failed to create address" };
  }
}

/**
 * Update existing address
 */
export async function updateAddressAction(
  addressId: string,
  data: AddressFormData
): Promise<AddressActionResult> {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate phone if provided
    if (data.phone) {
      const phoneValidation = validatePhone(data.phone);
      if (!phoneValidation.valid) {
        return { success: false, error: phoneValidation.error };
      }
    }

    const userId = await getUserIdForCustomer(customerId);
    if (!userId) {
      return { success: false, error: "Failed to retrieve user information" };
    }

    // Verify address belongs to this customer
    const supabase = createServiceRoleClient();
    const { data: existingAddress } = await (supabase
      .from("addresses") as any)
      .select("user_id, customer_id")
      .eq("id", addressId)
      .single();

    const typedExistingAddress = existingAddress as { user_id: string | null; customer_id: string | null } | null;
    if (!typedExistingAddress || typedExistingAddress.user_id !== userId) {
      return { success: false, error: "Address not found or unauthorized" };
    }

    // If this is set as default, unset other defaults
    if (data.is_default) {
      await (supabase
        .from("addresses") as any)
        .update({ is_default: false })
        .eq("user_id", userId)
        .neq("id", addressId);
    }

    // Update address
    const { error } = await (supabase
      .from("addresses") as any)
      .update({
        full_name: data.full_name.trim(),
        phone: data.phone.trim() || null,
        line1: data.line1.trim(),
        line2: data.line2?.trim() || null,
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim(),
        country: data.country?.trim() || "India",
        is_default: data.is_default || false,
      })
      .eq("id", addressId);

    if (error) {
      console.error("Error updating address:", error);
      return { success: false, error: "Failed to update address" };
    }

    revalidatePath("/account/addresses");
    return { success: true, addressId };
  } catch (error: any) {
    console.error("Update address error:", error);
    return { success: false, error: error.message || "Failed to update address" };
  }
}

/**
 * Set default address
 * Unsets default on other addresses for the same customer
 */
export async function setDefaultAddressAction(
  addressId: string
): Promise<AddressActionResult> {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = await getUserIdForCustomer(customerId);
    if (!userId) {
      return { success: false, error: "Failed to retrieve user information" };
    }

    const supabase = createServiceRoleClient();

    // Verify address belongs to this customer
    const { data: existingAddress } = await (supabase
      .from("addresses") as any)
      .select("user_id")
      .eq("id", addressId)
      .single();

    const typedExistingAddress = existingAddress as { user_id: string | null } | null;
    if (!typedExistingAddress || typedExistingAddress.user_id !== userId) {
      return { success: false, error: "Address not found or unauthorized" };
    }

    // Unset other defaults
    await (supabase
      .from("addresses") as any)
      .update({ is_default: false })
      .eq("user_id", userId)
      .neq("id", addressId);

    // Set this address as default
    const { error } = await (supabase
      .from("addresses") as any)
      .update({ is_default: true })
      .eq("id", addressId);

    if (error) {
      console.error("Error setting default address:", error);
      return { success: false, error: "Failed to set default address" };
    }

    revalidatePath("/account/addresses");
    return { success: true, addressId };
  } catch (error: any) {
    console.error("Set default address error:", error);
    return { success: false, error: error.message || "Failed to set default address" };
  }
}

/**
 * Delete address
 * If deleting default address, auto-promote earliest created address to default
 */
export async function deleteAddressAction(
  addressId: string
): Promise<AddressActionResult> {
  try {
    const customerId = await getCustomerId();
    if (!customerId) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = await getUserIdForCustomer(customerId);
    if (!userId) {
      return { success: false, error: "Failed to retrieve user information" };
    }

    const supabase = createServiceRoleClient();

    // Verify address belongs to this customer and check if it's default
    const { data: existingAddress } = await supabase
      .from("addresses")
      .select("is_default")
      .eq("id", addressId)
      .eq("user_id", userId)
      .single();

    const typedExistingAddress = existingAddress as { is_default: boolean | null } | null;
    if (!typedExistingAddress) {
      return { success: false, error: "Address not found or unauthorized" };
    }

    const wasDefault = typedExistingAddress.is_default;

    // Delete address
    const { error } = await (supabase.from("addresses") as any).delete().eq("id", addressId);

    if (error) {
      console.error("Error deleting address:", error);
      return { success: false, error: "Failed to delete address" };
    }

    // If deleted address was default, promote earliest created address to default
    if (wasDefault) {
      const { data: remainingAddresses } = await (supabase
        .from("addresses") as any)
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      const typedRemainingAddresses = (remainingAddresses || []) as Array<{ id: string }>;
      if (typedRemainingAddresses.length > 0) {
        await (supabase
          .from("addresses") as any)
          .update({ is_default: true })
          .eq("id", typedRemainingAddresses[0].id);
      }
    }

    revalidatePath("/account/addresses");
    return { success: true };
  } catch (error: any) {
    console.error("Delete address error:", error);
    return { success: false, error: error.message || "Failed to delete address" };
  }
}

