/**
 * OTP Service Abstraction
 * Phase 4.1: Provider-agnostic OTP service for order tracking
 * 
 * This service abstracts OTP generation, storage, and verification.
 * Provider adapters can be swapped without changing business logic.
 */

import { randomBytes, createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendOTPEmail } from "@/lib/email/service";
import { findCustomerByMobile } from "@/lib/auth/customers";

export type OtpPurpose = "ORDER_TRACKING" | "CUSTOMER_AUTH";

export interface OtpSendParams {
  mobile: string; // Normalized 10-digit phone number
  purpose: OtpPurpose;
  entity_id?: string; // order_id for ORDER_TRACKING (optional for CUSTOMER_AUTH)
  ip_address?: string;
  email?: string; // Optional email for OTP delivery (used in signup flow)
}

export interface OtpVerifyParams {
  mobile: string;
  otp: string;
  purpose: OtpPurpose;
  entity_id?: string; // order_id for ORDER_TRACKING (optional for CUSTOMER_AUTH)
  ip_address?: string;
}

export interface OtpResult {
  success: boolean;
  error?: string;
  attempts_remaining?: number;
  locked_until?: string;
}

/**
 * Normalize phone number to 10 digits (remove +91, spaces, etc.)
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, remove 91
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // Return last 10 digits
  return digits.slice(-10);
}

/**
 * Generate 6-digit OTP
 */
function generateOtp(): string {
  // Generate random 6-digit number (000000-999999)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
}

/**
 * Hash OTP using SHA-256
 */
function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Verify OTP against hash
 */
function verifyOtpHash(otp: string, hash: string): boolean {
  const computedHash = hashOtp(otp);
  return computedHash === hash;
}

/**
 * OTP Provider Adapter Interface
 * Implement this interface for different OTP providers (SMS, WhatsApp, etc.)
 */
export interface OtpProvider {
  send(params: { mobile: string; otp: string; purpose: OtpPurpose }): Promise<{ success: boolean; error?: string }>;
}

/**
 * Mock OTP Provider (for development/testing)
 * Returns success without actually sending OTP
 * Replace with actual provider adapter when API keys are available
 */
class MockOtpProvider implements OtpProvider {
  async send(params: { mobile: string; otp: string; purpose: OtpPurpose }): Promise<{ success: boolean; error?: string }> {
    // In development, log OTP to console
    if (process.env.NODE_ENV === "development") {
      console.log(`[MOCK OTP] Sending OTP ${params.otp} to ${params.mobile} for ${params.purpose}`);
    }
    return { success: true };
  }
}

/**
 * Get OTP provider instance
 * Currently uses MockOtpProvider for development/testing
 * To add a real provider, implement the OtpProvider interface and update this function
 */
function getOtpProvider(): OtpProvider {
  // Check for provider API keys
  const providerType = process.env.OTP_PROVIDER || "mock";
  
  if (providerType === "mock" || !process.env.OTP_API_KEY) {
    return new MockOtpProvider();
  }
  
  // Real provider implementations can be added here when needed
  // They must implement the OtpProvider interface
  
  return new MockOtpProvider();
}

/**
 * Send OTP to mobile number
 * 
 * Rules:
 * - OTP validity: 5 minutes
 * - Max resend attempts per order: 3
 * - Lockout after failures: 15 minutes
 * - OTP is scoped to: order_id + mobile + purpose (for ORDER_TRACKING)
 * - OTP is scoped to: mobile + purpose (for CUSTOMER_AUTH)
 */
export async function sendOtp(params: OtpSendParams): Promise<OtpResult> {
  const supabase = createServiceRoleClient();
  const normalizedMobile = normalizePhone(params.mobile);
  
  // Validate mobile format
  if (!/^\d{10}$/.test(normalizedMobile)) {
    return { success: false, error: "Invalid mobile number format" };
  }
  
  // Check rate limiting
  const rateLimitCheck = await checkRateLimit({
    identifier: normalizedMobile,
    identifierType: "mobile",
    action: "request_otp",
    supabase,
  });
  
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: "Too many requests. Please try again later.",
      locked_until: rateLimitCheck.lockedUntil,
    };
  }
  
  // Handle CUSTOMER_AUTH purpose (no order validation needed)
  if (params.purpose === "CUSTOMER_AUTH") {
    // Check for existing unverified OTP
    const { data: existingOtp } = await supabase
      .from("customer_auth_otps")
      .select("id, attempts, max_attempts, locked_until, created_at")
      .eq("mobile", normalizedMobile)
      .eq("purpose", params.purpose)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    // Check if locked
    if (existingOtp?.locked_until) {
      const lockedUntil = new Date(existingOtp.locked_until);
      if (lockedUntil > new Date()) {
        return {
          success: false,
          error: "Too many attempts. Please try again later.",
          locked_until: existingOtp.locked_until,
        };
      }
    }
    
    // Check resend attempts (max 3 per hour)
    const { count: resendCount } = await supabase
      .from("customer_auth_otps")
      .select("*", { count: "exact", head: true })
      .eq("mobile", normalizedMobile)
      .eq("purpose", params.purpose)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString()); // Last hour
    
    if (resendCount && resendCount >= 3) {
      return {
        success: false,
        error: "Maximum resend attempts reached. Please try again later.",
      };
    }
    
    // Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes validity
    
    // Store OTP (hashed)
    const { error: insertError } = await supabase
      .from("customer_auth_otps")
      .insert({
        mobile: normalizedMobile,
        otp_hash: otpHash,
        purpose: params.purpose,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        max_attempts: 3,
        ip_address: params.ip_address || null,
      } as unknown as never);
    
    if (insertError) {
      console.error("[OTP] Failed to store OTP:", insertError);
      return { success: false, error: "Unable to process request" };
    }
    
    // Send OTP via email (Resend)
    // Determine recipient email: use provided email (signup) or look up by mobile (login)
    let recipientEmail: string | null = null;
    
    if (params.email) {
      // Email provided (signup flow)
      recipientEmail = params.email.trim().toLowerCase();
    } else {
      // Look up customer email by mobile (login flow)
      const customer = await findCustomerByMobile(normalizedMobile);
      recipientEmail = customer?.email || null;
    }
    
    if (!recipientEmail) {
      return { success: false, error: "Email address required for OTP delivery" };
    }
    
    // Send OTP email via Resend
    const emailSent = await sendOTPEmail(recipientEmail, otp, 5);
    
    if (!emailSent) {
      console.error("[OTP] Failed to send OTP email:", {
        mobile: normalizedMobile.substring(0, 3) + "***",
        email: recipientEmail.substring(0, 3) + "***",
      });
      // If OTP email fails, authentication must fail (per requirements)
      return { success: false, error: "Unable to send OTP. Please try again." };
    }
    
    // Record rate limit
    await recordRateLimit({
      identifier: normalizedMobile,
      identifierType: "mobile",
      action: "request_otp",
      supabase,
    });
    
    return { success: true };
  }
  
  // Handle ORDER_TRACKING purpose (existing logic)
  // Check if order exists and phone matches
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, guest_phone, customer_id")
    .eq("id", params.entity_id)
    .single();
  
  if (orderError || !order) {
    // Generic error - don't reveal if order exists
    return { success: false, error: "Unable to process request" };
  }
  
  // Verify phone matches order
  const orderPhone = order.guest_phone ? normalizePhone(order.guest_phone) : null;
  if (orderPhone !== normalizedMobile) {
    // Generic error - don't reveal phone mismatch
    return { success: false, error: "Unable to process request" };
  }
  
  // Check for existing unverified OTP
  const { data: existingOtp } = await supabase
    .from("order_tracking_otps")
    .select("id, attempts, max_attempts, locked_until, created_at")
    .eq("order_id", params.entity_id)
    .eq("mobile", normalizedMobile)
    .eq("purpose", params.purpose)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  // Check if locked
  if (existingOtp?.locked_until) {
    const lockedUntil = new Date(existingOtp.locked_until);
    if (lockedUntil > new Date()) {
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
        locked_until: existingOtp.locked_until,
      };
    }
  }
  
  // Check resend attempts (max 3 per order)
  const { count: resendCount } = await supabase
    .from("order_tracking_otps")
    .select("*", { count: "exact", head: true })
    .eq("order_id", params.entity_id)
    .eq("mobile", normalizedMobile)
    .eq("purpose", params.purpose)
    .gte("created_at", new Date(Date.now() - 3600000).toISOString()); // Last hour
  
  if (resendCount && resendCount >= 3) {
    return {
      success: false,
      error: "Maximum resend attempts reached. Please try again later.",
    };
  }
  
  // Generate OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes validity
  
  // Store OTP (hashed)
  const { error: insertError } = await supabase
    .from("order_tracking_otps")
    .insert({
      order_id: params.entity_id,
      mobile: normalizedMobile,
      otp_hash: otpHash,
      purpose: params.purpose,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0,
      max_attempts: 3,
      ip_address: params.ip_address || null,
    } as unknown as never);
  
  if (insertError) {
    console.error("[OTP] Failed to store OTP:", insertError);
    return { success: false, error: "Unable to process request" };
  }
  
  // Send OTP via provider
  const provider = getOtpProvider();
  const sendResult = await provider.send({
    mobile: normalizedMobile,
    otp,
    purpose: params.purpose,
  });
  
  if (!sendResult.success) {
    return { success: false, error: "Unable to send OTP. Please try again." };
  }
  
  // Record rate limit
  await recordRateLimit({
    identifier: normalizedMobile,
    identifierType: "mobile",
    action: "request_otp",
    supabase,
  });
  
  // Audit log
  await supabase.from("admin_audit_logs").insert({
    action: "otp_requested",
    target_resource: "orders",
    target_id: params.entity_id,
    details: {
      mobile: normalizedMobile.substring(0, 3) + "****" + normalizedMobile.substring(7), // Masked
      purpose: params.purpose,
    },
  } as unknown as never);
  
  return { success: true };
}

/**
 * Verify OTP
 */
export async function verifyOtp(params: OtpVerifyParams): Promise<OtpResult & { token?: string }> {
  const supabase = createServiceRoleClient();
  const normalizedMobile = normalizePhone(params.mobile);
  
  // Validate mobile format
  if (!/^\d{10}$/.test(normalizedMobile)) {
    return { success: false, error: "Invalid mobile number format" };
  }
  
  // Check rate limiting
  const rateLimitCheck = await checkRateLimit({
    identifier: normalizedMobile,
    identifierType: "mobile",
    action: "verify_otp",
    supabase,
  });
  
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: "Too many attempts. Please try again later.",
      locked_until: rateLimitCheck.lockedUntil,
    };
  }
  
  // Handle CUSTOMER_AUTH purpose
  if (params.purpose === "CUSTOMER_AUTH") {
    // Find unverified OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from("customer_auth_otps")
      .select("*")
      .eq("mobile", normalizedMobile)
      .eq("purpose", params.purpose)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (otpError || !otpRecord) {
      return { success: false, error: "Invalid or expired OTP" };
    }
    
    const typedOtpRecord = otpRecord as {
      id: string;
      otp_hash: string;
      attempts: number;
      max_attempts: number;
      locked_until: string | null;
      expires_at: string;
    };
    
    // Check if locked
    if (typedOtpRecord.locked_until) {
      const lockedUntil = new Date(typedOtpRecord.locked_until);
      if (lockedUntil > new Date()) {
        return {
          success: false,
          error: "Too many attempts. Please try again later.",
          locked_until: typedOtpRecord.locked_until,
        };
      }
    }
    
    // Check attempts
    if (typedOtpRecord.attempts >= typedOtpRecord.max_attempts) {
      // Lock for 15 minutes
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
      
      await supabase
        .from("customer_auth_otps")
        .update({
          locked_until: lockedUntil.toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", typedOtpRecord.id);
      
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
        locked_until: lockedUntil.toISOString(),
      };
    }
    
    // Verify OTP hash
    const isValid = verifyOtpHash(params.otp, typedOtpRecord.otp_hash);
    
    if (!isValid) {
      // Increment attempts
      await supabase
        .from("customer_auth_otps")
        .update({
          attempts: typedOtpRecord.attempts + 1,
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", typedOtpRecord.id);
      
      const attemptsRemaining = typedOtpRecord.max_attempts - typedOtpRecord.attempts - 1;
      
      return {
        success: false,
        error: "Invalid OTP",
        attempts_remaining: Math.max(0, attemptsRemaining),
      };
    }
    
    // OTP is valid - mark as verified
    await supabase
      .from("customer_auth_otps")
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedOtpRecord.id);
    
    console.log("[OTP_VERIFIED]", {
      mobile: normalizedMobile.substring(0, 3) + "***", // Masked
      purpose: params.purpose,
    });
    
    return { success: true };
  }
  
  // Handle ORDER_TRACKING purpose (existing logic)
  // Find unverified OTP
  const { data: otpRecord, error: otpError } = await supabase
    .from("order_tracking_otps")
    .select("*")
    .eq("order_id", params.entity_id)
    .eq("mobile", normalizedMobile)
    .eq("purpose", params.purpose)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (otpError || !otpRecord) {
    return { success: false, error: "Invalid or expired OTP" };
  }
  
  const typedOtpRecord = otpRecord as {
    id: string;
    otp_hash: string;
    attempts: number;
    max_attempts: number;
    locked_until: string | null;
    expires_at: string;
  };
  
  // Check if locked
  if (typedOtpRecord.locked_until) {
    const lockedUntil = new Date(typedOtpRecord.locked_until);
    if (lockedUntil > new Date()) {
      return {
        success: false,
        error: "Too many attempts. Please try again later.",
        locked_until: typedOtpRecord.locked_until,
      };
    }
  }
  
  // Check attempts
  if (typedOtpRecord.attempts >= typedOtpRecord.max_attempts) {
    // Lock for 15 minutes
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
    
    await supabase
      .from("order_tracking_otps")
      .update({
        locked_until: lockedUntil.toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedOtpRecord.id);
    
    // Audit log
    await supabase.from("admin_audit_logs").insert({
      action: "otp_lockout",
      target_resource: "orders",
      target_id: params.entity_id,
      details: {
        mobile: normalizedMobile.substring(0, 3) + "****" + normalizedMobile.substring(7),
        attempts: typedOtpRecord.attempts,
      },
    } as unknown as never);
    
    return {
      success: false,
      error: "Too many attempts. Please try again later.",
      locked_until: lockedUntil.toISOString(),
    };
  }
  
  // Verify OTP hash
  const isValid = verifyOtpHash(params.otp, typedOtpRecord.otp_hash);
  
  if (!isValid) {
    // Increment attempts
    await supabase
      .from("order_tracking_otps")
      .update({
        attempts: typedOtpRecord.attempts + 1,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedOtpRecord.id);
    
    const attemptsRemaining = typedOtpRecord.max_attempts - typedOtpRecord.attempts - 1;
    
    return {
      success: false,
      error: "Invalid OTP",
      attempts_remaining: Math.max(0, attemptsRemaining),
    };
  }
  
  // OTP is valid - mark as verified
  await supabase
    .from("order_tracking_otps")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", typedOtpRecord.id);
  
  // Generate tracking token
  const token = await generateTrackingToken({
    order_id: params.entity_id,
    ip_address: params.ip_address,
    supabase,
  });
  
  // Audit log
  await supabase.from("admin_audit_logs").insert({
    action: "otp_verified",
    target_resource: "orders",
    target_id: params.entity_id,
    details: {
      mobile: normalizedMobile.substring(0, 3) + "****" + normalizedMobile.substring(7),
      purpose: params.purpose,
    },
  } as unknown as never);
  
  return { success: true, token };
}

/**
 * Rate limiting helpers
 */
export interface RateLimitCheck {
  allowed: boolean;
  lockedUntil?: string;
}

export async function checkRateLimit(params: {
  identifier: string;
  identifierType: "ip" | "mobile" | "order_id";
  action: "request_otp" | "verify_otp" | "view_tracking";
  supabase: ReturnType<typeof createServiceRoleClient>;
}): Promise<RateLimitCheck> {
  const { identifier, identifierType, action, supabase } = params;
  
  // Define rate limits (per hour)
  const limits: Record<string, number> = {
    request_otp: 5, // Max 5 OTP requests per hour
    verify_otp: 10, // Max 10 verification attempts per hour
    view_tracking: 20, // Max 20 tracking views per hour
  };
  
  const limit = limits[action] || 10;
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setMinutes(0, 0, 0); // Round down to current hour
  
  // Count attempts in current hour window
  const { data: records } = await supabase
    .from("order_tracking_rate_limits")
    .select("count")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("action", action)
    .eq("window_start", windowStart.toISOString())
    .gt("window_end", now.toISOString());
  
  if (records && records.length > 0) {
    const totalCount = records.reduce((sum, r) => sum + (r.count as number || 0), 0);
    if (totalCount >= limit) {
      return { allowed: false };
    }
  }
  
  return { allowed: true };
}

export async function recordRateLimit(params: {
  identifier: string;
  identifierType: "ip" | "mobile" | "order_id";
  action: "request_otp" | "verify_otp" | "view_tracking";
  supabase: ReturnType<typeof createServiceRoleClient>;
}): Promise<void> {
  const { identifier, identifierType, action, supabase } = params;
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0); // Round down to hour
  const windowEnd = new Date(windowStart);
  windowEnd.setHours(windowEnd.getHours() + 1);
  
  // Check if record exists
  const { data: existing } = await supabase
    .from("order_tracking_rate_limits")
    .select("count")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .eq("action", action)
    .eq("window_start", windowStart.toISOString())
    .single();
  
  if (existing) {
    // Increment count
    await supabase
      .from("order_tracking_rate_limits")
      .update({
        count: (existing.count as number) + 1,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("identifier", identifier)
      .eq("identifier_type", identifierType)
      .eq("action", action)
      .eq("window_start", windowStart.toISOString());
  } else {
    // Insert new record
    await supabase.from("order_tracking_rate_limits").insert({
      identifier,
      identifier_type: identifierType,
      action,
      count: 1,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as never);
  }
}

/**
 * Generate tracking token
 */
async function generateTrackingToken(params: {
  order_id: string;
  ip_address?: string;
  supabase: ReturnType<typeof createServiceRoleClient>;
}): Promise<string> {
  const { order_id, ip_address, supabase } = params;
  
  // Generate secure random token (32 bytes = 64 hex characters)
  const token = randomBytes(32).toString("hex");
  
  // Set expiration (24 hours)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  // Store token
  await supabase.from("order_tracking_tokens").insert({
    order_id,
    token,
    expires_at: expiresAt.toISOString(),
    used: false,
    ip_address: ip_address || null,
  } as unknown as never);
  
  return token;
}

