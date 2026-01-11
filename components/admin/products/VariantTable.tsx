"use client";

import React, { useState } from "react";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminButton } from "@/components/admin/AdminButton";
import { RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type VariantItem = {
  sku: string;
  color: string;
  size: string;
  stock: number;
  price?: number;
  active?: boolean;
};

interface VariantTableProps {
  variants: VariantItem[];
  onGenerate: () => void;
  isGenerating?: boolean;
  readOnly?: boolean;
}

export function VariantTable({ variants, onGenerate, isGenerating = false, readOnly = false }: VariantTableProps) {
  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <AdminButton 
            onClick={onGenerate} 
            isLoading={isGenerating}
            icon={RefreshCw}
            variant="outline"
          >
            Generate / Refresh Variants
          </AdminButton>
        </div>
      )}

      <div className="bg-white rounded-lg border border-silver-light overflow-hidden">
        <AdminTable headers={["SKU", "Color", "Size", "Stock", "Status"]}>
          {variants.map((variant, idx) => (
            <tr key={idx} className="border-b border-silver-light last:border-0 hover:bg-offwhite/30">
              <td className="px-6 py-3 text-xs font-mono text-silver-darker">{variant.sku}</td>
              <td className="px-6 py-3 text-sm text-night">{variant.color}</td>
              <td className="px-6 py-3 text-sm text-night">{variant.size}</td>
              <td className="px-6 py-3 text-sm text-night font-medium">{variant.stock}</td>
              <td className="px-6 py-3">
                <span className={cn(
                  "w-2 h-2 rounded-full inline-block mr-2",
                  variant.active !== false ? "bg-green-500" : "bg-gray-300"
                )} />
                <span className="text-xs text-silver-dark">
                  {variant.active !== false ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
          {variants.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-silver-dark">
                No variants generated yet.
              </td>
            </tr>
          )}
        </AdminTable>
      </div>
      
      {!readOnly && variants.length > 0 && (
        <p className="text-xs text-silver-dark italic text-right">
          * Stock management is handled in the Inventory section.
        </p>
      )}
    </div>
  );
}


