"use client";

import React, { useState, useRef, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import "@/styles/product-card.css";
import { getPublicUrl } from "@/lib/utils/images";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WishlistButton from "@/components/wishlist/WishlistButton.client";
import { ShoppingBag, Eye } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { addToCartAction } from "@/app/api/cart/actions";

export interface ProductCardProps {
  uid?: string;
  name?: string;
  slug?: string;
  price?: number;
  mainImagePath?: string;
  isNew?: boolean;
  subcategory?: string | null;
  fabricType?: string;
  workType?: string;
  variantColors?: string[];
  imageAlt?: string;
  variants?: Array<{
    code: string;
    label: string | null;
    variants: Array<{
      id: string;
      sku: string | null;
      stock: number;
      price: number | null;
    }>;
  }>;
}

interface Size {
  code: string;
  label: string | null;
  variants: Array<{
    id: string;
    sku: string | null;
    stock: number;
    price: number | null;
  }>;
}

// Global state to track which product has size selector open
let openSizeSelectorUid: string | null = null;
const sizeSelectorListeners = new Set<(uid: string | null) => void>();

function notifySizeSelectorChange(uid: string | null) {
  openSizeSelectorUid = uid;
  sizeSelectorListeners.forEach((listener) => listener(uid));
}

export default function ProductCard({
  uid = "",
  name = "Product Name",
  slug = "",
  price = 2999,
  mainImagePath = "products/placeholder/hero-1.jpg",
  isNew = false,
  subcategory = null,
  fabricType = "Silk",
  workType = "Handwoven",
  variantColors = undefined,
  imageAlt = "Product image",
  variants = [],
}: ProductCardProps) {
  const router = useRouter();
  const [showOverlay, setShowOverlay] = useState(false);
  const [sizes, setSizes] = useState<Size[]>(variants || []);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCartStore();

  const imageUrl = getPublicUrl("products", mainImagePath);

  // Initialize sizes from prefetched variants
  useEffect(() => {
    if (variants && variants.length > 0) {
      setSizes(variants);
    }
  }, [variants]);

  // Listen for overlay changes from other products
  useEffect(() => {
    const listener = (openUid: string | null) => {
      if (openUid !== uid && showOverlay) {
        setShowOverlay(false);
      }
    };
    sizeSelectorListeners.add(listener);
    return () => {
      sizeSelectorListeners.delete(listener);
    };
  }, [uid, showOverlay]);

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        showOverlay
      ) {
        setShowOverlay(false);
        notifySizeSelectorChange(null);
      }
    };

    if (showOverlay) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showOverlay]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons, overlay, or wishlist/eye icons
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[data-overlay]') ||
      target.closest('[data-action-icon]')
    ) {
      return;
    }
    router.push(`/product/${slug}`);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close other overlays
    notifySizeSelectorChange(uid);
    
    setShowOverlay(!showOverlay);
  };

  // Size click adds to cart - only after size is selected
  const handleSizeClick = (sizeCode: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const size = sizes.find((s) => s.code === sizeCode);
    if (!size || size.variants.length === 0) return;

    // Resolve variant by matching: product UID (implicit via variants prop), selected size, stock > 0
    // Find variant for this exact size with stock > 0
    const variant = size.variants.find((v) => v.stock > 0);
    if (!variant) return;

    // Read SKU ONLY from variant record - do NOT infer from product fields, tags, or strings
    if (!variant.sku || variant.sku.trim().length === 0) return;

    // Add to cart - no blocking conditions (cart, session, customer checks removed)
    addItem({
      sku: variant.sku, // SKU read only from variant record
      product_uid: uid,
      name: name,
      size: sizeCode,
      quantity: 1,
      price: variant.price || price,
      image: mainImagePath,
    });

    // Success: Close overlay
    // Drawer will auto-open via reactive effect in CartDrawer
    setShowOverlay(false);
    notifySizeSelectorChange(null);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEyeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/product/${slug}`);
  };

  return (
    <div ref={cardRef}>
      <Card
        className="overflow-hidden product-card-transition bg-cream/30 warm-shadow-sm luxury-hover border border-silver p-4 md:p-6 relative cursor-pointer"
        shadowVariant="warm-sm"
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Image container - 4:5 aspect ratio */}
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-xl bg-silver/20 group">
        <Link
          href={`/product/${slug}`}
          className="block w-full h-full"
          aria-label={`View details for ${name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={imageAlt || `Product image for ${name}`}
            className={`w-full h-full object-cover transition-all duration-300 ${
              showOverlay ? "blur-sm scale-105" : "group-hover:scale-105"
            }`}
            loading="lazy"
          />
        </Link>

        {/* Image Overlay with Size Selector */}
        {showOverlay && (
          <div
            data-overlay
            className="absolute inset-0 bg-night/60 backdrop-blur-sm flex items-center justify-center z-30 animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {sizes.length === 0 ? (
              <div className="text-center px-4">
                <p className="text-white text-sm font-medium">No sizes available</p>
              </div>
            ) : (
              <div className="px-6 py-4 w-full max-w-[280px]">
                <p className="text-white text-sm font-medium text-center mb-4">
                  Select Size
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map((size) => {
                    // Find variant with stock > 0 and valid SKU
                    const availableVariant = size.variants.find((v) => v.stock > 0 && v.sku && v.sku.trim().length > 0);
                    const hasStock = !!availableVariant;
                    
                    return (
                      <button
                        key={size.code}
                        onClick={(e) => hasStock && handleSizeClick(size.code, e)}
                        disabled={!hasStock}
                        className={`
                          px-4 py-3 rounded-md text-sm font-semibold transition-all
                          ${
                            hasStock
                              ? "bg-white text-night hover:bg-gold hover:text-night active:scale-95"
                              : "bg-white/30 text-white/50 cursor-not-allowed line-through opacity-50"
                          }
                        `}
                      >
                        {size.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {isNew && (
          <div className="absolute top-3 left-3 z-10">
            <Badge variant="bronze">NEW</Badge>
          </div>
        )}

        {/* Wishlist Button - Absolute positioned on image */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2" data-action-icon>
          <div onClick={handleWishlistClick}>
            <WishlistButton
              productUid={uid}
              className="bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
            />
          </div>
          
          {/* Eye Icon - Below heart, visible on hover (desktop) or always translucent (mobile) */}
          <button
            type="button"
            onClick={handleEyeClick}
            className="p-2 rounded-full bg-white/60 backdrop-blur-sm shadow-sm hover:bg-white/90 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
            aria-label={`Quick view ${name}`}
          >
            <Eye className="w-4 h-4 text-night" />
          </button>
        </div>

        {/* Add to Cart - Hover on desktop only */}
        <div
          className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-night/80 to-transparent transition-opacity duration-300 opacity-0 md:group-hover:opacity-100 hidden md:block"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            onClick={handleAddToCartClick}
            variant="default"
            className="w-full bg-white text-night hover:bg-cream text-sm py-2"
            aria-label={`Add ${name} to cart`}
            disabled={false}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>

      {/* Product Info Section */}
      <div className="product-card-spacing">
        <h3 className="product-card-title text-night mb-2 line-clamp-2 text-lg">
          <Link
            href={`/product/${slug}`}
            className="hover:text-gold transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        </h3>

        {/* Subcategory text */}
        {subcategory && (
          <div className="mb-3">
            <span className="sans-base text-xs text-silver-dark">
              {subcategory}
            </span>
          </div>
        )}

        <div className="mb-4">
          <span className="product-card-price text-lg">
            ₹{price.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Add to Cart Button - Mobile only (always visible) */}
        <div className="block md:hidden">
          <Button
            onClick={handleAddToCartClick}
            variant="default"
            className="w-full"
            aria-label={`Add ${name} to cart`}
            disabled={false}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
    </div>
  );
}

