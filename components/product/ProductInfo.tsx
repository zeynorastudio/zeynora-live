import { ProductDetailData } from "@/lib/data/products";
import VariantSelector from "./VariantSelector.client";
import AddToCartButton from "../cart/AddToCartButton.client";
import { useState } from "react";
import WishlistButton from "@/components/wishlist/WishlistButton.client";

"use client";

import React from "react";
import FabricWorkSection from "./FabricWorkSection";

interface ProductInfoProps {
  product: ProductDetailData;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  
  // Derive display price from selected variant or base product
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId);
  const displayPrice = selectedVariant?.price || product.price;
  
  // Format price
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(displayPrice);

  return (
    <div className="w-full bg-cream/5 editorial-divider section-gap-md">
      <div className="py-6 md:py-8 space-y-6">
        <div className="flex items-start justify-between">
          <h1 className="serif-display text-display-lg text-night">
            {product.name}
          </h1>
          {/* Wishlist Button for Product (using base product uid) */}
          {/* Could also pass selectedVariant SKU if we want specific variant wishlist */}
          <WishlistButton 
            productUid={product.uid} 
            className="mt-2"
            iconSize={24}
          />
        </div>

        <div>
          <span className="serif-display text-2xl text-gold" aria-label={`Price: ${formattedPrice}`}>
            {formattedPrice}
          </span>
        </div>

        <VariantSelector 
          variants={product.variants as any} 
          onSelect={setSelectedVariantId}
        />

        <div className="pt-4">
          <AddToCartButton 
            variantId={selectedVariantId} 
            productUid={product.uid}
            disabled={!selectedVariantId || selectedVariant?.stock === 0}
          />
          {selectedVariantId && selectedVariant?.stock === 0 && (
              <p className="text-red-500 text-sm mt-2">Out of Stock</p>
          )}
        </div>

        <div className="pt-6 editorial-divider">
          <h2 className="sans-base text-sm font-medium text-night mb-3">
            Description
          </h2>
          <div className="sans-base text-body-md text-night space-y-4 prose prose-sm max-w-none">
            {product.description ? (
                <p>{product.description}</p>
            ) : (
                <p className="text-gray-400 italic">No description available.</p>
            )}
          </div>
        </div>

        <FabricWorkSection />
      </div>
    </div>
  );
}
