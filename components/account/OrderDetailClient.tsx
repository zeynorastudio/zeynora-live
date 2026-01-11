"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
// Load Razorpay SDK dynamically
async function loadRazorpay(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay can only be loaded in browser"));
      return;
    }

    if ((window as any).Razorpay) {
      resolve((window as any).Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      resolve((window as any).Razorpay);
    };
    script.onerror = () => {
      reject(new Error("Failed to load Razorpay SDK"));
    };
    document.body.appendChild(script);
  });
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

      // Load Razorpay SDK
      const Razorpay = await loadRazorpay();

      if (!Razorpay) {
        throw new Error("Failed to load Razorpay SDK");
      }

      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: retryData.amount,
        currency: retryData.currency || "INR",
        name: "ZEYNORA",
        description: `Order ${retryData.order_number}`,
        order_id: retryData.razorpay_order_id,
        handler: async function (response: any) {
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

      const razorpay = new Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment");
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

