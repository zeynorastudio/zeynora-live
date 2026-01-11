// ProductGrid: Responsive grid layout for product cards
// Accepts array of product items (placeholder structure)
// Responsive: 1 column (mobile), 2 columns (tablet), 3 columns (desktop), 4 columns (xl)

import ProductCard, { ProductCardProps } from "./ProductCard";

export interface ProductGridProps {
  products?: ProductCardProps[];
  className?: string;
}

export default function ProductGrid({
  products = [],
  className = "",
}: ProductGridProps) {
  // Placeholder products if none provided
  const displayProducts = products.length > 0 
    ? products 
    : Array.from({ length: 8 }, (_, i) => ({
        uid: `placeholder-${i}`,
        name: `Product ${i + 1}`,
        slug: `product-${i + 1}`,
        price: 2999 + i * 500,
        mainImagePath: `supabase://products/placeholder-${i}/hero-1.jpg`,
        isNew: i < 2,
        fabricType: "Silk",
        workType: "Handwoven",
        variantColors: ["#D4AF37", "#CD7F32", "#8B2635"],
      }));

  return (
    <div className={`w-full ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {displayProducts.map((product, index) => (
          <ProductCard key={product.uid || index} {...product} />
        ))}
      </div>
    </div>
  );
}
