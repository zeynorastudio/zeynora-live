import { Metadata } from "next";
import { getProducts } from "@/lib/data/products";
import ShopPageClient from "@/components/shop/ShopPageClient";

interface ShopPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata: Metadata = {
  title: "Shop | Zeynora",
  description: "Browse our complete collection of luxury ethnic wear.",
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // Parse query params
  const tag = typeof resolvedSearchParams.tag === 'string' ? resolvedSearchParams.tag : undefined;
  const featured = resolvedSearchParams.featured === "true";
  const bestSelling = resolvedSearchParams.best_selling === "true";
  const newLaunch = resolvedSearchParams.new_launch === "true";
  const sale = resolvedSearchParams.sale === "true";
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : undefined;
  const priceRange = typeof resolvedSearchParams.price === 'string' ? resolvedSearchParams.price : undefined;
  const fabric = typeof resolvedSearchParams.fabric === 'string' ? resolvedSearchParams.fabric : undefined;
  const work = typeof resolvedSearchParams.work === 'string' ? resolvedSearchParams.work : undefined;
  const category = typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : undefined;
  const subcategory = typeof resolvedSearchParams.subcategory === 'string' ? resolvedSearchParams.subcategory : undefined;

  let minPrice, maxPrice;
  if (priceRange) {
    const [min, max] = priceRange.split('-').map(Number);
    minPrice = min;
    maxPrice = max;
  }

  // Fetch initial products with filters (first page)
  const { products, totalCount } = await getProducts({
    tag: tag || undefined,
    featured: featured || undefined,
    best_selling: bestSelling || undefined,
    new_launch: newLaunch || undefined,
    sale: sale || undefined,
    sort: sort as any,
    min_price: minPrice,
    max_price: maxPrice,
    fabric,
    work,
    category,
    subcategory,
    page: 1,
    limit: 12,
  });

  // Ensure products is always an array (defensive fallback)
  const initialProducts = Array.isArray(products) ? products : [];

  // Transform products to match client component expectations
  const transformedProducts = initialProducts.map((product: any) => ({
    uid: product.uid,
    name: product.name,
    slug: product.slug,
    price: product.price,
    main_image_path: product.main_image_path,
    featured: product.featured,
    best_selling: product.best_selling,
    new_launch: product.new_launch,
    on_sale: product.on_sale,
    subcategory: product.categories?.name || product.subcategory || null,
    fabric_type: product.tags?.find((tag: string) => 
      ["Silk", "Cotton", "Georgette", "Chiffon", "Linen", "Velvet", "Organza"].includes(tag)
    ),
    work_type: product.tags?.find((tag: string) => 
      ["Handwoven", "Embroidered", "Printed", "Zari", "Banarasi", "Kanjivaram"].includes(tag)
    ),
    variant_colors: undefined, // Will be fetched client-side if needed
    variants: product.variants || [], // Prefetched variant data
  }));

  return <ShopPageClient initialProducts={transformedProducts} initialTotalCount={totalCount} />;
}




