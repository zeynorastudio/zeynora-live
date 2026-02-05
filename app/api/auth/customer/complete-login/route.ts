/**
 * POST /api/auth/customer/complete-login
 * Complete login/signup after OTP verification
 * 
 * For returning customers:
 *   Body: { email: string, customer_id: string }
 *   - Creates session for existing customer
 * 
 * For new customers (checkout signup):
 *   Body: { email: string, first_name: string, last_name: string, phone?: string }
 *   - Creates customer record
 *   - Creates Supabase Auth user
 *   - Creates session
 *   - Returns customer profile
 * 
 * Note: OTP MUST be verified before calling this endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { findCustomerByEmail, createCustomer, isAdminEmail, sanitizeEmail } from "@/lib/auth/customers";
import { randomBytes } from "crypto";
import type { Customer } from "@/lib/auth/customers";

export const dynamic = "force-dynamic";

/**
 * Build a safe customer profile object for response
 */
function buildCustomerProfile(customer: Customer) {
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, customer_id, first_name, last_name, phone } = body;
    
    // Validation - email is always required
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
        { status: 400 }
      );
    }
    
    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address format" },
        { status: 400 }
      );
    }
    
    const serviceSupabase = createServiceRoleClient();
    
    // Check if this is a new customer signup (has first_name, last_name)
    const isNewCustomerSignup = first_name && last_name && !customer_id;
    
    let customer: Customer | null = null;
    
    if (isNewCustomerSignup) {
      // NEW CUSTOMER SIGNUP FLOW
      // Validate required fields
      if (typeof first_name !== "string" || !first_name.trim()) {
        return NextResponse.json(
          { success: false, error: "First name is required" },
          { status: 400 }
        );
      }
      
      if (typeof last_name !== "string" || !last_name.trim()) {
        return NextResponse.json(
          { success: false, error: "Last name is required" },
          { status: 400 }
        );
      }
      
      // Check if customer already exists
      const existingCustomer = await findCustomerByEmail(normalizedEmail);
      if (existingCustomer) {
        return NextResponse.json(
          { success: false, error: "An account with this email already exists" },
          { status: 400 }
        );
      }
      
      // Check for admin email collision
      const isAdmin = await isAdminEmail(normalizedEmail);
      if (isAdmin) {
        return NextResponse.json(
          { success: false, error: "This email is reserved for admin accounts" },
          { status: 400 }
        );
      }
      
      // Create Supabase Auth user with random password (OTP-only auth)
      const randomPassword = randomBytes(32).toString("hex");
      
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          phone: phone || null,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
      });
      
      if (authError || !authData.user) {
        console.error("[CUSTOMER_AUTH] Auth user creation failed:", authError);
        if (authError?.message?.includes("already registered") || authError?.message?.includes("already exists")) {
          return NextResponse.json(
            { success: false, error: "An account with this email already exists" },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, error: "Failed to create authentication account" },
          { status: 500 }
        );
      }
      
      const authUid = authData.user.id;
      
      // Create customer record
      const customerResult = await createCustomer({
        auth_uid: authUid,
        email: normalizedEmail,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone?.trim() || null,
      });
      
      if (customerResult.error || !customerResult.customer) {
        console.error("[CUSTOMER_AUTH] Customer creation failed:", customerResult.error);
        // Try to delete the auth user we just created
        await serviceSupabase.auth.admin.deleteUser(authUid);
        return NextResponse.json(
          { success: false, error: customerResult.error || "Failed to create customer account" },
          { status: 500 }
        );
      }
      
      customer = customerResult.customer;
    } else {
      // RETURNING CUSTOMER LOGIN FLOW
      if (!customer_id || typeof customer_id !== "string") {
        return NextResponse.json(
          { success: false, error: "Customer ID is required for login" },
          { status: 400 }
        );
      }
      
      // Find customer
      customer = await findCustomerByEmail(normalizedEmail);
      
      if (!customer || customer.id !== customer_id) {
        return NextResponse.json(
          { success: false, error: "Customer not found" },
          { status: 404 }
        );
      }
      
      // If customer exists but no auth_uid, create auth user
      if (!customer.auth_uid) {
        const randomPassword = randomBytes(32).toString("hex");
        
        const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
          email: customer.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: {
            phone: customer.phone || null,
            first_name: customer.first_name,
            last_name: customer.last_name,
          },
        });
        
        if (authError || !authData.user) {
          console.error("[CUSTOMER_AUTH] Auth user creation failed for existing customer:", authError);
          return NextResponse.json(
            { success: false, error: "Failed to create authentication account" },
            { status: 500 }
          );
        }
        
        // Update customer with auth_uid
        const { error: updateError } = await serviceSupabase
          .from("customers")
          .update({ auth_uid: authData.user.id })
          .eq("id", customer.id);
        
        if (updateError) {
          console.error("[CUSTOMER_AUTH] Failed to link auth_uid:", updateError);
        }
        
        customer.auth_uid = authData.user.id;
      }
    }
    
    if (!customer || !customer.auth_uid) {
      return NextResponse.json(
        { success: false, error: "Customer authentication not set up" },
        { status: 400 }
      );
    }
    
    // Generate magic link for session creation
    const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: customer.email,
    });
    
    if (linkError || !linkData) {
      console.error("[CUSTOMER_AUTH] Error generating auth link:", linkError);
      // Still return success with customer data for checkout
      // Session creation is optional for checkout flow
      return NextResponse.json({
        success: true,
        customer: buildCustomerProfile(customer),
        session: null,
        message: "Customer created/logged in. Session creation skipped.",
      });
    }
    
    // Extract token from magic link
    const magicLink = linkData.properties.action_link;
    const tokenMatch = magicLink.match(/token=([^&]+)/);
    
    if (!tokenMatch) {
      // Still return success with customer data
      return NextResponse.json({
        success: true,
        customer: buildCustomerProfile(customer),
        session: null,
        message: "Session token extraction failed.",
      });
    }
    
    // Exchange token for session
    const supabase = await createServerClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token: tokenMatch[1],
      type: "magiclink",
    });
    
    if (sessionError || !sessionData.session) {
      console.error("[CUSTOMER_AUTH] Error creating session:", sessionError);
      // Still return success with customer data
      return NextResponse.json({
        success: true,
        customer: buildCustomerProfile(customer),
        session: null,
        message: "Session creation failed.",
      });
    }
    
    return NextResponse.json({
      success: true,
      customer: buildCustomerProfile(customer),
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    });
  } catch (error: unknown) {
    console.error("[CUSTOMER_AUTH] Complete login error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to complete login" },
      { status: 500 }
    );
  }
}









