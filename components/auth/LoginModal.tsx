"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/(storefront)/login/actions";
import { signupAction } from "@/app/(storefront)/signup/actions";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  redirectAfterLogin?: string;
}

export default function LoginModal({
  open,
  onClose,
  redirectAfterLogin,
}: LoginModalProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  if (!open) return null;

  const normalizeMobile = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }
    return digits.slice(-10);
  };

  const handleSendOtp = async () => {
    setError(null);
    setLoading(true);

    const normalized = normalizeMobile(mobile);
    if (!normalized || normalized.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/customer/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalized }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to send OTP");
        setLoading(false);
        return;
      }

      setOtpSent(true);
      setStep("otp");
      setLoading(false);
    } catch (err: unknown) {
      setError("Unable to send OTP. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalized = normalizeMobile(mobile);
    
    if (!otp || !/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    if (isSignup && (!firstName.trim() || !lastName.trim())) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }

    try {
      // Verify OTP
      const verifyResponse = await fetch("/api/auth/customer/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalized, otp }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        setError(verifyData.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      // OTP verified - proceed with login/signup
      if (isSignup) {
        // Signup flow
        const formData = new FormData();
        formData.append("mobile", normalized);
        formData.append("first_name", firstName.trim());
        formData.append("last_name", lastName.trim());
        if (email.trim()) {
          formData.append("email", email.trim());
        }
        formData.append("otp", otp);

        const result = await signupAction(formData);

        if (result.success) {
          onClose();
          if (redirectAfterLogin) {
            router.push(redirectAfterLogin);
          } else {
            router.push("/account");
          }
          router.refresh();
        } else {
          setError(result.error || "Failed to create account");
          setLoading(false);
        }
      } else {
        // Login flow
        const formData = new FormData();
        formData.append("mobile", normalized);
        formData.append("otp", otp);

        const result = await loginAction(formData);

        if (result.success) {
          onClose();
          setMobile("");
          setOtp("");
          if (redirectAfterLogin) {
            router.push(redirectAfterLogin);
          } else {
            router.refresh();
          }
        } else {
          setError(result.error || "Failed to sign in");
          setLoading(false);
        }
      }
    } catch (err: unknown) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("mobile");
    setOtp("");
    setOtpSent(false);
    setError(null);
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

        {/* Header */}
        <div className="mb-6">
          <h2 className="serif-display text-2xl text-night mb-2">
            {isSignup ? "Create Account" : "Sign In"}
          </h2>
          <p className="text-sm text-gray-600">
            {step === "mobile"
              ? isSignup
                ? "Enter your mobile number to get started"
                : "Enter your mobile number to sign in"
              : "Enter the OTP sent to your mobile"}
          </p>
        </div>

        {/* Mobile Step */}
        {step === "mobile" && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="mobile"
                className="block text-sm font-medium text-night mb-2"
              >
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                placeholder="+919876543210"
                autoComplete="tel"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: +91 followed by 10 digits
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            {/* Toggle signup/signin */}
            <div className="text-center text-sm text-gray-600">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(false);
                      setError(null);
                      handleReset();
                    }}
                    className="text-gold hover:text-gold-dark font-medium"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(true);
                      setError(null);
                      handleReset();
                    }}
                    className="text-gold hover:text-gold-dark font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {isSignup && (
              <>
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
                    htmlFor="email"
                    className="block text-sm font-medium text-night mb-2"
                  >
                    Email <span className="text-gray-500 text-xs">(Optional)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    placeholder="your@email.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-night mb-2"
              >
                OTP <span className="text-red-500">*</span>
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(value);
                }}
                required
                className="w-full px-4 py-3 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit OTP sent to +91 {normalizeMobile(mobile).substring(0, 3)}****{normalizeMobile(mobile).substring(7)}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isSignup
                  ? "Creating Account..."
                  : "Signing In..."
                : isSignup
                ? "Create Account"
                : "Sign In"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-gold hover:text-gold-dark font-medium"
                disabled={loading}
              >
                Change Mobile Number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}























