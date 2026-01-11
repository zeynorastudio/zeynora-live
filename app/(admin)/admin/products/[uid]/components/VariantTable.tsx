"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Check, X, Edit2 } from "lucide-react";

interface Variant {
  sku: string;
  stock: number;
  price: number;
  color_id: number; // Ideally join name
  size_id: number;  // Ideally join code
  // We need joined data for display
  colors?: { name: string };
  sizes?: { code: string };
  active: boolean;
}

interface VariantTableProps {
  uid: string;
  variants: Variant[];
  role: string;
}

export default function VariantTable({ uid, variants, role }: VariantTableProps) {
  // State for editable stock
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState(0);
  const { addToast } = useToastWithCompat();

  // Sort by SKU or Color/Size
  const sorted = [...variants].sort((a, b) => a.sku.localeCompare(b.sku));

  const startEdit = (v: Variant) => {
    setEditingSku(v.sku);
    setStockValue(v.stock);
  };

  const saveStock = async (sku: string) => {
    try {
      const res = await fetch(`/api/admin/products/${uid}/variants/${sku}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: stockValue }),
      });
      
      if (!res.ok) throw new Error("Failed");
      
      addToast("Stock updated", "success");
      setEditingSku(null);
      // Ideally refresh variants data here or optimistic update parent
      window.location.reload(); // Simple refresh for now
    } catch (e) {
      addToast("Update failed", "error");
    }
  };

  return (
    <div className="overflow-x-auto border border-silver-light rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="bg-offwhite text-silver-darker uppercase text-xs font-bold tracking-wider border-b border-silver-light">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Color</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Stock</th>
            <th className="px-4 py-3 text-center">Active</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-silver-light bg-white">
          {sorted.map((v) => (
            <tr key={v.sku} className="hover:bg-offwhite/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
              <td className="px-4 py-3">{v.colors?.name || "—"}</td>
              <td className="px-4 py-3">{v.sizes?.code || "—"}</td>
              <td className="px-4 py-3 text-right">₹{v.price}</td>
              <td className="px-4 py-3 text-right font-bold">
                {editingSku === v.sku ? (
                  <div className="flex items-center justify-end gap-2">
                    <input 
                      type="number" 
                      className="w-16 p-1 border rounded text-right"
                      value={stockValue}
                      onChange={(e) => setStockValue(parseInt(e.target.value) || 0)}
                    />
                  </div>
                ) : (
                  <span className={v.stock < 5 ? "text-red-600" : "text-green-600"}>
                    {v.stock}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {v.active ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-red-400 mx-auto" />}
              </td>
              <td className="px-4 py-3 text-right">
                {editingSku === v.sku ? (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => saveStock(v.sku)} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingSku(null)} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(v)} className="text-silver-dark hover:text-gold transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-silver-dark italic">
                No variants generated yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

