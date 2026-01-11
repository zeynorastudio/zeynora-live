// HorizontalProductScroller: Horizontal scroll container for product collections
// Usage: Best Sellers, New Arrivals, Related Products
// Features: Snap-x scroll, hidden scrollbar on mobile, padding + spacing

import ProductCard, { ProductCardProps } from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";

export interface HorizontalProductScrollerProps {
  products?: ProductCardProps[];
  isLoading?: boolean;
  title?: string;
  className?: string;
}

export default function HorizontalProductScroller({
  products = [],
  isLoading = false,
  title,
  className = "",
}: HorizontalProductScrollerProps) {
  // Placeholder products if none provided
  const displayProducts = products.length > 0 
    ? products 
    : Array.from({ length: 6 }, (_, i) => ({
        uid: `scroller-${i}`,
        name: `Product ${i + 1}`,
        slug: `product-${i + 1}`,
        price: 2999 + i * 500,
        mainImagePath: `supabase://products/scroller-${i}/hero-1.jpg`,
        isNew: i < 2,
        fabricType: "Silk",
        workType: "Handwoven",
        variantColors: ["#D4AF37", "#CD7F32"],
      }));

  return (
    <section className={`w-full ${className}`}>
      {title && (
        <h2 className="serif-display text-display-md text-night mb-6 px-4 md:px-0">
          {title}
        </h2>
      )}
      
      {/* Horizontal scroll container */}
      <div className="overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-4 md:gap-6 px-4 md:px-0 pb-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-[280px] md:w-[300px] snap-start"
              >
                <ProductCardSkeleton />
              </div>
            ))
          ) : (
            // Product cards
            displayProducts.map((product, index) => (
              <div
                key={product.uid || index}
                className="flex-shrink-0 w-[280px] md:w-[300px] snap-start"
              >
                <ProductCard {...product} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}




