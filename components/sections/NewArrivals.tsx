import React from "react";
import ProductCard from "@/components/product/ProductCard";
import { ProductCardData } from "@/lib/data/products";

interface NewArrivalsProps {
  products: ProductCardData[];
}

export default function NewArrivals({ products }: NewArrivalsProps) {
  if (products.length === 0) return null;

  return (
    <section className="w-full bg-cream section-gap-md slide-up">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="serif-display display-lg text-night mb-2">
              New Arrivals
            </h2>
            <p className="sans-base body-md text-night/70">
              Fresh from our artisans
            </p>
          </div>
          <a href="/shop?new_launch=true" className="text-sm font-medium text-gold hover:underline">
            View All &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard 
               key={product.uid}
               uid={product.uid}
               name={product.name}
               slug={product.slug}
               price={product.price}
               mainImagePath={product.main_image || undefined}
               isNew={true}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
