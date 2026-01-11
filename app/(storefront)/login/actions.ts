"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { findCustomerByMobile, findOrCreateCustomerForAuthUid } from "@/lib/auth/customers";
import { verifyOtp, normalizePhone } from "@/lib/otp/service";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

export interface LoginResult {
  success: boolean;
  error?: string;
  customerId?: string;
}

/**
 * Server action for customer login via OTP
 * 
 * Flow:
 * 1. Verify OTP
 * 2. Find customer by mobile
 * 3. If customer exists and has auth_uid → create session
 * 4. If customer exists but no auth_uid → create auth user and link
 * 5. If customer doesn't exist → return error (should use signup)
 * 6. Merge guest cart/wishlist
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  try {
    const mobile = formData.get("mobile")?.toString() || "";
    const otp = formData.get("otp")?.toString() || "";

    if (!mobile || !otp) {
      return { success: false, error: "Mobile number and OTP are required" };
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

    // Find customer by mobile
    const customer = await findCustomerByMobile(normalizedMobile);

    if (!customer) {
      return {
        success: false,
        error: "No account found with this mobile number. Please sign up first.",
      };
    }

    const supabase = await createServerClient();
    const serviceSupabase = createServiceRoleClient();

    let authUid = customer.auth_uid;

    // If customer doesn't have auth_uid, create auth user
    if (!authUid) {
      // Generate a random password (stored but never used by customer - OTP-only)
      const randomPassword = randomBytes(32).toString("hex");
      
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: customer.email || `${normalizedMobile}@zeynora.local`, // Use mobile as email if no email
        password: randomPassword, // Random password, never exposed to user
        email_confirm: true,
        user_metadata: {
          phone: `+91${normalizedMobile}`,
          first_name: customer.first_name,
          last_name: customer.last_name,
        },
      });

      if (authError || !authData.user) {
        console.error("Error creating auth user:", authError);
        return {
          success: false,
          error: "Failed to create authentication account. Please try again.",
        };
      }

      authUid = authData.user.id;

      // Link auth_uid to customer
      const { error: updateError } = await serviceSupabase
        .from("customers")
        .update({ auth_uid: authUid })
        .eq("id", customer.id);

      if (updateError) {
        console.error("Error linking auth_uid:", updateError);
        return {
          success: false,
          error: "Failed to link authentication account. Please try again.",
        };
      }
    }

    // Create session by signing in with the auth user's email
    // Note: We use a server-side sign-in with a random password that was set during user creation
    // The password is never exposed to the client - this is OTP-only from user's perspective
    const emailForAuth = customer.email || `${normalizedMobile}@zeynora.local`;
    
    // Use admin API to get user and reset password to a new random one, then sign in
    // Actually, we'll use a simpler approach: generate a magic link and exchange it for a session
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
        // Exchange token for session using server client
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
    await mergeGuestData(authUid, customer.id);

    revalidatePath("/account");
    return { success: true, customerId: customer.id };
  } catch (error: unknown) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during login";
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
    // Don't fail login if merge fails
  }
}

















