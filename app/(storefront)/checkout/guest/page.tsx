"use client";

/**
 * Phase 3.1 — Guest Checkout Page
 * 
 * Allows checkout without login:
 * - Collects customer info (name, phone, email optional)
 * - Collects shipping address
 * - Creates order BEFORE payment
 * - Shows FREE shipping to customer
 * 
 * No payment gateway triggered in this phase.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import GuestCheckoutForm from "@/components/checkout/GuestCheckoutForm";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, CheckCircle } from "lucide-react";

export default function GuestCheckoutPage() {
  const router = useRouter();
  const { items: cartItems } = useCartStore();
  const [orderCreated, setOrderCreated] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);

  // Redirect to cart if empty
  useEffect(() => {
    if (cartItems.length === 0 && !orderCreated) {
      router.push("/cart");
    }
  }, [cartItems, orderCreated, router]);

  // Handle successful order creation
  const handleOrderCreated = (orderId: string, orderNumber: string) => {
    setOrderCreated({ orderId, orderNumber });
  };

  // If order was created, show confirmation
  if (orderCreated) {
    return (
      <div className="min-h-screen bg-offwhite">
        {/* Header */}
        <div className="bg-cream border-b border-silver">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="serif-display text-3xl text-night text-center">
              Order Created
            </h1>
          </div>
        </div>

        {/* Success Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white border border-silver-light rounded-xl p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-semibold text-night mb-2">
              Thank You!
            </h2>
            <p className="text-silver-dark mb-6">
              Your order has been created successfully.
            </p>

            <div className="bg-offwhite rounded-lg p-4 mb-6">
              <p className="text-sm text-silver-dark mb-1">Order Number</p>
              <p className="font-mono text-xl text-gold-darker font-semibold">
                {orderCreated.orderNumber}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Payment Processing:</strong> Your payment is being processed.
                You will receive a confirmation once payment is confirmed.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-silver-light rounded-lg text-night hover:bg-offwhite transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                Continue Shopping
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold-darker transition-colors"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Header */}
      <div className="bg-cream border-b border-silver">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 text-silver-dark hover:text-night transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </Link>
          </div>
          <h1 className="serif-display text-3xl text-night">
            Guest Checkout
          </h1>
          <p className="text-silver-dark mt-2">
            Complete your order without creating an account
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Login Option Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Already have an account?{" "}
            <Link href="/login?redirect=/cart" className="font-semibold underline">
              Log in
            </Link>{" "}
            for a faster checkout experience and to track your orders.
          </p>
        </div>

        {/* Free Shipping Banner */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="bg-green-500 text-white rounded-full p-1">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-sm text-green-800 font-medium">
            🎉 Enjoy FREE shipping on this order!
          </p>
        </div>

        {/* Cart Items Preview */}
        <div className="bg-white border border-silver-light rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-night mb-4">
            Your Items ({cartItems.length})
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.sku} className="flex items-center gap-4 py-2 border-b border-silver-light last:border-0">
                {item.image && (
                  <div className="w-16 h-16 bg-offwhite rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-night truncate">{item.name}</p>
                  <p className="text-xs text-silver-dark">
                    Size: {item.size} | Qty: {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-night whitespace-nowrap">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Form */}
        <GuestCheckoutForm 
          onOrderCreated={handleOrderCreated}
          onError={(error) => console.error("Checkout error:", error)}
        />
      </div>
    </div>
  );
}

