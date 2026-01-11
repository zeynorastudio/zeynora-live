/**
 * Cart Page - Phase 2
 * 
 * Displays cart with SKU-level granularity.
 * Each variant (size/color combination) is a separate line item.
 */

import React from "react";
import CartPageClient from "@/components/cart/CartPageClient";

export const metadata = {
  title: "Shopping Cart | Zeynora",
  description: "Review your cart and proceed to checkout",
};

export default function CartPage() {
  return <CartPageClient />;
}
