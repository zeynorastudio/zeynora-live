import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { SuperProductForm } from "@/components/admin/products/SuperProductForm";
import { getProductBySlug } from "@/lib/data/products";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/utils/images";

// Helper to fetch full product details by UID directly, bypassing generic helpers if needed for specificity
async function getFullProduct(uid: string) {
  const supabase = await createServerClient();
  
  // Fetch Product
  const { data: product, error } = await supabase
    .from("products")
    .select(`
        *,
        categories (name),
        product_variants (
            sku, color_id, size_id, stock, price, active,
            colors (name),
            sizes (code)
        ),
        product_images (image_path, type, alt_text, display_order)
    `)
    .eq("uid", uid)
    .single();

  if (error || !product) return null;

  // Type assertion
  const typedProduct = product as any;

  // Normalize for Form
  return {
    uid: typedProduct.uid,
    name: typedProduct.name,
    slug: typedProduct.slug,
    price: typedProduct.price,
    cost_price: typedProduct.cost_price || 0,
    category: typedProduct.categories?.name || "", // Just name for now, logic to match ID in selects might need refinement
    subcategory: typedProduct.subcategory || "",
    super_category: typedProduct.super_category || "",
    description: typedProduct.metadata?.description || "",
    style: typedProduct.style || "",
    occasion: typedProduct.occasion || "",
    season: typedProduct.season || "",
    tags: typedProduct.tags || [],
    active: typedProduct.active || false,
    featured: typedProduct.featured || false,
    best_selling: typedProduct.best_selling || false,
    metadata: typedProduct.metadata || {},
    variants: (typedProduct.product_variants || []).map((v: any) => ({
        sku: v.sku,
        color: v.colors?.name || "Unknown",
        size: v.sizes?.code || "OS",
        stock: v.stock || 0,
        active: v.active
    })),
    images: (typedProduct.product_images || []).map((img: any) => ({
        path: img.image_path,
        publicUrl: getPublicUrl("products", img.image_path.replace("supabase://products/", "")),
        type: img.type,
        alt_text: img.alt_text
    }))
  };
}

export default async function EditProductPage({ params }: { params: Promise<{ uid: string }> }) {
  const resolvedParams = await params;
  await requireSuperAdmin();
  const productData = await getFullProduct(resolvedParams.uid);

  return (
    <>
      {productData ? (
          <SuperProductForm mode="edit" initialData={productData} />
      ) : (
          <div className="p-8 text-center text-silver-dark">Product not found</div>
      )}
    </>
  );
}


