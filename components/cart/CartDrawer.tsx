"use client";

/**
 * CartDrawer Component
 * 
 * Shopping cart drawer with integrated checkout authentication flow.
 * Supports:
 * - Cart viewing/editing
 * - Checkout with authentication (OTP-based)
 * - Guest checkout
 * - Customer-linked checkout
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/Drawer";
import { CartItem } from "./CartItem";
import { CartSummary } from "./CartSummary";
import { useCartStore } from "@/lib/store/cart";
import GuestCheckoutForm from "@/components/checkout/GuestCheckoutForm";
import CheckoutAuthModal from "@/components/checkout/CheckoutAuthModal";
import StockValidationModal, { type StockValidationError } from "@/components/checkout/StockValidationModal";
import { useRouter } from "next/navigation";
import type { CheckoutCustomer, GuestSession, CheckoutSession } from "@/types/checkout-auth";

export interface CartDrawerProps {
  open?: boolean;
  onClose?: () => void;
}

type DrawerView = "cart" | "checkout";

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, isOpen, updateQty, removeItem, closeCart, openCart, clearCart } = useCartStore();
  
  // Use cart store's isOpen state, only override if open prop is explicitly provided
  const drawerOpen = open !== undefined ? open : isOpen;
  const subtotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  
  // Track previous cart count to detect increases
  const prevItemCountRef = useRef<number>(0);
  const prevItemsLengthRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  // View state
  const [view, setView] = useState<DrawerView>("cart");
  
  // Authentication state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  
  // Stock validation state (triggered by GuestCheckoutForm on 409 response)
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockErrors, setStockErrors] = useState<StockValidationError[]>([]);

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

  // Reset view when drawer closes
  useEffect(() => {
    if (!drawerOpen) {
      setView("cart");
      setShowAuthModal(false);
    }
  }, [drawerOpen]);

  const handleClose = useCallback(() => {
    closeCart();
    setView("cart");
    setShowAuthModal(false);
    onClose?.();
  }, [closeCart, onClose]);

  /**
   * Handle stock validation errors from GuestCheckoutForm
   * Called when the checkout API returns 409 (stock validation failed)
   */
  const handleStockValidationError = useCallback((errors: StockValidationError[]) => {
    console.log("[FLOW] Stock validation failed - showing error modal");
    setStockErrors(errors);
    setShowStockModal(true);
    setView("cart"); // Return to cart view to allow quantity adjustments
  }, []);

  /**
   * Auto-correct cart quantities based on stock errors
   */
  const handleUpdateCart = useCallback(() => {
    // Update quantities for each invalid item
    stockErrors.forEach((error) => {
      if (error.reason === "VARIANT_NOT_FOUND") {
        // Remove item if variant not found
        removeItem(error.sku);
      } else if (error.reason === "INSUFFICIENT_STOCK") {
        // Update quantity to available quantity (or remove if 0)
        if (error.available_quantity > 0) {
          updateQty(error.sku, error.available_quantity);
        } else {
          removeItem(error.sku);
        }
      }
    });
    
    // Close modal and clear errors
    // DO NOT auto-validate - let user press Checkout again
    setShowStockModal(false);
    setStockErrors([]);
  }, [stockErrors, removeItem, updateQty]);

  /**
   * Start checkout flow - show auth modal directly
   * 
   * ARCHITECTURAL RESET: No pre-validation in CartDrawer
   * - Stock validation happens in create-order API (single call)
   * - If 409 → GuestCheckoutForm triggers handleStockValidationError
   * - Order creation and Razorpay initialization in single API call
   */
  const handleCheckoutClick = useCallback(() => {
    if (items.length === 0) return;
    if (showStockModal) return; // Don't proceed if stock modal is open
    
    console.log("[FLOW] Checkout clicked - opening auth modal directly");
    setShowAuthModal(true);
  }, [items.length, showStockModal]);

  /**
   * Handle customer resolution from auth modal
   */
  const handleCustomerResolved = useCallback((
    customer: CheckoutCustomer | null,
    guestSession: GuestSession | null
  ) => {
    // Build checkout session
    let session: CheckoutSession;
    
    if (customer) {
      // Customer checkout (returning or new)
      session = {
        customer_id: customer.id,
        guest_session_id: null,
        email: customer.email,
        phone: customer.phone,
        name: `${customer.first_name} ${customer.last_name}`,
        source: "otp_verified",
      };
    } else if (guestSession) {
      // Guest checkout
      session = {
        customer_id: null,
        guest_session_id: guestSession.guest_session_id,
        email: guestSession.email,
        phone: guestSession.phone,
        name: null,
        source: "guest",
      };
    } else {
      // Fallback to guest
      session = {
        customer_id: null,
        guest_session_id: `guest_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
        email: null,
        phone: null,
        name: null,
        source: "guest",
      };
    }
    
    setCheckoutSession(session);
    setShowAuthModal(false);
    setView("checkout");
  }, []);

  /**
   * Handle order created successfully
   */
  const handleOrderCreated = useCallback((orderId: string, orderNumber: string) => {
    // Clear cart
    clearCart();
    // Close drawer and redirect to success page
    handleClose();
    router.push(`/checkout/success?order=${orderNumber}`);
  }, [clearCart, handleClose, router]);

  /**
   * Go back to cart from checkout
   */
  const handleBackToCart = useCallback(() => {
    setView("cart");
    setCheckoutSession(null);
  }, []);

  return (
    <>
      <Drawer direction="right" open={drawerOpen} onOpenChange={(val) => !val && handleClose()}>
        <DrawerContent className="h-full w-full sm:max-w-md ml-auto rounded-none border-l border-white/10 bg-white flex flex-col p-0">
          {/* Header */}
          <div className="p-4 border-b border-silver-light flex items-center justify-between bg-[#F8F1EA]">
            {view === "checkout" ? (
              <>
                <button
                  onClick={handleBackToCart}
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {view === "checkout" ? (
              <GuestCheckoutForm 
                onOrderCreated={handleOrderCreated}
                onError={(error) => console.error("Checkout error:", error)}
                onStockValidationError={handleStockValidationError}
                checkoutSession={checkoutSession}
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

          {/* Footer - only show on cart view */}
          {view === "cart" && (
            <div className="p-6 bg-offwhite/30 border-t border-silver-light space-y-4">
              <CartSummary subtotal={subtotal} />
              <div className="pt-2">
                <button
                  onClick={handleCheckoutClick}
                  disabled={items.length === 0}
                  className="w-full block text-center bg-gold text-night font-medium py-3 rounded hover:bg-gold/90 transition-colors disabled:bg-silver disabled:cursor-not-allowed"
                >
                  Checkout →
                </button>
                <p className="text-center text-xs text-silver-dark mt-3">
                  Shipping & taxes calculated at checkout.
                </p>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Authentication Modal - Only render if stock modal is not open */}
      {!showStockModal && (
        <CheckoutAuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onCustomerResolved={handleCustomerResolved}
        />
      )}

      {/* Stock Validation Modal */}
      <StockValidationModal
        open={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setStockErrors([]);
        }}
        invalidItems={stockErrors}
        onUpdateCart={handleUpdateCart}
      />
    </>
  );
}
