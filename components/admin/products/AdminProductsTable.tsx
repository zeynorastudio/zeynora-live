"use client";

import { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/Badge";
import { Eye } from "lucide-react";
import Image from "next/image";
import { AdminButton } from "@/components/admin/AdminButton";
import AdminProductDetailDrawer from "./AdminProductDetailDrawer";
import "@/styles/admin-products.css";

interface ProductRow {
  uid: string;
  name: string;
  slug: string;
  price: number;
  main_image: string | null;
  category: string | null;
  active: boolean;
  featured: boolean;
  best_selling: boolean;
  // Detailed props passed for drawer
  subcategory: string | null;
  style: string | null;
  occasion: string | null;
  season: string | null;
  tags: string[] | null;
  metadata: any;
  variants: any[];
  images: any[];
}

interface AdminProductsTableProps {
  products: ProductRow[];
  isSuperAdmin: boolean;
}

export function AdminProductsTable({ products, isSuperAdmin }: AdminProductsTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleViewProduct = (product: ProductRow) => {
    // Convert ProductRow to AdminCatalogItem format
    const catalogItem = {
      uid: product.uid,
      name: product.name,
      slug: product.slug,
      active: product.active,
      category: product.category,
      variants: product.variants || [],
    };
    setSelectedProduct(catalogItem as any);
    setIsDrawerOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-silver-light shadow-sm overflow-hidden">
        <AdminTable headers={["Product", "UID", "Category", "Price", "Status", "Tags", "Actions"]}>
          {products.map((product) => (
            <tr key={product.uid} className="group border-b border-silver-light last:border-0 hover:bg-offwhite/50 transition-colors">
              {/* Product: Image + Name */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 relative rounded bg-offwhite border border-silver-light overflow-hidden flex-shrink-0">
                     {product.main_image ? (
                       <Image src={product.main_image} alt={product.name} fill className="object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-[8px] text-silver-dark">No Img</div>
                     )}
                  </div>
                  <span className="text-sm font-medium text-night truncate max-w-[200px]">{product.name}</span>
                </div>
              </td>

              {/* UID */}
              <td className="px-6 py-4 text-xs font-mono text-silver-darker">
                {product.uid}
              </td>

              {/* Category */}
              <td className="px-6 py-4 text-sm text-silver-darker">
                {product.category || "—"}
              </td>

              {/* Price */}
              <td className="px-6 py-4 text-sm font-medium text-night">
                ₹{product.price.toLocaleString()}
              </td>

              {/* Status */}
              <td className="px-6 py-4">
                <Badge variant={product.active ? "success" : "secondary"} className="capitalize">
                  {product.active ? "Active" : "Inactive"}
                </Badge>
              </td>

              {/* Tags (Best Seller / Featured) */}
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {product.featured && <Badge className="bg-gold/10 text-gold-darker border-gold/20 text-[10px] px-1.5 py-0.5">Featured</Badge>}
                  {product.best_selling && <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] px-1.5 py-0.5">Best Seller</Badge>}
                  {!product.featured && !product.best_selling && <span className="text-silver-light text-xs">—</span>}
                </div>
              </td>

              {/* Actions */}
              <td className="px-6 py-4">
                <AdminButton 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => handleViewProduct(product)}
                  title="View Details"
                >
                  <Eye className="w-4 h-4 text-silver-dark" />
                </AdminButton>
              </td>
            </tr>
          ))}

          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-silver-dark">
                No products found.
              </td>
            </tr>
          )}
        </AdminTable>
      </div>

      <AdminProductDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        product={selectedProduct}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
}


