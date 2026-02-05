"use client";

/**
 * CheckoutAuthModal Component
 * 
 * Inline authentication modal for checkout flow.
 * Supports:
 * - OTP verification for returning customers
 * - Quick signup for new customers
 * - Guest checkout without authentication
 * 
 * State transitions:
 *   idle → otp_sent → otp_verified → customer_resolved
 *   OR
 *   idle → guest (via "Continue as Guest" button)
 */

import { useState, useCallback } from "react";
import { X, ArrowLeft, Check, ShoppingBag, User } from "lucide-react";
import type { CheckoutCustomer, GuestSession } from "@/types/checkout-auth";

type AuthStep = "choose" | "email" | "otp" | "signup" | "welcome" | "guest_form";

interface CheckoutAuthModalProps {
  open: boolean;
  onClose: () => void;
  onCustomerResolved: (customer: CheckoutCustomer | null, guestSession: GuestSession | null) => void;
  initialEmail?: string;
}

// Generate a unique guest session ID
function generateGuestSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `guest_${timestamp}_${randomPart}`;
}

export default function CheckoutAuthModal({
  open,
  onClose,
  onCustomerResolved,
  initialEmail = "",
}: CheckoutAuthModalProps) {
  // Form state
  const [step, setStep] = useState<AuthStep>("choose");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Guest form state
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  
  // Customer state
  const [customer, setCustomer] = useState<CheckoutCustomer | null>(null);
  
  // Loading/Error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const normalizeEmail = (emailInput: string): string => {
    return emailInput.trim().toLowerCase();
  };

  /**
   * Normalize phone number to E.164 format (+91XXXXXXXXXX)
   * Takes 10-digit input and prepends +91
   * Returns null if input is empty/invalid
   */
  const normalizePhoneToE164 = (phoneInput: string): string | null => {
    if (!phoneInput || !phoneInput.trim()) {
      return null;
    }
    // Remove all non-digits
    const digits = phoneInput.replace(/\D/g, "");
    // Must be exactly 10 digits
    if (digits.length !== 10) {
      return null;
    }
    return `+91${digits}`;
  };

  const maskEmail = (emailInput: string): string => {
    const parts = emailInput.split("@");
    if (parts.length !== 2) return emailInput;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return emailInput;
    return `${name[0]}${"*".repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}@${domain}`;
  };

  /**
   * Send OTP to email
   */
  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);

    const normalizedEmail = normalizeEmail(email);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/customer/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to send OTP");
        setLoading(false);
        return;
      }

      setEmail(normalizedEmail);
      setStep("otp");
    } catch (err: unknown) {
      setError("Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify OTP and check customer status
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!otp || !/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/customer/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email), otp }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      if (data.customer_exists && data.customer) {
        // Returning customer
        setCustomer(data.customer);
        setStep("welcome");
        
        // Complete login
        await completeLogin(data.customer_id, data.customer);
      } else {
        // New customer
        setStep("signup");
      }
    } catch (err: unknown) {
      setError("Unable to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete signup for new customer
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }

    try {
      // Normalize phone to E.164 format (+91XXXXXXXXXX) before sending to API
      const normalizedPhone = normalizePhoneToE164(phone);
      
      const response = await fetch("/api/auth/customer/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(email),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: normalizedPhone,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      setCustomer(data.customer);
      setStep("welcome");
      
      // Short delay then complete
      setTimeout(() => {
        onCustomerResolved(data.customer, null);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError("Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete login for returning customer
   */
  const completeLogin = async (customerIdParam: string, customerData: CheckoutCustomer) => {
    try {
      await fetch("/api/auth/customer/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizeEmail(email),
          customer_id: customerIdParam,
        }),
      });
    } catch (err) {
      // Continue even if session creation fails
    }

    // Short delay then complete
    setTimeout(() => {
      onCustomerResolved(customerData, null);
      onClose();
    }, 1500);
  };

  /**
   * Continue as guest
   */
  const handleGuestCheckout = () => {
    setStep("guest_form");
    setError(null);
  };

  /**
   * Submit guest checkout
   */
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize phone to E.164 format (+91XXXXXXXXXX) before storing in session
    const normalizedGuestPhone = normalizePhoneToE164(guestPhone);
    
    // Create guest session
    const guestSession: GuestSession = {
      guest_session_id: generateGuestSessionId(),
      email: guestEmail.trim().toLowerCase() || null,
      phone: normalizedGuestPhone,
      created_at: new Date().toISOString(),
    };
    
    onCustomerResolved(null, guestSession);
    onClose();
  };

  /**
   * Reset form state
   */
  const resetForm = () => {
    setStep("choose");
    setOtp("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setGuestEmail("");
    setGuestPhone("");
    setError(null);
    setCustomer(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* CHOOSE STEP - Initial choice between sign in and guest */}
        {step === "choose" && (
          <>
            <div className="mb-6 text-center">
              <h2 className="serif-display text-2xl text-night mb-2">
                Checkout
              </h2>
              <p className="text-sm text-gray-600">
                Choose how you'd like to continue
              </p>
            </div>

            <div className="space-y-4">
              {/* Sign In Option */}
              <button
                onClick={() => setStep("email")}
                className="w-full flex items-center gap-4 p-4 border-2 border-gold rounded-lg hover:bg-gold/5 transition-colors"
              >
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gold" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-night">Sign In / Sign Up</p>
                  <p className="text-sm text-gray-500">
                    Access saved addresses & order history
                  </p>
                </div>
              </button>

              {/* Guest Checkout Option */}
              <button
                onClick={handleGuestCheckout}
                className="w-full flex items-center gap-4 p-4 border border-silver-light rounded-lg hover:bg-offwhite transition-colors"
              >
                <div className="w-12 h-12 bg-silver-light/50 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-silver-dark" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-night">Continue as Guest</p>
                  <p className="text-sm text-gray-500">
                    Quick checkout without account
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* EMAIL STEP */}
        {step === "email" && (
          <>
            <div className="mb-6">
              <button
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-silver-dark hover:text-night transition-colors text-sm mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h2 className="serif-display text-2xl text-night mb-2">
                Enter Your Email
              </h2>
              <p className="text-sm text-gray-600">
                We'll send you a verification code
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !loading && handleSendOtp()}
                  required
                  className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
                className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          </>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <>
            <div className="mb-6">
              <button
                onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                className="inline-flex items-center gap-1 text-silver-dark hover:text-night transition-colors text-sm mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Change email
              </button>
              <h2 className="serif-display text-2xl text-night mb-2">
                Enter OTP
              </h2>
              <p className="text-sm text-gray-600">
                Code sent to <span className="font-medium">{maskEmail(email)}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  required
                  className="w-full px-4 py-4 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all text-center text-3xl tracking-[0.5em]"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                className="w-full text-sm text-gold hover:text-gold-dark font-medium"
                disabled={loading}
              >
                Resend OTP
              </button>
            </form>
          </>
        )}

        {/* SIGNUP STEP */}
        {step === "signup" && (
          <>
            <div className="mb-6">
              <h2 className="serif-display text-2xl text-night mb-2">
                Complete Your Profile
              </h2>
              <p className="text-sm text-gray-600">
                Quick setup to create your account
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="first_name"
                    className="block text-sm font-medium text-night mb-2"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="John"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    htmlFor="last_name"
                    className="block text-sm font-medium text-night mb-2"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Phone <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-silver-light bg-offwhite text-silver-dark text-sm">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(value);
                    }}
                    className="flex-1 px-4 py-3 border border-silver-light rounded-r-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !firstName.trim() || !lastName.trim()}
                className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating Account..." : "Create Account & Continue"}
              </button>
            </form>
          </>
        )}

        {/* WELCOME STEP */}
        {step === "welcome" && customer && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="serif-display text-2xl text-night mb-2">
              Welcome back, {customer.first_name}!
            </h2>
            <p className="text-sm text-gray-600">
              Continuing to checkout...
            </p>
          </div>
        )}

        {/* GUEST FORM STEP */}
        {step === "guest_form" && (
          <>
            <div className="mb-6">
              <button
                onClick={() => setStep("choose")}
                className="inline-flex items-center gap-1 text-silver-dark hover:text-night transition-colors text-sm mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h2 className="serif-display text-2xl text-night mb-2">
                Guest Checkout
              </h2>
              <p className="text-sm text-gray-600">
                Enter your contact details for order updates
              </p>
            </div>

            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="guest_email"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Email <span className="text-gray-500 text-xs">(for order confirmation)</span>
                </label>
                <input
                  id="guest_email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="guest_phone"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Phone <span className="text-gray-500 text-xs">(for delivery updates)</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-silver-light bg-offwhite text-silver-dark text-sm">
                    +91
                  </span>
                  <input
                    id="guest_phone"
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setGuestPhone(value);
                    }}
                    className="flex-1 px-4 py-3 border border-silver-light rounded-r-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Continue as Guest
              </button>

              <p className="text-center text-xs text-gray-500">
                You can create an account later to track your orders
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
