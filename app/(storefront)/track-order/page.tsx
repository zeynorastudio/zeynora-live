"use client";

/**
 * Phase 4.1 — Order Tracking Entry Page
 * Allows users to enter order ID and phone number to request OTP
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }
    return digits.slice(-10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!orderId.trim()) {
      setError("Order ID is required");
      setLoading(false);
      return;
    }

    if (!mobile.trim()) {
      setError("Mobile number is required");
      setLoading(false);
      return;
    }

    const normalizedMobile = normalizePhone(mobile);
    if (!/^\d{10}$/.test(normalizedMobile)) {
      setError("Please enter a valid 10-digit mobile number");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/orders/track/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId.trim(),
          mobile: normalizedMobile,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to send OTP. Please try again.");
        setLoading(false);
        return;
      }

      // Success - redirect to verification page
      setSuccess(true);
      setTimeout(() => {
        router.push(`/track-order/verify?order_id=${encodeURIComponent(orderId.trim())}&mobile=${encodeURIComponent(normalizedMobile)}`);
      }, 1000);
    } catch (err: any) {
      console.error("[TRACK_ORDER] Error:", err);
      setError("Unable to process request. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-silver-dark hover:text-night transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
            Track Your Order
          </h1>
          <p className="text-silver-dark text-sm md:text-base">
            Enter your order ID and mobile number to receive an OTP
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6 md:p-8" shadowVariant="warm-sm">
          {success ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Package className="w-12 h-12 text-gold" />
              </div>
              <h2 className="serif-display text-xl text-night mb-2">
                OTP Sent!
              </h2>
              <p className="text-silver-dark text-sm">
                Redirecting to verification page...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order ID */}
              <div>
                <label
                  htmlFor="order_id"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="order_id"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g., ZYN-20250130-1234"
                  className="w-full px-4 py-2.5 border border-silver-light rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-silver-dark">
                  You can find your Order ID in your order confirmation email or SMS
                </p>
              </div>

              {/* Mobile Number */}
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium text-night mb-2"
                >
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-silver-light bg-offwhite text-silver-dark text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-silver-dark">
                  Enter the mobile number used during checkout
                </p>
              </div>

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
                disabled={loading}
                className="w-full"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>

              {/* Info */}
              <div className="pt-4 border-t border-silver-light">
                <p className="text-xs text-silver-dark text-center">
                  By continuing, you agree to receive an OTP on your mobile number
                </p>
              </div>
            </form>
          )}
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-silver-dark">
            Need help?{" "}
            <Link href="/support/shipping" className="text-gold hover:text-gold-darker">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}










