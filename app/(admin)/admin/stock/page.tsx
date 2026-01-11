import { getAdminCatalog } from "@/lib/data/admin/catalog";
import VariantTable from "@/components/admin/stock/VariantTable";
import AdminContainer from "@/components/admin/AdminContainer";

export const revalidate = 0; // Always fresh for stock management

export default async function AdminStockPage() {
  const products = await getAdminCatalog();

  return (
    <AdminContainer
      title="Stock Manager"
      description="Manage inventory levels for all product variants."
    >
      <div className="space-y-8">
        {products.map((product) => (
          <div key={product.uid} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-night serif-display tracking-wide">
                  {product.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {product.category}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    product.active ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {product.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {product.variants.length} variants
              </div>
            </div>

            <div className="p-0">
              <VariantTable 
                product_uid={product.uid} 
                variants={product.variants} 
              />
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            No products found in catalog.
          </div>
        )}
      </div>
    </AdminContainer>
  );
}
