"use client";

import React, { useState, useRef } from "react";
import { Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { AdminButton } from "@/components/admin/AdminButton";

export type VariantType = {
  sku: string;
  stock: number;
  color: string;
  size: string;
};

interface VariantStockRowProps {
  variant: VariantType;
  productUid: string;
  onStockUpdated: (sku: string, newStock: number) => void;
}

export function VariantStockRow({ variant, productUid, onStockUpdated }: VariantStockRowProps) {
  const [stockValue, setStockValue] = useState(variant.stock.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStock, setPendingStock] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastWithCompat();

  const handleEdit = () => {
    setIsEditing(true);
    // Focus input on next tick
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    setStockValue(variant.stock.toString());
    setIsEditing(false);
  };

  const handleSave = async () => {
    const newStock = parseInt(stockValue, 10);

    if (isNaN(newStock) || newStock < 0) {
      addToast("Stock must be a non-negative number", "error");
      return;
    }

    // Check for large reduction (> 50%)
    if (variant.stock > 0 && newStock < variant.stock * 0.5) {
      setPendingStock(newStock);
      setShowConfirm(true);
      return;
    }

    await executeSave(newStock);
  };

  const executeSave = async (newStock: number) => {
    setIsSaving(true);
    setShowConfirm(false); // Close modal if open

    try {
      // Optimistic UI update implicitly handled by not reverting yet
      
      const response = await fetch(`/api/admin/products/${productUid}/variants/${encodeURIComponent(variant.sku)}/stock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stock: newStock }),
        credentials: "include", // Important for Supabase cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update stock");
      }

      // Success
      onStockUpdated(variant.sku, newStock);
      setIsEditing(false);
      addToast(`Stock updated for ${variant.sku}`, "success");
    } catch (error: any) {
      console.error("Stock update error:", error);
      addToast(error.message || "Network error", "error");
      setStockValue(variant.stock.toString()); // Revert
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string during edit, or numbers
    if (val === "" || /^\d+$/.test(val)) {
      // Prevent leading zeros unless it is "0"
      if (val.length > 1 && val.startsWith("0")) {
        setStockValue(val.replace(/^0+/, ""));
      } else {
        setStockValue(val);
      }
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {isEditing ? (
          <div className="flex items-center gap-1 animate-in fade-in duration-200">
            <input
              ref={inputRef}
              type="text"
              value={stockValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="w-20 px-2 py-1 text-sm border border-silver-light rounded focus:border-gold focus:ring-1 focus:ring-gold outline-none text-center"
              disabled={isSaving}
              aria-label={`Edit stock for ${variant.sku}`}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
              title="Save"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div 
            className="flex items-center cursor-pointer group" 
            onClick={handleEdit}
            title="Click to edit"
          >
            <span className={cn(
              "text-sm font-medium px-2 py-1 rounded border border-transparent group-hover:border-silver-light group-hover:bg-offwhite transition-all min-w-[3rem] text-center",
              variant.stock === 0 ? "text-red-600 bg-red-50 border-red-100" : 
              variant.stock <= 5 ? "text-orange-600 bg-orange-50 border-orange-100" : "text-night"
            )}>
              {variant.stock}
            </span>
            {variant.stock === 0 && (
              <span className="ml-2 text-[10px] font-medium text-red-600 uppercase tracking-wider">Out of Stock</span>
            )}
            {variant.stock > 0 && variant.stock <= 5 && (
              <span className="ml-2 text-[10px] font-medium text-orange-600 uppercase tracking-wider">Low Stock</span>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Large Reductions */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Large Stock Reduction
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-silver-dark">
              You are reducing stock from <span className="font-bold text-night">{variant.stock}</span> to <span className="font-bold text-night">{pendingStock}</span>.
            </p>
            <p className="text-sm text-silver-dark mt-2">
              This is a significant decrease ({Math.round(((variant.stock - (pendingStock || 0)) / variant.stock) * 100)}%). Are you sure this is correct?
            </p>
          </div>
          <DialogFooter>
            <AdminButton variant="outline" onClick={() => setShowConfirm(false)}>Cancel</AdminButton>
            <AdminButton variant="danger" onClick={() => pendingStock !== null && executeSave(pendingStock)}>
              Confirm Update
            </AdminButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


