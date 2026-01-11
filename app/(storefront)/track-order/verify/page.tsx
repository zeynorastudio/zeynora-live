"use client";

/**
 * Phase 4.1 — OTP Verification Page
 * Verifies OTP and redirects to tracking view
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, AlertCircle, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const mobile = searchParams.get("mobile") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Redirect if order_id or mobile missing
    if (!orderId || !mobile) {
      router.push("/track-order");
    }
  }, [orderId, mobile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/orders/track/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          mobile: mobile,
          otp: otp,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Invalid OTP");
        setAttemptsRemaining(data.attempts_remaining ?? null);
        setLockedUntil(data.locked_until ?? null);
        setLoading(false);
        return;
      }

      // Success - redirect to tracking view
      setSuccess(true);
      if (data.token) {
        setTimeout(() => {
          router.push(`/track-order/${data.token}`);
        }, 1000);
      } else {
        setError("Token not received. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("[VERIFY_OTP] Error:", err);
      setError("Unable to verify OTP. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/orders/track/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          mobile: mobile,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to resend OTP. Please try again.");
        setLoading(false);
        return;
      }

      setError(null);
      setOtp("");
      alert("OTP has been resent to your mobile number");
      setLoading(false);
    } catch (err: any) {
      console.error("[RESEND_OTP] Error:", err);
      setError("Unable to resend OTP. Please try again.");
      setLoading(false);
    }
  };

  // Check if locked
  const isLocked = lockedUntil && new Date(lockedUntil) > new Date();

  if (!orderId || !mobile) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/track-order"
            className="inline-flex items-center gap-2 text-silver-dark hover:text-night transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
            Verify OTP
          </h1>
          <p className="text-silver-dark text-sm md:text-base">
            Enter the 6-digit OTP sent to +91 {mobile.substring(0, 3)}****{mobile.substring(7)}
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 md:p-8" shadowVariant="warm-sm">
          {success ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="serif-display text-xl text-night mb-2">
                Verified!
              </h2>
              <p className="text-silver-dark text-sm">
                Redirecting to order tracking...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Enter OTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2.5 border border-silver-light rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors text-center text-2xl tracking-widest font-mono"
                  disabled={loading || isLocked}
                  required
                />
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="mt-2 text-xs text-silver-dark">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                  </p>
                )}
              </div>

              {/* Locked Message */}
              {isLocked && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Too many attempts. Please try again after{" "}
                    {new Date(lockedUntil!).toLocaleTimeString()}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || isLocked}
                className="w-full"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              {/* Resend OTP */}
              <div className="pt-4 border-t border-silver-light">
                <p className="text-xs text-silver-dark text-center mb-3">
                  Didn't receive the OTP?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={loading || isLocked}
                  className="w-full"
                >
                  Resend OTP
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Security Info */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-silver-dark">
            <Shield className="w-4 h-4" />
            <span>Your OTP is valid for 5 minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
}










