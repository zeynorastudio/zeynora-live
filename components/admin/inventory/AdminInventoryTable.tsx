"use client";

import React, { useState, useMemo } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { VariantStockRow, VariantType } from "./VariantStockRow";
import { Search, Filter } from "lucide-react";
import Image from "next/image";

export type ProductWithVariants = {
  uid: string;
  name: string;
  main_image: string | null;
  variants: VariantType[];
};

interface AdminInventoryTableProps {
  initialProducts: ProductWithVariants[];
}

export function AdminInventoryTable({ initialProducts }: AdminInventoryTableProps) {
  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");

  // Handle stock update from child row
  const handleStockUpdate = (productUid: string, sku: string, newStock: number) => {
    setProducts((prev) => 
      prev.map((p) => {
        if (p.uid !== productUid) return p;
        return {
          ...p,
          variants: p.variants.map((v) => 
            v.sku === sku ? { ...v, stock: newStock } : v
          )
        };
      })
    );
  };

  // Filter Logic
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lowerTerm = searchTerm.toLowerCase();
    
    return products.filter((p) => {
      // Check product name
      if (p.name.toLowerCase().includes(lowerTerm)) return true;
      // Check variants
      return p.variants.some(v => 
        v.sku.toLowerCase().includes(lowerTerm)
      );
    }).map(p => {
      // Optional: Filter variants inside product if we want strict view, 
      // OR show all variants of matched product. 
      // Let's show all variants if product matches, or only matched variants if searched by SKU.
      // For simplicity, we keep full product if ANY match found.
      return p;
    });
  }, [products, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-silver-light shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <input
            type="text"
            placeholder="Search by Product Name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-silver-light rounded-lg bg-offwhite focus:outline-none focus:ring-2 focus:ring-gold/50 focus:bg-white transition-all placeholder:text-silver-dark"
          />
        </div>
        <div className="text-sm text-silver-dark">
          Showing {filteredProducts.length} products
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-silver-light shadow-sm overflow-hidden">
        <AdminTable headers={["Product", "SKU", "Color", "Size", "Stock Level", "Actions"]}>
          {filteredProducts.map((product) => (
            <React.Fragment key={product.uid}>
              {/* We render rows for each variant. First variant row includes Product Info rowspan? 
                  Or simple flat list. Flat list is easier for sorting/filtering but grouping by product looks better.
                  Let's render a row per variant but keep product info repeated or grouped visually.
              */}
              {product.variants.map((variant, vIdx) => (
                <tr key={variant.sku} className="hover:bg-offwhite/30 border-b border-silver-light last:border-0">
                  {/* Product Column - Only show on first variant or repeat nicely */}
                  <td className="px-6 py-4">
                    {vIdx === 0 && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 relative rounded bg-offwhite border border-silver-light overflow-hidden flex-shrink-0">
                          {product.main_image ? (
                            <Image src={product.main_image} alt={product.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-silver-dark">No Img</div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-night truncate max-w-[150px]" title={product.name}>
                          {product.name}
                        </span>
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-xs font-mono text-silver-darker">{variant.sku}</td>
                  <td className="px-6 py-4 text-sm text-silver-darker">{variant.color || "—"}</td>
                  <td className="px-6 py-4 text-sm text-silver-darker">{variant.size || "—"}</td>
                  
                  {/* Stock Edit Cell */}
                  <td className="px-6 py-4">
                    <VariantStockRow 
                      variant={variant} 
                      productUid={product.uid} 
                      onStockUpdated={(sku, val) => handleStockUpdate(product.uid, sku, val)}
                    />
                  </td>

                  <td className="px-6 py-4 text-xs text-silver-light">
                    {/* Future actions like history could go here */}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}

          {filteredProducts.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-silver-dark">
                No products found matching your search.
              </td>
            </tr>
          )}
        </AdminTable>
      </div>
    </div>
  );
}


