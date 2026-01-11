import { createServiceRoleClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/utils/images";

export interface ProductListItem {
  uid: string;
  name: string;
  slug: string;
  price: number;
  strike_price: number | null;
  sale_price: number | null;
  on_sale: boolean;
  main_image_path: string | null;
  thumbnail_url: string;
  active: boolean;
  sort_order: number | null;
  created_at: string;
}

export interface GetProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  orderBy?: "created_at" | "sort_order" | "name";
  orderDirection?: "asc" | "desc";
}

/**
 * Get paginated products list for admin
 * Uses service-role client to bypass RLS
 */
export async function getProducts(
  options: GetProductsOptions = {}
): Promise<{
  products: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const supabase = createServiceRoleClient();
  const {
    page = 1,
    limit = 20,
    search,
    active,
    orderBy = "sort_order",
    orderDirection = "desc",
  } = options;

  const offset = (page - 1) * limit;

  let query = supabase.from("products").select("uid, name, slug, price, strike_price, sale_price, on_sale, main_image_path, active, sort_order, created_at", {
    count: "exact",
  });

  if (search) {
    query = query.or(`uid.ilike.%${search}%,name.ilike.%${search}%`);
  }

  if (active !== undefined) {
    query = query.eq("active", active);
  }

  // Order by sort_order first (nulls last), then fallback to created_at
  if (orderBy === "sort_order") {
    query = query.order("sort_order", { ascending: orderDirection === "asc", nullsFirst: false });
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order(orderBy, { ascending: orderDirection === "asc" });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const typedProducts = (data || []) as Array<{
    uid: string;
    name: string;
    slug: string;
    price: number;
    strike_price: number | null;
    sale_price: number | null;
    on_sale: boolean | null;
    main_image_path: string | null;
    active: boolean;
    sort_order: number | null;
    created_at: string;
  }>;

  // Get thumbnail URLs - optimized batch query instead of N+1
  // First try main_image_path, then first product_images entry
  const productsWithThumbnails: ProductListItem[] = [];
  
  // Collect product UIDs that need thumbnail lookup (no main_image_path)
  const productsNeedingThumbnails = typedProducts.filter(p => !p.main_image_path);
  const productUids = productsNeedingThumbnails.map(p => p.uid);
  
  // Batch query first image for all products needing thumbnails
  let thumbnailMap = new Map<string, string>();
  if (productUids.length > 0) {
    // Use a single query with IN clause to get first image per product
    // We'll use a window function approach via Postgres - fetch all and group client-side
    const { data: thumbnailImages } = await supabase
      .from("product_images")
      .select("product_uid, image_path")
      .in("product_uid", productUids)
      .order("display_order", { ascending: true });

    if (thumbnailImages) {
      // Group by product_uid and take first (already ordered by display_order)
      const seenUids = new Set<string>();
      for (const img of thumbnailImages) {
        const typedImg = img as { product_uid: string; image_path: string };
        if (!seenUids.has(typedImg.product_uid)) {
          seenUids.add(typedImg.product_uid);
          thumbnailMap.set(typedImg.product_uid, typedImg.image_path);
        }
      }
    }
  }

  // Build result array with thumbnails
  // IMPORTANT: Return ALL products regardless of image existence
  for (const product of typedProducts) {
    let thumbnailUrl: string;
    
    // Try main_image_path first
    if (product.main_image_path) {
      thumbnailUrl = getPublicUrl("products", product.main_image_path);
    } else {
      // If no main image, try to get from product_images
      const thumbnailPath = thumbnailMap.get(product.uid);
      if (thumbnailPath) {
        thumbnailUrl = getPublicUrl("products", thumbnailPath);
      } else {
        // No images at all - use fallback (getPublicUrl handles null)
        thumbnailUrl = getPublicUrl("products", null);
      }
    }

    // Always include product, even if no images exist
    productsWithThumbnails.push({
      ...product,
      strike_price: product.strike_price ?? null,
      sale_price: product.sale_price ?? null,
      on_sale: product.on_sale ?? false,
      thumbnail_url: thumbnailUrl,
    });
  }

  return {
    products: productsWithThumbnails,
    total: count || 0,
    page,
    limit,
    hasMore: offset + limit < (count || 0),
  };
}
