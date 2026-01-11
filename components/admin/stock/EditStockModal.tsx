"use client";

import { useState } from "react";
import { EditStockState } from "@/hooks/useEditStock";

interface EditStockModalProps {
  state: EditStockState;
  onClose: () => void;
  onSuccess?: () => void; // Optional callback to refresh page
}

export default function EditStockModal({ state, onClose, onSuccess }: EditStockModalProps) {
  const [newStock, setNewStock] = useState(state.currentStock);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!state.isOpen || !state.productUid || !state.sku) return null;

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/products/${state.productUid}/variants/${state.sku}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: Number(newStock) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update stock");
      }

      // No toast logic yet (placeholder comment)
      // console.log("Stock updated");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h2 className="serif-display text-xl text-night mb-4">Edit Stock</h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
            <span className="text-gray-500">SKU</span>
            <span className="font-medium text-night">{state.sku}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
            <span className="text-gray-500">Color</span>
            <span className="font-medium text-night">{state.color}</span>
          </div>
          <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
            <span className="text-gray-500">Size</span>
            <span className="font-medium text-night">{state.size}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Level
          </label>
          <input
            type="number"
            min="0"
            value={newStock}
            onChange={(e) => setNewStock(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-gold focus:border-gold outline-none transition-shadow"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-gold text-white text-sm font-medium rounded-md hover:bg-gold/90 focus:ring-2 focus:ring-offset-2 focus:ring-gold transition-all disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}



