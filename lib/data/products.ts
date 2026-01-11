// Restoring missing exports based on usage patterns found in search results.
// This file was likely overwritten. Re-implementing core fetchers.

import { createServerClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";
import { getPublicUrl } from "@/lib/utils/images";

export type FilterParams = {
  tag?: string; // Phase 1.2: Filter by tag
  category?: string;
  subcategory?: string;
  fabric?: string;
  work?: string;
  min_price?: number;
  max_price?: number;
  size?: string | string[]; // Size filter
  sort?: "price_asc" | "price_desc" | "newest" | "bestsellers" | "featured" | "best_selling" | "new_launch";
  page?: number;
  limit?: number;
  q?: string; // Search query
  featured?: boolean;
  best_selling?: boolean;
  new_launch?: boolean;
  sale?: boolean;
  uids?: string[]; // Phase 2: Filter by specific UIDs (Wishlist)
};

export async function getProducts(params: FilterParams = {}) {
  const supabase = await createServerClient();
  
  // Select products with category name and lightweight variant data for size selector
  // Use left join (!) instead of inner join (!inner) to include products without variants
  let query = supabase
    .from("products")
    .select(`
      *,
      categories:category_id (
        name,
        slug
      ),
      product_variants (
        id,
        sku,
        size_id,
        stock,
        price,
        active,
        sizes (
          code
        )
      )
    `, { count: "exact" })
    .eq("active", true);

  // UID filter (Phase 2: Wishlist)
  if (params.uids && params.uids.length > 0) {
    query = query.in("uid", params.uids);
  }

  // Tag filter (Phase 1.2)
  if (params.tag) {
    query = query.contains("tags", [params.tag]);
  }
  
  // Flag filters
  if (params.featured) query = query.eq("featured", true);
  if (params.best_selling) query = query.eq("best_selling", true);
  if (params.new_launch) query = query.eq("new_launch", true);
  if (params.sale) query = query.eq("on_sale", true);

  // Category filter - need to resolve slug to ID first
  if (params.category) {
    // Fetch category ID from slug
    const { createServerClient } = await import("@/lib/supabase/server");
    const categorySupabase = await createServerClient();
    const { data: categoryData } = await categorySupabase
      .from("categories")
      .select("id")
      .eq("slug", params.category)
      .single();
    
    if (categoryData) {
      // Filter by category_id (subcategory) or get all subcategories under this parent
      // Since products belong to subcategories, we need to get all subcategories under this category
      const { data: subcategories } = await categorySupabase
        .from("categories")
        .select("id")
        .eq("parent_id", categoryData.id);
      
      const subcategoryIds = subcategories?.map(s => s.id) || [];
      if (subcategoryIds.length > 0) {
        // Get category_id from products table - this should be subcategory_id
        query = query.in("category_id", subcategoryIds);
      } else {
        // If no subcategories, check if this category itself is used (shouldn't happen per rules, but defensive)
        query = query.eq("category_id", categoryData.id);
      }
    }
  }

  // Subcategory filter
  if (params.subcategory) {
    const { createServerClient } = await import("@/lib/supabase/server");
    const categorySupabase = await createServerClient();
    const { data: subcategoryData } = await categorySupabase
      .from("categories")
      .select("id")
      .eq("slug", params.subcategory)
      .single();
    
    if (subcategoryData) {
      query = query.eq("category_id", subcategoryData.id);
    }
  }

  if (params.min_price) query = query.gte("price", params.min_price);
  if (params.max_price) query = query.lte("price", params.max_price);

  // Size filter - filter products that have variants with stock > 0 for selected sizes
  if (params.size) {
    // Normalize to array
    const sizeArray = Array.isArray(params.size) ? params.size : [params.size];
    
    if (sizeArray.length > 0) {
      // First, get product UIDs that have variants with the selected sizes and stock > 0
      const { createServerClient } = await import("@/lib/supabase/server");
      const sizeSupabase = await createServerClient();
      
      // Get size IDs from size codes
      const { data: sizeData } = await sizeSupabase
        .from("sizes")
        .select("id")
        .in("code", sizeArray);
    
    if (sizeData && sizeData.length > 0) {
      const sizeIds = sizeData.map(s => s.id);
      
      // Get product UIDs that have variants with these sizes and stock > 0
      const { data: variantData } = await sizeSupabase
        .from("product_variants")
        .select("product_uid")
        .in("size_id", sizeIds)
        .gt("stock", 0)
        .eq("active", true);
      
      if (variantData && variantData.length > 0) {
        const productUids = [...new Set(variantData.map((v: any) => v.product_uid))];
        query = query.in("uid", productUids);
      } else {
        // No products match the size filter, return empty result
        query = query.eq("uid", "NO_MATCH");
      }
    } else {
      // Invalid size codes, return empty result
      query = query.eq("uid", "NO_MATCH");
    }
    }
  }

  // Search
  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  }

  // Sort (Phase 1.2)
  // When a sort option is selected, it overrides admin order
  // Otherwise, default to admin order (sort_order ASC, created_at DESC)
  if (params.sort === "featured") {
    query = query.eq("featured", true).order("sort_order", { ascending: true, nullsFirst: false });
  } else if (params.sort === "best_selling") {
    query = query.eq("best_selling", true).order("sort_order", { ascending: true, nullsFirst: false });
  } else if (params.sort === "new_launch") {
    query = query.eq("new_launch", true).order("created_at", { ascending: false });
  } else if (params.sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (params.sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else if (params.sort === "bestsellers") {
    query = query.eq("best_selling", true);
    // Still apply admin order as secondary sort
    query = query.order("sort_order", { ascending: true, nullsFirst: false });
    query = query.order("created_at", { ascending: false });
  } else {
    // Default Sort: Admin order (sort_order ASC, created_at DESC)
    query = query.order("sort_order", { ascending: true, nullsFirst: false }); // Default 999
    query = query.order("created_at", { ascending: false });
  }

  // Pagination
  if (params.page && params.limit) {
    const from = (params.page - 1) * params.limit;
    const to = from + params.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  
  if (error) {
    console.error("getProducts error:", error);
    return { products: [], totalCount: 0 };
  }
  
  // Transform products to include variant data in a structured format
  const transformedProducts = (data || []).map((product: any) => {
    // Filter only active variants
    const activeVariants = (product.product_variants || []).filter((v: any) => v.active !== false);
    
    // Group variants by size code
    const variantsBySize = new Map<string, Array<{
      id: string;
      sku: string | null;
      stock: number;
      price: number | null;
    }>>();
    
    activeVariants.forEach((v: any) => {
      const sizeCode = v.sizes?.code || "OS";
      if (!variantsBySize.has(sizeCode)) {
        variantsBySize.set(sizeCode, []);
      }
      variantsBySize.get(sizeCode)!.push({
        id: v.id,
        sku: v.sku || null,
        stock: v.stock || 0,
        price: v.price,
      });
    });
    
    // Convert to array format expected by ProductCard
    const sizes = Array.from(variantsBySize.entries()).map(([code, variants]) => ({
      code,
      label: null,
      variants,
    })).sort((a, b) => {
      // Sort by display_order if available, otherwise by code
      const order = ["M", "L", "XL", "XXL", "XXXL"];
      const aIndex = order.indexOf(a.code);
      const bIndex = order.indexOf(b.code);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.code.localeCompare(b.code);
    });
    
    return {
      ...product,
      variants: sizes,
    };
  });
  
  return { products: transformedProducts, totalCount: count || 0 };
}

export async function getProductBySlug(slug: string) {
  const supabase = await createServerClient();
  
  // Fetch product with variants
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_variants (
        id,
        sku,
        color_id,
        size_id,
        stock,
        price,
        active,
        images,
        colors (name),
        sizes (code)
      )
    `)
    .eq("slug", slug)
    .single();
    
  if (error || !data) return null;
  
  const typedData = data as any;
  
  // Fetch product images separately with proper ordering by display_order
  const { data: productImagesData } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_uid", typedData.uid)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  
  // Merge variant images by SKU (use first non-empty images array per SKU)
  const variantImageMap = new Map<string, string[]>();
  const variantImages: Array<{ sku: string; images: string[] }> = [];
  
  (typedData.product_variants || []).forEach((v: any) => {
    if (v.sku && v.images && Array.isArray(v.images) && v.images.length > 0) {
      if (!variantImageMap.has(v.sku)) {
        variantImageMap.set(v.sku, v.images);
        variantImages.push({ sku: v.sku, images: v.images });
      }
    }
  });
  
  // Main product image FIRST (if exists)
  const mainImage = typedData.main_image_path
    ? [{
        url: getPublicUrl("products", typedData.main_image_path),
        alt: typedData.name,
        type: "main",
        sku: null,
        displayOrder: 0,
      }]
    : [];
  
  // Collect all product-level images from product_images table (now ordered)
  // Exclude main_image_path if it's already in product_images
  const mainImageUrl = typedData.main_image_path ? getPublicUrl("products", typedData.main_image_path) : null;
  const productImages = (productImagesData || [])
    .filter((img: any) => {
      const imgUrl = getPublicUrl("products", img.image_path);
      return imgUrl !== mainImageUrl; // Exclude if it's the main image
    })
    .map((img: any) => {
      const imageUrl = getPublicUrl("products", img.image_path);
      return {
        url: imageUrl,
        alt: img.alt_text || typedData.name,
        type: img.type || undefined,
        sku: img.variant_sku || null, // May be variant-specific
        displayOrder: img.display_order ?? 999,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
  
  // Variant images AFTER main and product images
  const variantImageUrls = variantImages.flatMap(vi => 
    vi.images.map((imgUrl: string) => ({
      url: getPublicUrl("products", imgUrl),
      alt: `${typedData.name} - ${vi.sku}`,
      type: undefined,
      sku: vi.sku, // Mark as variant-specific
      displayOrder: 999,
    }))
  );
  
  // Merge: Main image FIRST, then product images, then variant images
  const allImages = [
    ...mainImage,
    ...productImages,
    ...variantImageUrls,
  ];
  
  // Remove duplicates based on URL
  const uniqueImages = allImages.filter((img, index, self) => 
    index === self.findIndex(i => i.url === img.url)
  );
  
  return {
    uid: typedData.uid,
    name: typedData.name,
    slug: typedData.slug,
    description: typedData.description || null,
    price: typedData.price,
    category: typedData.category_id ? (typedData.categories?.slug || null) : null,
    main_image_path: typedData.main_image_path || null,
    images: uniqueImages,
    variants: (typedData.product_variants || []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      color: v.colors?.name || undefined,
      size: v.sizes?.code || undefined,
      stock: v.stock || 0,
      price: v.price || typedData.price,
      active: v.active !== false,
      images: v.images || [], // Include variant images for client-side filtering
    })),
    tags: typedData.tags || [],
    fabric_care: typedData.metadata?.fabric_care || null,
  };
}

// Re-export getFilterOptions if it was there
export async function getFilterOptions() {
  return unstable_cache(
    async () => {
      const supabase = await createServerClient();
      const [colors, sizes, products] = await Promise.all([
        supabase.from("colors").select("name, slug, hex_code").order("name"),
        supabase.from("sizes").select("code, label").order("code"),
        supabase.from("products").select("tags").eq("active", true),
      ]);

      const allTags = new Set<string>();
      const typedProducts = (products.data || []) as Array<{ tags?: string[] | null }>;
      typedProducts.forEach(p => {
        if (p.tags) p.tags.forEach((t: string) => allTags.add(t));
      });
      
      const fabrics = Array.from(allTags).filter(t => ["Silk", "Cotton", "Georgette", "Chiffon", "Linen", "Velvet", "Organza"].includes(t));
      const works = Array.from(allTags).filter(t => ["Handwoven", "Embroidered", "Printed", "Zari", "Banarasi", "Kanjivaram"].includes(t));

      return {
        colors: colors.data || [],
        sizes: sizes.data || [],
        fabrics: fabrics.length > 0 ? fabrics : ["Silk", "Cotton", "Georgette", "Chiffon", "Linen", "Velvet"],
        works: works.length > 0 ? works : ["Handwoven", "Embroidered", "Printed", "Zari"],
        priceRange: { min: 0, max: 100000 }
      };
    },
    ["filter-options"],
    { tags: ["products", "colors", "sizes"] }
  )();
}

export async function getBestSellers() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("is_best_selling", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(8);
  return data || [];
}

export async function getNewArrivals() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true }) // Secondary sort here? Or primary? 
    // Prompt says "Every query must now end with...". 
    // For "New Arrivals", created_at IS the sort. But let's respect the rule as secondary or fallback.
    .limit(8);
  return data || [];
}

// Types needed for other components
export type ProductCardData = {
  uid: string;
  name: string;
  slug: string;
  price: number;
  main_image: string | null;
  // ... other fields
};

export type ProductDetailData = {
  uid: string;
  name: string;
  slug: string;
  price: number;
  description?: string | null;
  variants: Array<{
    id: string;
    sku?: string;
    price?: number;
    stock?: number;
    [key: string]: any;
  }>;
  [key: string]: any;
};
