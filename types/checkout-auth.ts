/**
 * Checkout Authentication Types
 * 
 * Type definitions for the unified OTP-based customer identity system.
 * This file defines the auth state machine and related types for checkout.
 */

/**
 * Auth flow states for the checkout process
 */
export type CheckoutAuthState =
  | "idle"           // Initial state - no auth attempted
  | "otp_sent"       // OTP has been sent to email
  | "otp_verified"   // OTP verified successfully
  | "customer_resolved"; // Customer identified (returning or new)

/**
 * Customer resolution outcome
 */
export type CustomerResolutionType =
  | "returning_customer" // Existing customer in database
  | "new_customer"       // OTP verified but no customer record
  | "guest";             // Chose to continue as guest

/**
 * Customer profile from the customers table
 * Note: Using first_name as the greeting name per requirements
 */
export interface CheckoutCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Guest session for guest checkout
 */
export interface GuestSession {
  guest_session_id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

/**
 * Result of OTP verification with customer lookup
 */
export interface OtpVerificationResult {
  success: boolean;
  error?: string;
  customer_exists: boolean;
  requires_signup: boolean;
  customer_id: string | null;
  email: string;
  customer?: CheckoutCustomer | null;
}

/**
 * Result of customer creation during checkout
 */
export interface CustomerCreationResult {
  success: boolean;
  error?: string;
  customer?: CheckoutCustomer | null;
}

/**
 * Checkout auth context state
 */
export interface CheckoutAuthContextState {
  // Current auth state
  state: CheckoutAuthState;
  
  // Customer resolution
  resolutionType: CustomerResolutionType | null;
  
  // Customer data (if resolved)
  customer: CheckoutCustomer | null;
  
  // Guest session (if guest checkout)
  guestSession: GuestSession | null;
  
  // Email used for OTP
  email: string | null;
  
  // Loading states
  isLoading: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  isCreatingCustomer: boolean;
  
  // Error state
  error: string | null;
}

/**
 * Checkout auth context actions
 */
export interface CheckoutAuthContextActions {
  // Send OTP to email
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  // Verify OTP and check customer status
  verifyOtp: (email: string, otp: string) => Promise<OtpVerificationResult>;
  
  // Create customer during checkout (for new customers)
  createCustomer: (data: CreateCheckoutCustomerInput) => Promise<CustomerCreationResult>;
  
  // Continue as guest
  continueAsGuest: (email?: string, phone?: string) => void;
  
  // Reset auth state
  reset: () => void;
  
  // Clear error
  clearError: () => void;
}

/**
 * Input for creating a customer during checkout
 */
export interface CreateCheckoutCustomerInput {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
}

/**
 * Full checkout auth context
 */
export interface CheckoutAuthContext extends CheckoutAuthContextState, CheckoutAuthContextActions {}

/**
 * Props for the checkout auth modal
 */
export interface CheckoutAuthModalProps {
  open: boolean;
  onClose: () => void;
  onCustomerResolved: (customer: CheckoutCustomer | null, guestSession: GuestSession | null) => void;
  initialEmail?: string;
}

/**
 * Checkout session data (for order creation)
 */
export interface CheckoutSession {
  // Customer or guest identifier
  customer_id: string | null;
  guest_session_id: string | null;
  
  // Contact info
  email: string | null;
  phone: string | null;
  name: string | null;
  
  // Source of identification
  source: "otp_verified" | "guest" | "logged_in";
}
