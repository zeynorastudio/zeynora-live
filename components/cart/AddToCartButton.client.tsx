"use client";

import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { addToCartAction } from "@/app/api/cart/actions";
import { useCartStore } from "@/lib/store/cart";

interface AddToCartButtonProps {
  variantId: string | null;
  productUid?: string; // needed for store consistency if not in variantId lookup yet
  disabled?: boolean;
  className?: string;
}

export default function AddToCartButton({ variantId, productUid, disabled, className }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = async () => {
    if (!variantId) return;
    setLoading(true);

    try {
      // 1. Server Action
      // Note: productUid is needed for addToCartAction signature? 
      // My actions.ts signature: addToCartAction(product_uid: string, variantId: string, qty: number)
      // So I need productUid prop.
      if (!productUid) {
          console.error("Product UID required for Add to Cart");
          // Fallback or fail
          return; 
      }

      const res = await addToCartAction(productUid, variantId, 1);

      if (res.error) {
        throw new Error(res.error);
      }

      // 2. Update Store (Optimistic or re-fetch)
      // Server action handles adding to cart in database
      // Store will be refreshed when cart is opened or via a refresh mechanism
      openCart();

    } catch (error: any) {
      alert(error.message || "Error adding to cart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || !variantId || loading}
      className={className}
      variant="primary"
      fullWidth
    >
      {loading ? "Adding..." : "Add to Bag"}
    </Button>
  );
}
