"use client";

/**
 * AddToCartSection - Phase 2 Implementation
 * 
 * FLOW:
 * 1. User clicks "Add to Cart" → Size selector appears
 * 2. User selects a size → Quantity selector expands inline
 * 3. User adjusts quantity → Clicks "Add" button
 * 4. Item added to cart with SKU-level granularity
 * 
 * LAYOUT: [ SIZE ] [ − QTY + ] [ Add to Cart ]
 */

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { ShoppingBag, Plus, Minus } from "lucide-react";
import { useCartStore, CartItem } from "@/lib/store/cart";

interface Variant {
  id: string;
  sku: string;
  size: string;
  color?: string;
  stock: number;
  price: number | null;
  active: boolean;
}

interface AddToCartSectionProps {
  productUid: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  variants: Variant[];
  className?: string;
  // Layout mode: "inline" for PDP, "compact" for PLP
  layout?: "inline" | "compact";
}

export default function AddToCartSection({
  productUid,
  productName,
  productPrice,
  productImage,
  variants,
  className,
  layout = "inline",
}: AddToCartSectionProps) {
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();

  // Get unique sizes from variants
  const sizes = Array.from(
    new Set(variants.filter((v) => v.active).map((v) => v.size))
  );

  // Reset quantity when size changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedSize]);

  // Get selected variant - Resolve by matching: product UID (implicit), selected size, stock > 0
  const selectedVariant = selectedSize
    ? variants.find((v) => v.size === selectedSize && v.active && v.stock > 0 && v.sku && v.sku.trim().length > 0)
    : null;

  // Get max stock for quantity selector
  const maxStock = selectedVariant?.stock || 0;

  const handleSizeClick = (size: string) => {
    if (selectedSize === size) {
      // Clicking same size deselects it
      setSelectedSize(null);
      setQuantity(1);
    } else {
      setSelectedSize(size);
      setShowSizeSelector(true);
    }
  };

  const incrementQuantity = () => {
    if (quantity < maxStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    // Ensure size is selected and variant is valid
    if (!selectedSize || !selectedVariant) return;
    
    // Read SKU ONLY from variant record - do NOT infer from product fields, tags, or strings
    if (!selectedVariant.sku || selectedVariant.sku.trim().length === 0) return;
    if (selectedVariant.stock < 1) return;

    // Add to cart - no blocking conditions (cart, session, customer checks removed)
    const cartItem: CartItem = {
      sku: selectedVariant.sku, // SKU read only from variant record
      product_uid: productUid,
      name: productName,
      size: selectedVariant.size,
      quantity: quantity,
      price: selectedVariant.price || productPrice,
      image: productImage,
    };

    addItem(cartItem);

    // Open cart drawer
    openCart();

    // Reset state
    setSelectedSize(null);
    setQuantity(1);
    setShowSizeSelector(false);
  };

  if (variants.length === 0 || sizes.length === 0) {
    return (
      <div className={cn("text-center py-4", className)}>
        <p className="text-silver-dark text-sm">No variants available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Size Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-night">
            Select Size
            {selectedSize && (
              <span className="text-silver-dark font-normal ml-2">
                ({selectedSize})
              </span>
            )}
          </span>
          {/* Size Guide link could go here */}
        </div>

        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const sizeVariant = variants.find((v) => v.size === size && v.active);
            const hasStock = sizeVariant && sizeVariant.stock > 0;
            const isSelected = selectedSize === size;

            return (
              <button
                key={size}
                onClick={() => hasStock && handleSizeClick(size)}
                disabled={!hasStock}
                className={cn(
                  "min-w-[3rem] px-4 py-2 rounded-md border text-sm font-medium transition-all",
                  isSelected
                    ? "border-gold bg-gold/10 text-gold-darker"
                    : hasStock
                    ? "border-silver-light text-night hover:border-gold hover:bg-cream"
                    : "border-silver-light/50 bg-silver/20 text-silver-light cursor-not-allowed line-through"
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity Selector & Add Button - ALWAYS VISIBLE when size selected */}
      {selectedSize && (
        <div
          className={cn(
            "flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200",
            layout === "compact" ? "flex-col" : "flex-row"
          )}
        >
          {selectedVariant && (
            <>
              {/* Quantity Controls */}
              <div className="flex items-center border border-silver-light rounded-md overflow-hidden">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="p-2 hover:bg-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="px-4 py-2 min-w-[3rem] text-center font-medium border-x border-silver-light">
                  {quantity}
                </div>
                <button
                  onClick={incrementQuantity}
                  disabled={quantity >= maxStock}
                  className="p-2 hover:bg-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Stock indicator */}
              <div className="text-xs text-silver-dark">
                {maxStock <= 5 && maxStock > 0 && (
                  <span className="text-amber-600">Only {maxStock} left</span>
                )}
                {maxStock === 0 && <span className="text-red-500">Out of stock</span>}
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={!selectedVariant || maxStock === 0}
                className={cn(
                  "bg-gold text-night hover:bg-gold/90 font-medium",
                  layout === "compact" ? "w-full" : "flex-1"
                )}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </>
          )}
        </div>
      )}

      {/* Call to action if no size selected */}
      {!selectedSize && (
        <div className="text-center py-2">
          <p className="text-sm text-silver-dark italic">Select a size to continue</p>
        </div>
      )}
    </div>
  );
}

