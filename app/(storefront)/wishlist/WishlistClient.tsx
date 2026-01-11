"use client";

import React, { useEffect, useState } from "react";
import { useWishlistStore } from "@/lib/store/wishlist";
import ProductCard from "@/components/product/ProductCard.client";
import { Heart, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Link from "next/link";

export default function WishlistClient() {
  const { wishlist } = useWishlistStore();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (wishlist.length === 0) {
        setProducts([]);
        setIsLoading(false);
        setHasLoaded(true);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/products?uids=${wishlist.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch wishlist products:", error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    fetchWishlistProducts();
  }, [wishlist]);

  if (isLoading && !hasLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gold animate-spin" />
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full p-8 md:p-12 text-center" shadowVariant="warm-sm">
          <Heart className="w-16 h-16 text-silver-light mx-auto mb-6" strokeWidth={1} />
          <h1 className="serif-display text-2xl md:text-3xl text-night mb-4">
            Your Wishlist is Empty
          </h1>
          <p className="text-silver-dark mb-8">
            Start adding items you love to your wishlist.
          </p>
          <Link href="/shop">
            <Button className="w-full sm:w-auto">Browse Shop</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
          My Wishlist
        </h1>
        <p className="text-silver-dark">
          {products.length} {products.length === 1 ? "item" : "items"} saved
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.uid}
            uid={product.uid}
            name={product.name}
            slug={product.slug}
            price={product.price}
            mainImagePath={product.main_image_path}
            isNew={product.new_launch}
            subcategory={product.categories?.name}
            variants={product.variants}
          />
        ))}
      </div>
    </div>
  );
}

