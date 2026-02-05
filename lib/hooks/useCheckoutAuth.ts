"use client";

/**
 * useCheckoutAuth Hook
 * 
 * Unified OTP-based customer identity hook for checkout.
 * Manages the auth state machine:
 *   idle → otp_sent → otp_verified → customer_resolved
 * 
 * Supports:
 * - Returning customers (existing in customers table)
 * - New customers (OTP verified, no customer record)
 * - Guest checkout (no OTP, temporary session)
 */

import { useState, useCallback, useMemo } from "react";
import type {
  CheckoutAuthState,
  CustomerResolutionType,
  CheckoutCustomer,
  GuestSession,
  CheckoutAuthContextState,
  CheckoutAuthContextActions,
  OtpVerificationResult,
  CustomerCreationResult,
  CreateCheckoutCustomerInput,
} from "@/types/checkout-auth";

// Generate a unique guest session ID
function generateGuestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `guest_${timestamp}_${randomPart}`;
}

/**
 * Checkout authentication hook
 */
export function useCheckoutAuth(): CheckoutAuthContextState & CheckoutAuthContextActions {
  // State
  const [authState, setAuthState] = useState<CheckoutAuthState>("idle");
  const [resolutionType, setResolutionType] = useState<CustomerResolutionType | null>(null);
  const [customer, setCustomer] = useState<CheckoutCustomer | null>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Loading states
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  const isLoading = isSendingOtp || isVerifyingOtp || isCreatingCustomer;

  /**
   * Send OTP to email
   */
  const sendOtp = useCallback(async (
    targetEmail: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsSendingOtp(true);
    setError(null);
    
    try {
      const normalizedEmail = targetEmail.trim().toLowerCase();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        const errorMsg = "Please enter a valid email address";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const response = await fetch("/api/auth/customer/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        const errorMsg = data.error || "Failed to send OTP";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      setEmail(normalizedEmail);
      setAuthState("otp_sent");
      return { success: true };
    } catch (err) {
      const errorMsg = "Unable to send OTP. Please try again.";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSendingOtp(false);
    }
  }, []);

  /**
   * Verify OTP and check customer status
   */
  const verifyOtp = useCallback(async (
    targetEmail: string,
    otp: string
  ): Promise<OtpVerificationResult> => {
    setIsVerifyingOtp(true);
    setError(null);
    
    try {
      const normalizedEmail = targetEmail.trim().toLowerCase();
      
      // Validate OTP format
      if (!/^\d{6}$/.test(otp)) {
        const errorMsg = "Please enter a valid 6-digit OTP";
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          customer_exists: false,
          requires_signup: false,
          customer_id: null,
          email: normalizedEmail,
        };
      }
      
      const response = await fetch("/api/auth/customer/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        const errorMsg = data.error || "Invalid OTP";
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          customer_exists: false,
          requires_signup: false,
          customer_id: null,
          email: normalizedEmail,
        };
      }
      
      // OTP verified - update state
      setAuthState("otp_verified");
      setEmail(normalizedEmail);
      
      // Check customer status
      if (data.customer_exists && data.customer) {
        // Returning customer - set customer and resolve
        const customerData: CheckoutCustomer = data.customer;
        setCustomer(customerData);
        setResolutionType("returning_customer");
        setAuthState("customer_resolved");
        
        return {
          success: true,
          customer_exists: true,
          requires_signup: false,
          customer_id: data.customer_id,
          email: normalizedEmail,
          customer: customerData,
        };
      } else {
        // New customer - needs signup
        return {
          success: true,
          customer_exists: false,
          requires_signup: true,
          customer_id: null,
          email: normalizedEmail,
          customer: null,
        };
      }
    } catch (err) {
      const errorMsg = "Unable to verify OTP. Please try again.";
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
        customer_exists: false,
        requires_signup: false,
        customer_id: null,
        email: targetEmail.trim().toLowerCase(),
      };
    } finally {
      setIsVerifyingOtp(false);
    }
  }, []);

  /**
   * Create customer during checkout (for new customers after OTP verification)
   */
  const createCustomer = useCallback(async (
    data: CreateCheckoutCustomerInput
  ): Promise<CustomerCreationResult> => {
    setIsCreatingCustomer(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!data.email || !data.first_name || !data.last_name) {
        const errorMsg = "Email, first name, and last name are required";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      const response = await fetch("/api/auth/customer/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          phone: data.phone?.trim() || null,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        const errorMsg = result.error || "Failed to create account";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
      
      // Customer created - update state
      const customerData: CheckoutCustomer = result.customer;
      setCustomer(customerData);
      setResolutionType("new_customer");
      setAuthState("customer_resolved");
      
      return { success: true, customer: customerData };
    } catch (err) {
      const errorMsg = "Unable to create account. Please try again.";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsCreatingCustomer(false);
    }
  }, []);

  /**
   * Continue as guest (no OTP)
   */
  const continueAsGuest = useCallback((
    guestEmail?: string,
    guestPhone?: string
  ) => {
    const session: GuestSession = {
      guest_session_id: generateGuestSessionId(),
      email: guestEmail?.trim().toLowerCase() || null,
      phone: guestPhone?.trim() || null,
      created_at: new Date().toISOString(),
    };
    
    setGuestSession(session);
    setResolutionType("guest");
    setAuthState("customer_resolved");
    setCustomer(null);
    setEmail(guestEmail?.trim().toLowerCase() || null);
    setError(null);
  }, []);

  /**
   * Reset auth state
   */
  const reset = useCallback(() => {
    setAuthState("idle");
    setResolutionType(null);
    setCustomer(null);
    setGuestSession(null);
    setEmail(null);
    setError(null);
    setIsSendingOtp(false);
    setIsVerifyingOtp(false);
    setIsCreatingCustomer(false);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Return combined state and actions
  return useMemo(() => ({
    // State
    state: authState,
    resolutionType,
    customer,
    guestSession,
    email,
    isLoading,
    isSendingOtp,
    isVerifyingOtp,
    isCreatingCustomer,
    error,
    
    // Actions
    sendOtp,
    verifyOtp,
    createCustomer,
    continueAsGuest,
    reset,
    clearError,
  }), [
    authState,
    resolutionType,
    customer,
    guestSession,
    email,
    isLoading,
    isSendingOtp,
    isVerifyingOtp,
    isCreatingCustomer,
    error,
    sendOtp,
    verifyOtp,
    createCustomer,
    continueAsGuest,
    reset,
    clearError,
  ]);
}
