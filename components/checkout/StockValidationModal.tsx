"use client";

/**
 * StockValidationModal Component
 * 
 * Displays stock validation errors when checkout is attempted with invalid quantities.
 * Shows SKU, requested quantity, and available quantity for each invalid item.
 * Provides "Update Cart" button to auto-correct quantities.
 */

import React from "react";
import { X, AlertTriangle } from "lucide-react";

export interface StockValidationError {
  sku: string;
  requested_quantity: number;
  available_quantity: number;
  reason: "INSUFFICIENT_STOCK" | "VARIANT_NOT_FOUND";
}

interface StockValidationModalProps {
  open: boolean;
  onClose: () => void;
  invalidItems: StockValidationError[];
  onUpdateCart: () => void;
}

export default function StockValidationModal({
  open,
  onClose,
  invalidItems,
  onUpdateCart,
}: StockValidationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-silver-light px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-night">Oops — We Don't Have That Many Available</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-offwhite transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-silver-dark" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-silver-dark mb-4">
            Some of your selected pieces are available in limited quantities. We've reserved what we can. Please update your cart to continue.
          </p>

          {/* Invalid Items List */}
          <div className="space-y-3 mb-6">
            {invalidItems.map((item, index) => (
              <div
                key={`${item.sku}-${index}`}
                className="p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-night text-sm">SKU: {item.sku}</p>
                    {item.reason === "VARIANT_NOT_FOUND" && (
                      <p className="text-xs text-red-600 mt-1">Item no longer available</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-silver-dark text-xs mb-1">Requested</p>
                    <p className="font-semibold text-night">{item.requested_quantity}</p>
                  </div>
                  <div>
                    <p className="text-silver-dark text-xs mb-1">Available</p>
                    <p className="font-semibold text-red-600">{item.available_quantity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-silver-light rounded-lg font-medium text-night hover:bg-offwhite transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUpdateCart}
              className="flex-1 px-4 py-2.5 bg-gold text-white rounded-lg font-medium hover:bg-gold-darker transition-colors"
            >
              Update Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
