import React from "react";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { ProductCardData } from "@/lib/data/products";
import { getPublicUrl } from "@/lib/utils/images";

interface SeasonalCollectionProps {
  collection: any; // Ideally typed from lib/data/collections
  products: ProductCardData[];
}

export default function SeasonalCollection({ collection, products }: SeasonalCollectionProps) {
  if (!collection) return null;

  const bannerUrl = getPublicUrl("banners", collection.banner_image_path);

  return (
    <section className="w-full bg-cream section-gap-md editorial-divider fade-in">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="serif-display display-lg text-night mb-4">
            {collection.name}
          </h2>
          {collection.description && (
            <p className="sans-base body-lg text-night/70 max-w-2xl mx-auto">
              {collection.description}
            </p>
          )}
          
          <div 
            className="w-full max-w-4xl mx-auto mt-8 aspect-[16/9] md:aspect-[5/4] bg-silver/20 border border-silver rounded-xl warm-shadow-sm overflow-hidden relative"
          >
            <img src={bannerUrl} alt={collection.name} className="object-cover w-full h-full" />
          </div>
          
          <div className="mt-6">
            <Link href={`/collections/${collection.slug}`} className="text-gold hover:underline font-medium">
              View Full Collection &rarr;
            </Link>
          </div>
        </div>

        {products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 3).map((product) => (
              <ProductCard 
                key={product.uid} 
                uid={product.uid}
                name={product.name}
                slug={product.slug}
                price={product.price}
                mainImagePath={product.main_image || undefined} // normalized data has full URL usually, ProductCard handles it
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
