"use client";

/**
 * CartPageClient - Phase 2 Implementation
 * 
 * Renders each SKU independently as a cart line item.
 * Displays: Product Name, SKU, Size, Price, Quantity Controls, Remove
 * Totals update instantly on any change.
 */

import React, { useState } from "react";
import { useCartStore } from "@/lib/store/cart";
import { CartItem } from "@/components/cart/CartItem";
import CartEmptyState from "@/components/cart/CartEmptyState";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToastWithCompat } from "@/components/ui/use-toast";

export default function CartPageClient() {
  const { items, updateQty, removeItem, getTotalItems, getTotalPrice, openCart } = useCartStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { addToast } = useToastWithCompat();
  const router = useRouter();

  // If cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <CartEmptyState onContinueShopping={() => router.push("/shop")} />
      </div>
    );
  }

  const handleIncrement = (sku: string, currentQty: number) => {
    updateQty(sku, currentQty + 1);
  };

  const handleDecrement = (sku: string, currentQty: number) => {
    if (currentQty <= 1) return;
    updateQty(sku, currentQty - 1);
  };

  const handleRemove = (sku: string) => {
    removeItem(sku);
  };

  const subtotal = getTotalPrice();
  const totalItems = getTotalItems();

  return (
    <div className="min-h-screen bg-white pt-12 pb-24">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="serif-display display-md text-night text-center mb-2">
            Your Shopping Bag
          </h1>
          <p className="text-center text-silver-dark">
            {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="flex-1 space-y-4">
            {items.map((item) => (
              <div
                key={item.sku}
                className="bg-cream/30 p-6 rounded-lg border border-silver-light hover:border-gold/30 transition-colors"
              >
                {/* Product Name */}
                <h3 className="font-medium text-night mb-1">{item.name}</h3>
                
                {/* SKU & Size */}
                <div className="text-xs text-silver-dark mb-4 space-y-0.5">
                  <div>SKU: <span className="font-mono">{item.sku}</span></div>
                  <div>Size: {item.size}</div>
                </div>

                {/* Cart Item Component */}
                <CartItem
                  item={item}
                  onIncrement={() => handleIncrement(item.sku, item.quantity)}
                  onDecrement={() => handleDecrement(item.sku, item.quantity)}
                  onRemove={() => handleRemove(item.sku)}
                />
              </div>
            ))}
          </div>

          {/* Summary Sidebar */}
          <div className="w-full lg:w-96">
            <div className="bg-cream/50 p-6 rounded-lg border border-silver-light sticky top-24">
              <h3 className="serif-display text-xl mb-6 text-night">Order Summary</h3>

              {/* Subtotal breakdown */}
              <div className="space-y-3 mb-6 pb-6 border-b border-silver-light">
                <div className="flex justify-between text-sm">
                  <span className="text-silver-dark">Subtotal ({totalItems} items)</span>
                  <span className="text-night font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-silver-dark">Shipping</span>
                  <span className="text-green-600 text-xs font-medium">FREE</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between text-lg font-medium mb-6">
                <span className="text-night">Total</span>
                <span className="text-night">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={() => openCart()}
                className="w-full bg-gold text-night hover:bg-gold/90 font-medium py-3 mb-4"
              >
                Proceed to Checkout
              </Button>

              {/* Continue Shopping */}
              <Link href="/shop">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>

              {/* Security Info */}
              <div className="mt-6 pt-6 border-t border-silver-light">
                <p className="text-center text-xs text-silver-dark">
                  🔒 Secure Checkout
                </p>
                <p className="text-center text-xs text-silver-dark mt-1">
                  Free Shipping on Prepaid Orders
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

