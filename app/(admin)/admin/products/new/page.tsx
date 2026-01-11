import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { AddProductClient } from "@/app/(admin)/admin/super/products/add/AddProductClient";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getEnumValues } from "@/lib/importer/helpers";

export const metadata = {
  title: "New Product | Admin",
};

async function getFormData() {
  const supabase = createServiceRoleClient();
  
  // Fetch categories (super categories = where parent_id is null)
  const { data: superCategories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .is("parent_id", null)
    .order("name");
  
  // Fetch all categories for subcategories
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("name");
  
  // Fetch enum values
  const [occasions, seasons] = await Promise.all([
    getEnumValues("z_occasion"),
    getEnumValues("z_season"),
  ]);
  
  return {
    superCategories: (superCategories || []) as Array<{ id: string; name: string; slug: string }>,
    allCategories: (allCategories || []) as Array<{ id: string; name: string; slug: string; parent_id: string | null }>,
    occasions: occasions || [],
    seasons: seasons || [],
  };
}

export default async function NewProductPage() {
  await requireSuperAdmin();
  const formData = await getFormData();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="serif-display text-3xl text-night">Add Product</h1>
        <p className="sans-base text-silver-dark mt-1">
          Create a new product with variants and images.
        </p>
      </div>

      <AddProductClient initialFormData={formData} />
    </div>
  );
}
