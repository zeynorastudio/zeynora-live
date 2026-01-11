import { createServiceRoleClient } from "@/lib/supabase/server";
import { HomepageConfig } from "./types";
import { getAdminSession } from "@/lib/auth/getAdminSession";

const PRODUCT_SELECT =
  "uid, name, slug, price, main_image_path, category_id";

async function fetchAutomaticProducts(
  supabase: ReturnType<typeof createServiceRoleClient>,
  section: any,
) {
  const limit = section.product_count || 8;
  const type = section.source_meta?.automatic_type;

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true);

  // Track if we need special ordering for this type
  let useCreatedAtPrimarySort = false;

  switch (type) {
    case "best_selling":
      query = query.eq("best_selling", true);
      break;
    case "featured":
      query = query.eq("featured", true);
      break;
    case "new_launch":
      // New Launch: order by created_at DESC as primary sort
      query = query.eq("new_launch", true);
      useCreatedAtPrimarySort = true;
      break;
    case "newest":
      useCreatedAtPrimarySort = true;
      break;
    case "on_sale":
      query = query.eq("on_sale", true);
      break;
    case "price_range":
      if (section.source_meta?.price_min !== undefined) {
        query = query.gte("price", section.source_meta.price_min);
      }
      if (section.source_meta?.price_max !== undefined) {
        query = query.lte("price", section.source_meta.price_max);
      }
      break;
    default:
      useCreatedAtPrimarySort = true;
      break;
  }

  // Apply ordering based on type
  if (useCreatedAtPrimarySort) {
    // For new_launch and newest: created_at DESC is primary, sort_order is secondary
    query = query
      .order("created_at", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(limit);
  } else {
    // For other types: sort_order ASC is primary, created_at DESC is secondary
    query = query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  const typedData = (data || []) as Array<{ uid: string }>;
  return typedData.map((product, index) => ({
    id: `${section.id}-auto-${product.uid}`,
    section_id: section.id,
    product_id: product.uid,
    order_index: index,
    product,
  }));
}

/**
 * Fetches the homepage configuration based on the context.
 * 
 * @param isPreviewMode - If true, fetches 'draft' items. Requires super_admin.
 * @returns HomepageConfig object populated with data.
 */
export async function getHomepageConfig(isPreviewMode: boolean = false): Promise<HomepageConfig> {
  const supabase = createServiceRoleClient();
  
  // Default to 'published' unless preview is requested AND user is super_admin
  let statusFilter = 'published';

  if (isPreviewMode) {
    // Verify super_admin for preview
    const session = await getAdminSession();
    if (session && session.role === 'super_admin') {
      statusFilter = 'draft';
    } else {
      // Fallback to published if not authorized for preview
      console.warn("Preview access denied or not authenticated, falling back to published.");
    }
  }

  // Parallel fetch for all sections
  const [hero, categories, sections, banners, settings, saleStrip] = await Promise.all([
    supabase
      .from('homepage_hero')
      .select('*')
      .eq('status', statusFilter)
      .eq('visible', true) // Only visible items even in draft? Usually draft implies seeing everything, but requirement says "Preview mode... shows draft... config". Let's assume visible=true means "enabled to be shown". If I want to preview "hidden" stuff, I might need to relax this.
      // Requirement: "Preview mode... shows draft (unpublished) config". 
      // Let's assume we want to see what WOULD be published. So visible=true is correct. 
      // Actually, in builder we see everything. In preview we see what the site looks like.
      .order('order_index', { ascending: true }),

    supabase
      .from('homepage_categories')
      .select('*, category:categories(name, slug)')
      .eq('status', statusFilter)
      .eq('visible', true)
      .order('order_index', { ascending: true }),

    supabase
      .from('homepage_sections')
      .select('*, products:homepage_section_products(*, product:products(uid, name, slug, price, main_image_path, category_id))')
      .eq('status', statusFilter)
      .eq('visible', true)
      .order('order_index', { ascending: true }),

    supabase
      .from('homepage_banners')
      .select('*')
      .eq('status', statusFilter)
      .eq('visible', true)
      .order('order_index', { ascending: true }),

    supabase
      .from('homepage_settings')
      .select('*')
      .limit(1)
      .single(),

    supabase
      .from('homepage_sale_strips' as any)
      .select('*')
      .eq('status', statusFilter)
      .eq('visible', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  // For sections, we need to sort the products inside them by order_index
  const baseSections = sections.data || [];
  const automaticSections = baseSections.filter(
    (section: any) => section.source_type === "automatic",
  );

  const automaticProducts = await Promise.all(
    automaticSections.map((section: any) =>
      fetchAutomaticProducts(supabase, section),
    ),
  );

  const automaticMap = new Map(
    automaticSections.map((section: any, index: number) => [
      section.id,
      automaticProducts[index],
    ]),
  );

  const sectionsWithProducts = baseSections.map((section: any) => {
    const typedSection = section as {
      id: string;
      source_type: string;
      products?: Array<{ order_index: number }>;
      [key: string]: any;
    };
    
    if (typedSection.source_type === "automatic") {
      return {
        ...typedSection,
        products: automaticMap.get(typedSection.id) || [],
      };
    }
    return {
      ...typedSection,
      products: (typedSection.products || []).sort(
        (a: any, b: any) => a.order_index - b.order_index,
      ),
    };
  });

  // Fetch on_sale products for sale strip if it exists and is visible
  let saleStripWithProducts = saleStrip.data || null;
  if (saleStripWithProducts && saleStripWithProducts.visible) {
    const typedSaleStrip = saleStripWithProducts as { product_ids?: string[] | null };
    const productIds = typedSaleStrip.product_ids || [];
    
    if (productIds.length > 0) {
      // Fetch products in admin-selected order, but only if they're on_sale and active
      const { data: saleProducts } = await supabase
        .from("products")
        .select("uid, name, slug, price, main_image_path")
        .in("uid", productIds)
        .eq("active", true)
        .eq("on_sale", true);
      
      // Sort by admin-selected order (product_ids array order)
      const orderedProducts = (saleProducts || [])
        .filter(p => productIds.includes(p.uid))
        .sort((a, b) => {
          const indexA = productIds.indexOf(a.uid);
          const indexB = productIds.indexOf(b.uid);
          return indexA - indexB;
        })
        .slice(0, 12); // Limit to 12 products
      
      saleStripWithProducts = {
        ...saleStripWithProducts,
        products: orderedProducts,
      };
    } else {
      // Fallback: if no products selected, show empty array
      saleStripWithProducts = {
        ...saleStripWithProducts,
        products: [],
      };
    }
  }

  return {
    hero: hero.data || [],
    categories: categories.data || [],
    sections: sectionsWithProducts as any,
    banners: banners.data || [],
    settings: settings.data || null,
    saleStrip: saleStripWithProducts,
  };
}


