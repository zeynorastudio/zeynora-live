"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createCustomer,
  findCustomerByMobile,
  sanitizeEmail,
  isAdminEmail,
} from "@/lib/auth/customers";
import { verifyOtp, normalizePhone } from "@/lib/otp/service";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export interface SignupResult {
  success: boolean;
  error?: string;
  customerId?: string;
}

/**
 * Server action for customer signup via OTP
 * 
 * Flow:
 * 1. Verify OTP
 * 2. Validate input (mobile, first_name, last_name, email optional)
 * 3. Check if customer already exists by mobile → return error (should use login)
 * 4. Check for admin email collision (if email provided)
 * 5. Create Supabase Auth user (with random password, never used)
 * 6. Create customer record
 * 7. Merge guest cart/wishlist
 */
export async function signupAction(formData: FormData): Promise<SignupResult> {
  try {
    // Extract form data
    const mobile = formData.get("mobile")?.toString() || "";
    const otp = formData.get("otp")?.toString() || "";
    const firstName = formData.get("first_name")?.toString() || "";
    const lastName = formData.get("last_name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";

    // Validation
    if (!mobile || !otp || !firstName || !lastName) {
      return { success: false, error: "All required fields must be filled" };
    }

    const normalizedMobile = normalizePhone(mobile);
    
    if (!/^\d{10}$/.test(normalizedMobile)) {
      return { success: false, error: "Invalid mobile number format" };
    }

    if (!/^\d{6}$/.test(otp)) {
      return { success: false, error: "Invalid OTP format" };
    }

    // Verify OTP
    const otpResult = await verifyOtp({
      mobile: normalizedMobile,
      otp,
      purpose: "CUSTOMER_AUTH",
    });

    if (!otpResult.success) {
      return { success: false, error: otpResult.error || "Invalid or expired OTP" };
    }

    // Check if customer already exists by mobile
    const existingCustomer = await findCustomerByMobile(normalizedMobile);
    if (existingCustomer) {
      return {
        success: false,
        error: "An account with this mobile number already exists. Please sign in instead.",
      };
    }

    // Sanitize email if provided
    const sanitizedEmail = email.trim() ? sanitizeEmail(email.trim()) : null;

    // Check for admin email collision if email provided
    if (sanitizedEmail) {
      const isAdmin = await isAdminEmail(sanitizedEmail);
      if (isAdmin) {
        return {
          success: false,
          error: "This email is reserved for admin accounts. Please contact support.",
        };
      }
    }

    const serviceSupabase = createServiceRoleClient();

    // Create Supabase Auth user with random password (never used, OTP-only)
    const randomPassword = randomBytes(32).toString("hex");
    const emailForAuth = sanitizedEmail || `${normalizedMobile}@zeynora.local`;
    
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email: emailForAuth,
      password: randomPassword, // Random password, never exposed to user
      email_confirm: true, // Auto-confirm
      user_metadata: {
        phone: `+91${normalizedMobile}`,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("already exists")) {
        return { success: false, error: "An account with this email already exists" };
      }
      return { success: false, error: authError.message || "Failed to create authentication account" };
    }

    if (!authData.user) {
      return { success: false, error: "Failed to create authentication account" };
    }

    const authUid = authData.user.id;

    // Create customer record
    const customerResult = await createCustomer({
      auth_uid: authUid,
      email: sanitizedEmail || emailForAuth, // Use provided email or generated one
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: `+91${normalizedMobile}`, // Store in +91XXXXXXXXXX format
    });

    if (customerResult.error || !customerResult.customer) {
      console.error("Customer creation failed after auth user creation:", customerResult.error);
      return {
        success: false,
        error: customerResult.error || "Failed to create customer account. Please contact support.",
      };
    }

    // Create session by generating magic link and exchanging for session
    const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: emailForAuth,
    });

    if (linkError || !linkData) {
      console.error("Error generating auth link:", linkError);
      // Session creation will happen on next page load via client-side refresh
    } else {
      // Extract token and verify to create session
      const magicLink = linkData.properties.action_link;
      const tokenMatch = magicLink.match(/token=([^&]+)/);
      
      if (tokenMatch) {
        // Create server client to exchange token
        const { createServerClient } = await import("@/lib/supabase/server");
        const supabase = await createServerClient();
        
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token: tokenMatch[1],
          type: "magiclink",
        });
        
        if (verifyError) {
          console.error("Error verifying magic link:", verifyError);
        }
      }
    }

    // Merge guest cart/wishlist
    await mergeGuestData(authUid, customerResult.customer.id);

    revalidatePath("/account");
    return { success: true, customerId: customerResult.customer.id };
  } catch (error: unknown) {
    console.error("Signup error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during signup";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Helper function to merge guest cart/wishlist into customer account
 */
async function mergeGuestData(authUid: string, customerId: string) {
  try {
    // Call the merge-guest API route
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/merge-guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId }),
    });

    if (!response.ok) {
      console.error("Failed to merge guest data:", await response.text());
    }
  } catch (error) {
    console.error("Error merging guest data:", error);
    // Don't fail signup if merge fails
  }
}

















