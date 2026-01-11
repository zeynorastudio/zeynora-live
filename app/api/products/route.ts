import { getProducts, FilterParams } from "@/lib/data/products";
import { NextResponse } from "next/server";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Parse UIDs for wishlist or specific selection
  const uidsParam = searchParams.get("uids");
  const uids = uidsParam ? uidsParam.split(",").filter(Boolean) : undefined;

  // Parse size filter (can be multiple, comma-separated or array)
  const sizeParam = searchParams.get("size");
  const sizes = sizeParam 
    ? (Array.isArray(sizeParam) ? sizeParam : sizeParam.split(",")).filter(Boolean)
    : undefined;

  // Parse price range (format: "min-max" or "min-")
  const priceRange = searchParams.get("price");
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (priceRange) {
    const [min, max] = priceRange.split("-");
    minPrice = min ? Number(min) : undefined;
    maxPrice = max ? Number(max) : undefined;
  }

  const params: FilterParams = {
    uids,
    tag: searchParams.get("tag") || undefined,
    category: searchParams.get("category") || undefined,
    subcategory: searchParams.get("subcategory") || undefined,
    fabric: searchParams.get("fabric") || undefined,
    work: searchParams.get("work") || undefined,
    min_price: minPrice ?? (searchParams.has("min_price") ? Number(searchParams.get("min_price")) : undefined),
    max_price: maxPrice ?? (searchParams.has("max_price") ? Number(searchParams.get("max_price")) : undefined),
    size: sizes,
    sort: (searchParams.get("sort") as FilterParams["sort"]) || undefined,
    page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : 12,
    featured: searchParams.get("featured") === "true" || undefined,
    best_selling: searchParams.get("best_selling") === "true" || undefined,
    new_launch: searchParams.get("new_launch") === "true" || undefined,
    sale: searchParams.get("sale") === "true" || undefined,
  };

  // Q is search query
  // Note: getProducts in lib/data/products.ts might need to handle 'q' if intended for full text search.
  // The current implementation of getProducts doesn't explicitly handle 'q' based on previous phase.
  // Assuming simple filters for now as per interface.

  try {
    const { products, totalCount } = await getProducts(params);
    
    const currentPage = params.page || 1;
    const perPage = params.limit || 12;
    const loadedCount = currentPage * perPage;
    const hasMore = loadedCount < totalCount;
    
    return NextResponse.json({
      data: products,
      page: currentPage,
      perPage,
      hasMore,
      totalCount,
      loadedCount: Math.min(loadedCount, totalCount),
    });
  } catch (error) {
    console.error("API products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}



