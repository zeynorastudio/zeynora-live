"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { HomepageSection } from "@/lib/homepage/types";
import { getPublicUrl } from "@/lib/utils/images";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

// Reusable Product Card component
function ProductCard({ product }: { product: { uid: string; name: string; slug: string; price: number; main_image_path: string | null } }) {
  const imageUrl = getPublicUrl("products", product.main_image_path || "");
  
  return (
    <Link 
      href={`/product/${product.slug}`} 
      className="product-slide group block"
    >
      <div className="relative aspect-[3/4] bg-offwhite rounded-sm overflow-hidden mb-4">
        {product.main_image_path ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-silver-dark bg-offwhite">No Image</div>
        )}
      </div>
      
      <h3 className="font-medium text-night text-sm md:text-base group-hover:text-gold transition-colors line-clamp-1">{product.name}</h3>
      <p className="text-silver-dark mt-1 text-sm md:text-base">₹{product.price?.toLocaleString('en-IN')}</p>
    </Link>
  );
}

// Reusable Shop More Tile component
function ShopMoreTile({ href }: { href: string }) {
  return (
    <Link 
      href={href}
      className="product-slide group block"
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-gold/10 via-cream to-gold/5 rounded-sm overflow-hidden mb-4 flex flex-col items-center justify-center border border-gold/20 hover:border-gold/40 transition-colors">
        <div className="text-center p-4">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
            <ArrowRight className="w-6 h-6 md:w-8 md:h-8 text-gold" />
          </div>
          <span className="font-serif text-lg md:text-xl text-night block mb-2">Shop More</span>
          <span className="text-sm text-silver-dark">View all products</span>
        </div>
      </div>
    </Link>
  );
}

export default function SectionGrid({ section }: { section: HomepageSection }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  // Filter out valid products only (do this before hooks to maintain consistent hook order)
  const products = section.products?.filter(p => p.product) || [];
  const productCount = products.length;
  const showArrows = productCount >= 3; // Only show arrows when scrolling is actually needed

  // Determine "Shop More" link based on section type
  const shopMoreLink = (() => {
    const type = section.source_meta?.automatic_type;
    if (type === "featured") return "/shop?featured=true";
    if (type === "best_selling") return "/shop?best_selling=true";
    if (type === "new_launch") return "/shop?new_launch=true";
    if (type === "on_sale") return "/shop?sale=true";
    return "/shop";
  })();

  // Check if scrolling is possible (for conditional arrow display)
  // This hook runs regardless of early returns to maintain consistent hook order
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setCanScroll(scrollWidth > clientWidth + 10); // 10px threshold
      }
    };
    
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [productCount]);

  // Early returns AFTER all hooks
  if (!section.visible) return null;
  if (productCount === 0) return null;

  // Scroll functions for navigation arrows
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.querySelector('.product-slide')?.clientWidth || 280;
      scrollContainerRef.current.scrollBy({ left: -(cardWidth + 24), behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.querySelector('.product-slide')?.clientWidth || 280;
      scrollContainerRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
    }
  };

  // CASE 1: Single product - render centered static grid
  if (productCount === 1) {
    const p = products[0].product!;
    
    return (
      <section className="py-12 md:py-16 border-t border-offwhite">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h2 className="font-serif text-3xl md:text-4xl text-night mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-silver-dark text-lg">{section.subtitle}</p>}
          </div>

          {/* Centered grid with 1 product + Shop More */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-lg md:max-w-xl">
              <ProductCard product={p} />
              <ShopMoreTile href={shopMoreLink} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // CASE 2 & 3: Multiple products - use slider layout
  return (
    <section className="py-12 md:py-16 border-t border-offwhite overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-night mb-2">{section.title}</h2>
            {section.subtitle && <p className="text-silver-dark text-lg">{section.subtitle}</p>}
          </div>
          
          {/* Navigation arrows - Only show if scrolling is possible */}
          {showArrows && canScroll && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={scrollLeft}
                className="p-2 rounded-full border border-silver-light hover:border-gold hover:text-gold transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={scrollRight}
                className="p-2 rounded-full border border-silver-light hover:border-gold hover:text-gold transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Product Slider */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
        >
          {/* Product Cards */}
          {products.map((sp) => {
            const p = sp.product!;
            
            return (
              <div 
                key={p.uid}
                className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-18px)] snap-start"
              >
                <ProductCard product={p} />
              </div>
            );
          })}

          {/* Shop More Tile - Final Slide */}
          <div className="flex-shrink-0 w-[calc(50%-8px)] md:w-[calc(25%-18px)] snap-start">
            <ShopMoreTile href={shopMoreLink} />
          </div>
        </div>
      </div>
    </section>
  );
}




















