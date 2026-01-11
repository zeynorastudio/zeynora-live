"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/Drawer";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { useCartStore } from "@/lib/store/cart";
import GuestCheckoutForm from "@/components/checkout/GuestCheckoutForm";
import { useRouter } from "next/navigation";

export interface CartDrawerProps {
  open?: boolean;
  onClose?: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, isOpen, updateQty, removeItem, closeCart, openCart } = useCartStore();
  // Use cart store's isOpen state, only override if open prop is explicitly provided
  const drawerOpen = open !== undefined ? open : isOpen;
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  
  // Track previous cart count to detect increases
  const prevItemCountRef = useRef<number>(0);
  const prevItemsLengthRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  // Checkout view state
  const [showCheckout, setShowCheckout] = useState(false);

  // Calculate total items from items array directly
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Reactive effect: Auto-open drawer when cart count increases
  useEffect(() => {
    // Skip on initial mount (don't auto-open on page refresh)
    if (isInitialMountRef.current) {
      prevItemCountRef.current = totalItems;
      prevItemsLengthRef.current = items.length;
      isInitialMountRef.current = false;
      return;
    }

    // If cart count increased OR new item added, open the drawer
    const countIncreased = totalItems > prevItemCountRef.current;
    const newItemAdded = items.length > prevItemsLengthRef.current;
    
    if (countIncreased || newItemAdded) {
      openCart();
    }

    // Update previous values for next comparison
    prevItemCountRef.current = totalItems;
    prevItemsLengthRef.current = items.length;
  }, [totalItems, items.length, openCart]);

  // Reset checkout view when drawer closes
  useEffect(() => {
    if (!drawerOpen) {
      setShowCheckout(false);
    }
  }, [drawerOpen]);

  const handleClose = () => {
    closeCart();
    setShowCheckout(false);
    onClose?.();
  };

  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    setShowCheckout(true);
  };

  const handleOrderCreated = (orderId: string, orderNumber: string) => {
    // Close drawer and redirect to success page
    handleClose();
    router.push(`/checkout/success?order=${orderNumber}`);
  };

  return (
    <Drawer direction="right" open={drawerOpen} onOpenChange={(val) => !val && handleClose()}>
      <DrawerContent className="h-full w-full sm:max-w-md ml-auto rounded-none border-l border-white/10 bg-white flex flex-col p-0">
        <div className="p-4 border-b border-silver-light flex items-center justify-between bg-[#F8F1EA]">
          {showCheckout ? (
            <>
              <button
                onClick={() => setShowCheckout(false)}
                className="inline-flex items-center gap-1 text-silver-dark hover:text-night transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cart
              </button>
              <h2 className="serif-display text-lg text-night">Checkout</h2>
              <div className="w-16" /> {/* Spacer for centering */}
            </>
          ) : (
            <>
              <h2 className="serif-display text-lg text-night">
                Shopping Bag ({items.reduce((sum, item) => sum + item.quantity, 0)})
              </h2>
              <DrawerClose asChild>
                <button className="p-2 hover:bg-white rounded-full transition-colors" aria-label="Close cart">
                  <X className="w-5 h-5 text-silver-darker" />
                </button>
              </DrawerClose>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {showCheckout ? (
            <GuestCheckoutForm 
              onOrderCreated={handleOrderCreated}
              onError={(error) => console.error("Checkout error:", error)}
            />
          ) : items.length === 0 ? (
            <p className="text-sm text-center text-silver-dark py-12">Your cart is empty.</p>
          ) : (
            items.map((item) => (
              <CartItem
                key={item.sku}
                item={item}
                onIncrement={() => updateQty(item.sku, item.quantity + 1)}
                onDecrement={() => updateQty(item.sku, item.quantity - 1)}
                onRemove={() => removeItem(item.sku)}
              />
            ))
          )}
        </div>

        {!showCheckout && (
          <div className="p-6 bg-offwhite/30 border-t border-silver-light space-y-4">
            <CartSummary subtotal={subtotal} />
            <div className="pt-2">
              <button
                onClick={handleCheckoutClick}
                disabled={items.length === 0}
                className="w-full block text-center bg-gold text-night font-medium py-3 rounded hover:bg-gold/90 transition-colors disabled:bg-silver disabled:cursor-not-allowed"
              >
                Checkout &rarr;
              </button>
              <p className="text-center text-xs text-silver-dark mt-3">
                Shipping & taxes calculated at checkout.
              </p>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
