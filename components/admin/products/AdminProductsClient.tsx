"use client";

import React, { useState } from "react";
import { AdminCatalogItem } from "@/lib/data/admin/catalog";
import { Search, Filter, Eye } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AdminButton } from "@/components/admin/AdminButton";
import AdminProductDetailDrawer from "./AdminProductDetailDrawer";

interface AdminProductsClientProps {
  products: AdminCatalogItem[];
  isSuperAdmin: boolean;
}

export function AdminProductsClient({ products, isSuperAdmin }: AdminProductsClientProps) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<AdminCatalogItem | null>(null);

  // Derive categories for filter
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.slug.toLowerCase().includes(search.toLowerCase()) ||
                          p.uid.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-silver-light flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <Input 
            placeholder="Search products by name, slug, or UID..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="h-10 px-3 rounded-md border border-silver-light text-sm bg-white focus:ring-1 focus:ring-gold/50 outline-none w-full md:w-48"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-silver-light overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-offwhite text-silver-darker font-medium uppercase text-xs tracking-wider border-b border-silver-light">
            <tr>
              <th className="px-6 py-3">Product Name</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Variants</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-light">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.uid} className="hover:bg-offwhite/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-night">{product.name}</div>
                    <div className="text-xs text-silver-dark font-mono truncate max-w-[200px]">{product.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-silver-darker">
                    {product.category || "—"}
                  </td>
                  <td className="px-6 py-4 text-silver-darker">
                    {product.variants.length}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={product.active ? "success" : "secondary"}>
                      {product.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <AdminButton 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedProduct(product)}
                      icon={Eye}
                    >
                      View
                    </AdminButton>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-silver-dark">
                  No products found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminProductDetailDrawer 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        product={selectedProduct}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}


