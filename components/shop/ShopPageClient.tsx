"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FilterDrawer from "@/components/product/FilterDrawer";
import SortBar from "@/components/product/SortBar";
import ProductCard from "@/components/product/ProductCard.client";

interface Product {
  uid: string;
  name: string;
  slug: string;
  price: number;
  main_image_path: string | null;
  featured?: boolean;
  best_selling?: boolean;
  new_launch?: boolean;
  on_sale?: boolean;
  subcategory?: string | null;
  fabric_type?: string;
  work_type?: string;
  variant_colors?: string[];
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

interface ProductsResponse {
  data: Product[];
  page: number;
  perPage: number;
  hasMore: boolean;
  totalCount?: number;
  loadedCount?: number;
}

function ShopPageContent({ initialProducts, initialTotalCount = 0 }: { initialProducts: Product[]; initialTotalCount?: number }) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Derive loadedCount from products array length
  const loadedCount = products.length;

  // Build query params from URL
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    
    // Handle tag-based filtering (Phase 1.2)
    const tag = searchParams.get("tag");
    if (tag) {
      params.set("tag", tag);
    }
    
    // Backward compatibility: legacy boolean params
    if (searchParams.get("featured") === "true") params.set("featured", "true");
    if (searchParams.get("best_selling") === "true") params.set("best_selling", "true");
    if (searchParams.get("new_launch") === "true") params.set("new_launch", "true");
    if (searchParams.get("sale") === "true") params.set("sale", "true");
    
    const sort = searchParams.get("sort") || "";
    if (sort) params.set("sort", sort);
    
    const priceRange = searchParams.get("price");
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      params.set("min_price", min);
      params.set("max_price", max);
    }
    
    const size = searchParams.get("size");
    if (size) params.set("size", size);
    
    return params.toString();
  }, [searchParams]);

  // Fetch more products
  const fetchMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const queryParams = buildQueryParams();
      const nextPage = page + 1;
      const url = `/api/products?${queryParams}&page=${nextPage}&limit=12`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products");
      
      const result: ProductsResponse = await response.json();
      
      setProducts((prev) => [...prev, ...result.data]);
      setPage(nextPage);
      if (result.totalCount !== undefined) {
        setTotalCount(result.totalCount);
      }
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error fetching more products:", error);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, buildQueryParams]);

  // Reset products when filters change
  useEffect(() => {
    const queryParams = buildQueryParams();
    const url = `/api/products?${queryParams}&page=1&limit=12`;
    
    setLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then((result: ProductsResponse) => {
        setProducts(result.data);
        setPage(1);
        if (result.totalCount !== undefined) {
          setTotalCount(result.totalCount);
        }
        setHasMore(result.hasMore);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
      })
      .finally(() => {
        setLoading(false);
      });
    // Dependencies: rebuild when searchParams change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams.get("tag"),
    searchParams.get("featured"),
    searchParams.get("best_selling"),
    searchParams.get("new_launch"),
    searchParams.get("sale"),
    searchParams.get("sort"),
    searchParams.get("price"),
    searchParams.get("size"),
  ]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, fetchMoreProducts]);

  // Transform products to ProductCard format
  const productCards = products.map((product) => ({
    uid: product.uid,
    name: product.name,
    slug: product.slug,
    price: product.price,
    mainImagePath: product.main_image_path || "",
    isNew: product.new_launch || false,
    subcategory: product.subcategory,
    fabricType: product.fabric_type,
    workType: product.work_type,
    variantColors: product.variant_colors,
    variants: product.variants || [], // Prefetched variant data
  }));

  // Determine page title based on filters
  const tag = searchParams.get("tag");
  let pageTitle = "Explore Full Catalogue";
  if (tag === "featured") pageTitle = "Featured";
  else if (tag === "best-selling") pageTitle = "Best Selling";
  else if (tag === "new-launch") pageTitle = "New Arrivals";
  else if (tag === "seasonal") pageTitle = "Seasonal Collection";
  else if (tag === "festive") pageTitle = "Festive Collection";
  else if (searchParams.get("sale") === "true") pageTitle = "Sale";
  else if (searchParams.get("featured") === "true") pageTitle = "Featured Products";
  else if (searchParams.get("best_selling") === "true") pageTitle = "Best Selling";
  else if (searchParams.get("new_launch") === "true") pageTitle = "New Launch";

  return (
    <div className="bg-white min-h-screen">
      {/* Minimal Header */}
      <div className="relative bg-cream py-6 md:py-8 px-4 text-center border-b border-silver-light">
        <h1 className="serif-display text-xl md:text-2xl text-night">
          {pageTitle}
        </h1>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Content - Full Width */}
        <div className="w-full">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-silver-light">
              <div className="flex items-center gap-4">
                <FilterDrawer />
                <span className="text-sm text-silver-dark font-medium">
                  {loadedCount} of {totalCount} {totalCount === 1 ? "product" : "products"}
                </span>
              </div>
            </div>
            
            {/* Sticky Sort Bar */}
            <SortBar className="-mx-4 md:-mx-0" />

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {productCards.map((product, index) => (
                <ProductCard key={product.uid || index} {...product} />
              ))}
            </div>

            {/* Intersection Observer target */}
            <div ref={observerTarget} className="h-4" />

            {/* Loading indicator - only show if we're actually loading AND have more */}
            {loading && hasMore && loadedCount < totalCount && (
              <div className="text-center py-8 text-silver-dark">
                Loading more products...
              </div>
            )}

            {/* End of results message - only show when loaded all products */}
            {(loadedCount >= totalCount || !hasMore) && products.length > 0 && (
              <div className="text-center py-8 text-silver-dark">
                You've seen all {totalCount} products
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

export default function ShopPageClient({ initialProducts, initialTotalCount = 0 }: { initialProducts: Product[]; initialTotalCount?: number }) {
  return (
    <Suspense fallback={
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-silver-dark">Loading shop...</div>
      </div>
    }>
      <ShopPageContent initialProducts={initialProducts} initialTotalCount={initialTotalCount} />
    </Suspense>
  );
}


