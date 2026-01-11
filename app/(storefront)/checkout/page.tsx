"use client";

/**
 * DEPRECATED: This checkout page is no longer used.
 * Checkout now happens inline in the CartDrawer component.
 * This page redirects to cart page where users can access checkout via the drawer.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartItems, openCart } = useCartStore();

  // Redirect to cart and open drawer
  useEffect(() => {
    if (cartItems.length > 0) {
      router.push("/cart");
      // Small delay to ensure navigation completes before opening drawer
      setTimeout(() => {
        openCart();
      }, 100);
    } else {
      router.push("/cart");
    }
  }, [router, cartItems.length, openCart]);

  // Show loading state during redirect
  return (
    <div className="min-h-screen bg-offwhite flex items-center justify-center">
      <div className="text-center">
        <p className="text-silver-dark">Redirecting to checkout...</p>
      </div>
    </div>
  );
}
