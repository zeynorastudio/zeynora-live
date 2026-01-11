"use client";

/**
 * PDP Client Wrapper
 * Coordinates image overlay for size selection
 */

import React, { useState } from "react";
import ProductImageGallery from "./ProductImageGallery";
import ProductInfo from "./ProductInfo";
import { ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";
import WishlistButton from "@/components/wishlist/WishlistButton.client";
import { useCartStore } from "@/lib/store/cart";
import { addToCartAction } from "@/app/api/cart/actions";

interface Variant {
  id: string;
  sku: string;
  size?: string;
  stock: number;
  price: number;
  active: boolean;
}

interface PDPClientProps {
  product: {
    uid: string;
    name: string;
    description: string | null;
    price: number;
    category: string | null;
    main_image_path: string | null;
    images: Array<{ url: string; alt: string; type?: string }>;
    variants: Variant[];
  };
}

export default function PDPClient({ product }: PDPClientProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const { addItem } = useCartStore();

  // Get unique sizes from active variants
  const sizes = Array.from(
    new Set(
      product.variants
        .filter((v) => v.active && v.size)
        .map((v) => v.size!)
    )
  );

  const handleAddToCartClick = () => {
    setShowOverlay(true);
  };

  const handleSizeClick = (sizeCode: string) => {
    // Resolve variant by matching: product UID, selected size, stock > 0
    const variant = product.variants.find(
      (v) => v.size === sizeCode && v.active && v.stock > 0 && v.sku && v.sku.trim().length > 0
    );

    if (!variant) return;

    // Read SKU ONLY from variant record - do NOT infer from product fields, tags, or strings
    if (!variant.sku || variant.sku.trim().length === 0) return;

    // Add to cart - no blocking conditions (cart, session, customer checks removed)
    addItem({
      sku: variant.sku, // SKU read only from variant record
      product_uid: product.uid,
      name: product.name,
      size: sizeCode,
      quantity: 1,
      price: variant.price || product.price,
      image: product.main_image_path || undefined,
    });

    // Success: Close overlay
    // Drawer will auto-open via reactive effect in CartDrawer
    setShowOverlay(false);
  };

  const handleOverlayClose = () => {
    setShowOverlay(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
      {/* Left: Gallery with Overlay */}
      <div className="w-full lg:w-3/5 relative">
        <div className={showOverlay ? "blur-sm" : ""}>
          <ProductImageGallery images={product.images || []} productName={product.name} />
        </div>
        
        {/* Size Overlay - Mobile: blur image, show size buttons */}
        {showOverlay && (
          <div
            className="absolute inset-0 bg-night/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl animate-in fade-in duration-200"
            onClick={handleOverlayClose}
          >
            {sizes.length === 0 ? (
              <div className="text-center px-4">
                <p className="text-white text-base font-medium">No sizes available</p>
              </div>
            ) : (
              <div className="px-8 py-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <p className="text-white text-lg font-semibold text-center mb-6">
                  Select Size
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {sizes.map((size) => {
                    // Find variant with stock > 0, active, and valid SKU
                    const variant = product.variants.find(
                      (v) => v.size === size && v.active && v.stock > 0 && v.sku && v.sku.trim().length > 0
                    );
                    const hasStock = !!variant;
                    
                    return (
                      <button
                        key={size}
                        onClick={() => hasStock && handleSizeClick(size)}
                        disabled={!hasStock}
                        className={`
                          px-6 py-4 rounded-lg text-base font-bold transition-all
                          ${
                            hasStock
                              ? "bg-white text-night hover:bg-gold hover:text-night hover:scale-105 active:scale-95"
                              : "bg-white/30 text-white/50 cursor-not-allowed line-through opacity-50"
                          }
                        `}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Info & Actions */}
      <div className="w-full lg:w-2/5 space-y-8 sticky top-24 self-start">
        <ProductInfo 
          name={product.name}
          price={product.price}
          description={product.description || undefined}
          category={product.category || undefined}
        />

        {/* Actions */}
        <div className="space-y-4 pt-6 border-t border-silver-light">
          <Button
            onClick={handleAddToCartClick}
            disabled={sizes.length === 0}
            className="w-full bg-gold text-night hover:bg-gold/90 font-semibold py-4"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Add to Cart
          </Button>

          <WishlistButton
            productUid={product.uid}
            variant="outline"
            fullWidth
            showLabel
          />
        </div>
      </div>
    </div>
  );
}

