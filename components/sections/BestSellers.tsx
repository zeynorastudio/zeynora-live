"use client";

import React, { useEffect, useState } from "react";
import ProductCard from "@/components/product/ProductCard.client";
import { ProductCardData } from "@/lib/data/products";

interface BestSellersProps {
  products: ProductCardData[];
}

interface ProductWithVariants extends ProductCardData {
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

export default function BestSellers({ products }: BestSellersProps) {
  const [productsWithVariants, setProductsWithVariants] = useState<ProductWithVariants[]>(products);

  // Fetch variants for all products
  useEffect(() => {
    const fetchVariants = async () => {
      const productsWithVariantsData = await Promise.all(
        products.map(async (product) => {
          try {
            const response = await fetch(`/api/products/${product.uid}/variants`);
            if (response.ok) {
              const variantsData = await response.json();
              return {
                ...product,
                variants: variantsData.sizes || [],
              };
            }
          } catch (error) {
            console.error(`Failed to fetch variants for ${product.uid}:`, error);
          }
          return { ...product, variants: [] };
        })
      );
      setProductsWithVariants(productsWithVariantsData);
    };

    if (products.length > 0) {
      fetchVariants();
    }
  }, [products]);

  if (products.length === 0) return null;

  return (
    <section className="w-full bg-offwhite section-gap-md slide-up">
      <div className="container mx-auto px-4">
        <div className="mb-10 md:mb-12">
          <h2 className="serif-display text-3xl md:text-4xl lg:text-5xl text-night mb-3 font-medium tracking-tight">
            Best Sellers
          </h2>
          <p className="sans-base text-base md:text-lg text-night/80 font-light">
            Our most loved pieces
          </p>
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-6 md:gap-8 min-w-max pb-4">
            {productsWithVariants.map((product) => (
              <div key={product.uid} className="w-[280px] md:w-[300px] flex-shrink-0">
                <ProductCard 
                   uid={product.uid}
                   name={product.name}
                   slug={product.slug}
                   price={product.price}
                   mainImagePath={product.main_image || undefined}
                   variants={product.variants || []}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
