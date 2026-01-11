"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";
import type { CartItem as CartStoreItem } from "@/lib/store/cart";

interface CartItemProps {
  item: CartStoreItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function CartItem({ item, onIncrement, onDecrement, onRemove }: CartItemProps) {
  const price = item.price || 0;
  const lineTotal = price * item.quantity;
  const media = item.image ? getPublicUrl("products", item.image) : "/images/placeholder-product.jpg";

  return (
    <div className="flex gap-4">
      {/* Product Image */}
      <div className="w-24 h-28 bg-offwhite border border-silver-light rounded flex-shrink-0 overflow-hidden relative">
        <Image src={media} alt={item.name || "Product"} fill className="object-cover" sizes="96px" />
      </div>

      {/* Product Details & Controls */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Product Name */}
          <h3 className="text-sm font-semibold text-night mb-1 line-clamp-2">
            {item.name}
          </h3>
          {/* SKU and Size */}
          <div className="text-xs text-silver-dark mb-1">
            <span>SKU: {item.sku}</span>
            {item.size && <span className="ml-2">Size: {item.size}</span>}
          </div>
          {/* Price per unit */}
          <p className="text-sm font-medium text-night">₹{price.toLocaleString("en-IN")} each</p>
        </div>

        {/* Quantity Controls & Actions */}
        <div className="flex items-center justify-between mt-2 gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center border border-silver-light rounded-md overflow-hidden">
            <button
              className="p-2 hover:bg-cream text-silver-dark hover:text-night disabled:opacity-50 transition-colors"
              onClick={onDecrement}
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-4 min-w-[3rem] text-center">{item.quantity}</span>
            <button
              className="p-2 hover:bg-cream text-silver-dark hover:text-night transition-colors"
              onClick={onIncrement}
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Line Total & Remove */}
          <div className="flex items-center gap-4">
            <p className="text-base font-semibold text-night">₹{lineTotal.toLocaleString("en-IN")}</p>
            <button
              type="button"
              onClick={onRemove}
              className="text-silver-dark hover:text-red-500 transition-colors p-1"
              aria-label="Remove item"
              title="Remove from cart"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
