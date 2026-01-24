/**
 * POST /api/auth/customer/complete-login
 * Complete login by creating Supabase Auth session after OTP verification
 * 
 * Body: { email: string, customer_id: string }
 * 
 * This route creates a session for the customer by:
 * 1. Finding the customer's auth_uid
 * 2. Using admin API to generate a magic link
 * 3. Setting the session cookie
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { findCustomerByEmail, findCustomerByAuthUid } from "@/lib/auth/customers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, customer_id } = body;
    
    // Validation
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
        { status: 400 }
      );
    }
    
    if (!customer_id || typeof customer_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
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
    
    // Find customer
    const customer = await findCustomerByEmail(normalizedEmail);
    
    if (!customer || customer.id !== customer_id) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }
    
    if (!customer.auth_uid) {
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
      console.error("Error generating auth link:", linkError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }
    
    // Extract token from magic link
    const magicLink = linkData.properties.action_link;
    const tokenMatch = magicLink.match(/token=([^&]+)/);
    
    if (!tokenMatch) {
      return NextResponse.json(
        { success: false, error: "Failed to extract session token" },
        { status: 500 }
      );
    }
    
    // Exchange token for session
    const supabase = await createServerClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
      token: tokenMatch[1],
      type: "magiclink",
    });
    
    if (sessionError || !sessionData.session) {
      console.error("Error creating session:", sessionError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    });
  } catch (error: unknown) {
    console.error("[CUSTOMER_AUTH] Session creation error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to create session" },
      { status: 500 }
    );
  }
}









