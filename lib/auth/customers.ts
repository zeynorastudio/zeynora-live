/**
 * Customer Authentication Helpers
 * 
 * Helper functions for customer authentication flow, including:
 * - Finding or creating customer records
 * - Mapping auth_uid to customer records
 * - Validating customer data
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { validatePhone as validatePhoneUtil } from "@/lib/utils/validation";

export interface Customer {
  id: string;
  auth_uid: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Validates phone number format
 * If provided, must match: +91 followed by exactly 10 digits
 * Re-exported from utils/validation for backward compatibility
 */
export { validatePhoneUtil as validatePhone };

/**
 * Sanitizes and normalizes email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks if email exists in admin users table
 * Returns true if email is reserved for admin accounts
 */
export async function isAdminEmail(email: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const sanitizedEmail = sanitizeEmail(email);

  const { data, error } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("email", sanitizedEmail)
    .in("role", ["super_admin", "admin", "staff"])
    .maybeSingle();

  if (error) {
    console.error("Error checking admin email:", error);
    // On error, assume it's not an admin email to avoid blocking legitimate signups
    return false;
  }

  return data !== null;
}

/**
 * Finds customer by auth_uid
 */
export async function findCustomerByAuthUid(
  authUid: string
): Promise<Customer | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_uid", authUid)
    .maybeSingle();

  if (error) {
    console.error("Error finding customer by auth_uid:", error);
    return null;
  }

  return data as Customer | null;
}

/**
 * Finds customer by email
 */
export async function findCustomerByEmail(
  email: string
): Promise<Customer | null> {
  const supabase = createServiceRoleClient();
  const sanitizedEmail = sanitizeEmail(email);

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("email", sanitizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Error finding customer by email:", error);
    return null;
  }

  return data as Customer | null;
}

/**
 * Finds customer by mobile number
 * Mobile is normalized to 10 digits (no +91 prefix)
 */
export async function findCustomerByMobile(
  mobile: string
): Promise<Customer | null> {
  const supabase = createServiceRoleClient();
  
  // Normalize mobile: remove all non-digits, then take last 10 digits
  const digits = mobile.replace(/\D/g, "");
  const normalizedMobile = digits.length === 12 && digits.startsWith("91") 
    ? digits.slice(2) 
    : digits.slice(-10);
  
  // Validate format
  if (!/^\d{10}$/.test(normalizedMobile)) {
    return null;
  }
  
  // Format as +91XXXXXXXXXX for database lookup
  const formattedMobile = `+91${normalizedMobile}`;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", formattedMobile)
    .maybeSingle();

  if (error) {
    console.error("Error finding customer by mobile:", error);
    return null;
  }

  return data as Customer | null;
}

/**
 * Creates a new customer record
 * Uses service-role client for elevated privileges
 */
export async function createCustomer(data: {
  auth_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = createServiceRoleClient();

  // Validate phone
  const phoneValidation = validatePhoneUtil(data.phone);
  if (!phoneValidation.valid) {
    return { customer: null, error: phoneValidation.error || "Invalid phone number" };
  }

  // Sanitize email
  const sanitizedEmail = sanitizeEmail(data.email);

  // Check for admin email collision
  const isAdmin = await isAdminEmail(sanitizedEmail);
  if (isAdmin) {
    return {
      customer: null,
      error: "This email is reserved for admin accounts. Please contact support.",
    };
  }

  // Check if customer already exists with this email
  const existingCustomer = await findCustomerByEmail(sanitizedEmail);
  if (existingCustomer) {
    // If customer exists but auth_uid is null, update it
    if (!existingCustomer.auth_uid) {
      const { data: updated, error: updateError } = await (supabase
        .from("customers") as any)
        .update({ auth_uid: data.auth_uid })
        .eq("id", existingCustomer.id)
        .select()
        .single();

      if (updateError) {
        return { customer: null, error: "Failed to update customer record" };
      }

      return { customer: updated as Customer, error: null };
    }

    // If customer exists with different auth_uid, return error
    if (existingCustomer.auth_uid !== data.auth_uid) {
      return {
        customer: null,
        error: "An account with this email already exists",
      };
    }

    // Customer already exists with this auth_uid
    return { customer: existingCustomer, error: null };
  }

  // Create new customer
  const { data: customer, error } = await (supabase
    .from("customers") as any)
    .insert({
      auth_uid: data.auth_uid,
      email: sanitizedEmail,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    return { customer: null, error: "Failed to create customer account" };
  }

  return { customer: customer as Customer, error: null };
}

/**
 * Maps email to auth_uid for existing customer records
 * Used during signup when customer record exists but auth_uid is null
 */
export async function mapEmailToAuthUid(
  email: string,
  authUid: string
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = createServiceRoleClient();
  const sanitizedEmail = sanitizeEmail(email);

  // Check for admin email collision
  const isAdmin = await isAdminEmail(sanitizedEmail);
  if (isAdmin) {
    return {
      customer: null,
      error: "This email is reserved for admin accounts. Please contact support.",
    };
  }

  // Find customer by email
  const existingCustomer = await findCustomerByEmail(sanitizedEmail);

  if (!existingCustomer) {
    return { customer: null, error: "Customer record not found" };
  }

  // If auth_uid is already set and different, return error
  if (existingCustomer.auth_uid && existingCustomer.auth_uid !== authUid) {
    return {
      customer: null,
      error: "This email is already associated with another account",
    };
  }

  // Update auth_uid
  const { data: updated, error } = await (supabase
    .from("customers") as any)
    .update({ auth_uid: authUid })
    .eq("id", existingCustomer.id)
    .select()
    .single();

  if (error) {
    console.error("Error mapping email to auth_uid:", error);
    return { customer: null, error: "Failed to update customer record" };
  }

  return { customer: updated as Customer, error: null };
}

/**
 * Finds or creates customer for auth_uid
 * Used during login when customer record might not exist yet
 */
export async function findOrCreateCustomerForAuthUid(
  authUid: string,
  email: string
): Promise<{ customer: Customer | null; error: string | null }> {
  // First, try to find by auth_uid
  const existingByAuth = await findCustomerByAuthUid(authUid);
  if (existingByAuth) {
    return { customer: existingByAuth, error: null };
  }

  // Check if email is in admin users table
  const isAdmin = await isAdminEmail(email);
  if (isAdmin) {
    return {
      customer: null,
      error: "This email is reserved for admin accounts. Please use the admin portal to sign in.",
    };
  }

  // Try to find by email
  const existingByEmail = await findCustomerByEmail(email);
  if (existingByEmail) {
    // If customer exists but auth_uid is null, update it
    if (!existingByEmail.auth_uid) {
      return await mapEmailToAuthUid(email, authUid);
    }

    // Customer exists with different auth_uid
    return {
      customer: null,
      error: "An account with this email already exists with a different authentication method",
    };
  }

  // Create new customer (we don't have first_name/last_name during login)
  // This should rarely happen, but we'll create a minimal record
  const supabase = createServiceRoleClient();
  const sanitizedEmail = sanitizeEmail(email);

  const { data: customer, error } = await (supabase
    .from("customers") as any)
    .insert({
      auth_uid: authUid,
      email: sanitizedEmail,
      first_name: "", // Will be updated on first profile update
      last_name: "", // Will be updated on first profile update
      phone: null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer during login:", error);
    return { customer: null, error: "Failed to create customer account" };
  }

  return { customer: customer as Customer, error: null };
}

/**
 * Gets customer by auth_uid (using regular client, not service-role)
 * For use in server actions that don't need elevated privileges
 */
export async function getCustomerByAuthUid(
  supabase: SupabaseClient<Database>,
  authUid: string
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_uid", authUid)
    .maybeSingle();

  if (error) {
    console.error("Error getting customer:", error);
    return null;
  }

  return data as Customer | null;
}

/**
 * Gets customer by ID
 * For use in checkout when customer_id is provided from OTP verification
 */
export async function getCustomerById(
  customerId: string
): Promise<Customer | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Error getting customer by ID:", error);
    return null;
  }

  return data as Customer | null;
}

/**
 * Creates a customer without Supabase Auth
 * For quick checkout signup - auth_uid will be null until full login
 */
export async function createCustomerWithoutAuth(data: {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = createServiceRoleClient();

  // Validate phone
  const phoneValidation = validatePhoneUtil(data.phone);
  if (!phoneValidation.valid) {
    return { customer: null, error: phoneValidation.error || "Invalid phone number" };
  }

  // Sanitize email
  const sanitizedEmail = sanitizeEmail(data.email);

  // Check for admin email collision
  const isAdmin = await isAdminEmail(sanitizedEmail);
  if (isAdmin) {
    return {
      customer: null,
      error: "This email is reserved for admin accounts.",
    };
  }

  // Check if customer already exists
  const existingCustomer = await findCustomerByEmail(sanitizedEmail);
  if (existingCustomer) {
    // Return existing customer
    return { customer: existingCustomer, error: null };
  }

  // Create new customer without auth_uid
  const { data: customer, error } = await (supabase
    .from("customers") as unknown as { insert: (data: unknown) => { select: () => { single: () => Promise<{ data: Customer | null; error: unknown }> } } })
    .insert({
      auth_uid: null, // No auth link yet
      email: sanitizedEmail,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer without auth:", error);
    return { customer: null, error: "Failed to create customer account" };
  }

  return { customer: customer as Customer, error: null };
}