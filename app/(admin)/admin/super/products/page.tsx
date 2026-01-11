import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { ProductsListClient } from "./ProductsListClient";
import { getProducts } from "@/lib/products/list";

export const metadata = {
  title: "Products | Super Admin",
};

export default async function SuperAdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  await requireSuperAdmin();

  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1", 10);
  const search = resolvedParams.search || undefined;

  const { products, total, hasMore } = await getProducts({
    page,
    limit: 20,
    search,
    orderBy: "sort_order",
    orderDirection: "desc",
  });

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="serif-display text-3xl text-night">Products</h1>
          <p className="sans-base text-silver-dark mt-1">
            Manage products, variants, and inventory.
          </p>
        </div>
        <a
          href="/admin/super/products/add"
          className="px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors"
        >
          Add Product
        </a>
      </div>

      <ProductsListClient initialProducts={products} initialTotal={total} initialPage={page} initialHasMore={hasMore} />
    </div>
  );
}
