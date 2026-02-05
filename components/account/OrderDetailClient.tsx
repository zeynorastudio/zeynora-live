"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

// Razorpay SDK is loaded globally in app/layout.tsx with beforeInteractive strategy
// This ensures it's available before any client components hydrate

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: Record<string, unknown>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OrderDetailClientProps {
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

export default function OrderDetailClient({
  orderId,
  razorpayOrderId,
  amount,
  currency,
}: OrderDetailClientProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetryPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call retry API (it finds the most recent pending order, but we can verify it matches)
      const retryResponse = await fetch("/api/payments/retry", {
        method: "GET",
      });

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json();
        throw new Error(errorData.error || "Failed to retry payment");
      }

      const retryData = await retryResponse.json();

      if (!retryData.success || !retryData.razorpay_order_id) {
        throw new Error("Invalid retry response");
      }

      // Verify the retry order matches the current order
      if (retryData.order_id !== orderId) {
        throw new Error("Order mismatch - please refresh the page");
      }

      // Check Razorpay SDK (loaded globally in app/layout.tsx)
      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Payment gateway failed to load. Please refresh the page.");
      }

      // Initialize Razorpay checkout
      const options: RazorpayOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: retryData.amount,
        currency: retryData.currency || "INR",
        name: "ZEYNORA",
        description: `Order ${retryData.order_number}`,
        order_id: retryData.razorpay_order_id,
        handler: async function (response: RazorpayPaymentResponse) {
          // Verify payment
          const verifyResponse = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (verifyResponse.ok) {
            // Reload page to show updated status
            window.location.reload();
          } else {
            setError("Payment verification failed");
            setLoading(false);
          }
        },
        prefill: {
          // Can be populated from user session if available
        },
        theme: {
          color: "#D4AF37", // ZEYNORA gold
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initiate payment";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <Button
        onClick={handleRetryPayment}
        disabled={loading}
        className="w-full"
        variant="outline"
      >
        {loading ? "Loading..." : "Resume Payment"}
      </Button>
      {error && (
        <p className="text-xs text-vine mt-2">{error}</p>
      )}
    </div>
  );
}

