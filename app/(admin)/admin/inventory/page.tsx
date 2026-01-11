import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminInventoryTable, ProductWithVariants } from "@/components/admin/inventory/AdminInventoryTable";
import { BulkStockUploader } from "@/components/admin/inventory/BulkStockUploader";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicUrl } from "@/lib/utils/images";
import "@/styles/admin-inventory.css";

// Fetch products with simplified variants data for inventory
async function getInventoryProducts(): Promise<ProductWithVariants[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from("products")
    .select(`
      uid,
      name,
      main_image_path,
      product_variants (
        sku,
        stock,
        colors (name),
        sizes (code)
      )
    `)
    // TODO: Admin users can edit stock for all products (active and inactive) to stock before activation
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    uid: p.uid,
    name: p.name,
    main_image: p.main_image_path 
      ? getPublicUrl("products", p.main_image_path.replace("supabase://products/", "")) 
      : null,
    variants: (p.product_variants || []).map((v: any) => ({
      sku: v.sku,
      stock: v.stock ?? 0,
      color: v.colors?.name || "Unknown",
      size: v.sizes?.code || "OS"
    }))
  }));
}

export default async function AdminInventoryPage() {
  await requireAdmin();
  const products = await getInventoryProducts();

  return (
    <div className="space-y-8">
        <div>
          <h1 className="serif-display text-night text-3xl">Inventory Management</h1>
          <p className="sans-base text-silver-dark mt-2">Manage stock levels and bulk updates</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {products.length > 0 ? (
              <AdminInventoryTable initialProducts={products} />
            ) : (
              <div className="p-12 bg-white rounded-xl border border-silver-light text-center">
                <p className="text-silver-dark mb-4">No products found in the database.</p>
                <p className="text-sm text-silver-darker">Upload via CSV to get started.</p>
              </div>
            )}
          </div>

          <div>
            <BulkStockUploader />
          </div>
        </div>
      </div>
  );
}
