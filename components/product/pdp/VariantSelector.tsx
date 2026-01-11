"use client";

/**
 * VariantSelector (PDP) - Phase 2
 * Uses AddToCartSection for standardized add-to-cart flow
 */

import React from "react";
import AddToCartSection from "@/components/cart/AddToCartSection";
import WishlistButton from "@/components/wishlist/WishlistButton.client";

interface Variant {
  id: string;
  sku: string;
  color?: string;
  size?: string;
  stock: number;
  price?: number;
  active?: boolean;
}

interface VariantSelectorProps {
  productUid: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  variants: Variant[];
}

export default function VariantSelector({ 
  productUid,
  productName, 
  productPrice,
  productImage,
  variants 
}: VariantSelectorProps) {
  // Normalize variants to expected format
  const normalizedVariants = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size || "N/A",
    color: v.color,
    stock: v.stock,
    price: v.price || null,
    active: v.active !== false,
  }));

  return (
    <div className="space-y-6 pt-6 border-t border-silver-light">
      {/* Add to Cart Section with Size & Quantity Selection */}
      <AddToCartSection
        productUid={productUid}
        productName={productName}
        productPrice={productPrice}
        productImage={productImage}
        variants={normalizedVariants}
        layout="inline"
      />

      {/* Wishlist Button */}
      <div className="pt-4 border-t border-silver-light">
        <WishlistButton
          productUid={productUid}
          variant="outline"
          fullWidth
          showLabel
        />
      </div>
    </div>
  );
}


