import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect, notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import ProductEditorForm from "./components/ProductEditorForm";

// Type for category data
interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
}

// Type for product variant with joined data
interface ProductVariant {
  sku: string;
  stock: number;
  price: number;
  active: boolean;
  color_id: number;
  size_id: number;
  colors?: { name: string };
  sizes?: { code: string };
}

// Type for product data from database
interface Product {
  uid: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  subcategory: string | null;
  super_category: string | null;
  active: boolean;
  featured: boolean;
  best_selling: boolean;
  new_launch: boolean;
  on_sale: boolean;
  price: number;
  strike_price: number | null;
  sort_order: number | null;
  style: string | null;
  occasion: string | null;
  product_variants: ProductVariant[];
}

export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // 1. Resolve route params
  const resolvedParams = await params;
  const { uid } = resolvedParams;

  // 2. Validate UID
  if (!uid || typeof uid !== "string" || uid.trim().length === 0) {
    notFound();
  }

  // 3. Check admin session
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  // 4. Create Supabase client with service role for admin operations
  const supabase = createServiceRoleClient();

  // 5. Fetch product by UID with variants
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(`
      uid,
      name,
      slug,
      description,
      category_id,
      subcategory,
      super_category,
      active,
      featured,
      best_selling,
      new_launch,
      on_sale,
      price,
      strike_price,
      sort_order,
      style,
      occasion,
      product_variants (
        sku,
        stock,
        price,
        active,
        color_id,
        size_id,
        colors (name),
        sizes (code)
      )
    `)
    .eq("uid", uid.trim())
    .single();

  // 6. Handle product not found
  if (productError || !product) {
    console.error("[ProductEditorPage] Product fetch error:", {
      uid,
      error: productError?.message,
      code: productError?.code,
    });
    notFound();
  }

  // 7. Fetch all categories for the selector
  const { data: allCategories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name");

  if (categoriesError) {
    console.error("[ProductEditorPage] Categories fetch error:", categoriesError.message);
  }

  // 8. Derive leaf and parent categories
  const categories = (allCategories || []) as Category[];
  const parentIds = new Set(
    categories.filter((cat) => cat.parent_id).map((cat) => cat.parent_id)
  );
  const leafCategories = categories.filter((cat) => !parentIds.has(cat.id));
  const parentCategories = categories.filter((cat) => !cat.parent_id);

  // 9. Render form with data
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <ProductEditorForm
        product={product as Product}
        role={session.role}
        leafCategories={leafCategories}
        parentCategories={parentCategories}
      />
    </div>
  );
}
