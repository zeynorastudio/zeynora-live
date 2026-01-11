// QuantitySelector: Reusable quantity selector UI component
// DB Source:
//   - cart_items.quantity (integer)
// Structure-only: No logic, accepts props for callbacks
// Bronze border, gold focus ring styling

import { Minus, Plus } from "lucide-react";

export interface QuantitySelectorProps {
  qty?: number;
  onIncrease?: () => void;
  onDecrease?: () => void;
}

export default function QuantitySelector({
  qty = 1,
  onIncrease,
  onDecrease,
}: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-2 border border-bronze rounded-md">
      {/* Decrease Button */}
      <button
        type="button"
        onClick={onDecrease}
        className="p-1 hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-gold rounded-sm"
        aria-label={`Decrease quantity, current: ${qty}`}
      >
        <Minus className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* Quantity Display - DB: cart_items.quantity */}
      <span
        className="sans-base text-sm text-night w-8 text-center"
        aria-live="off"
      >
        {qty}
      </span>

      {/* Increase Button */}
      <button
        type="button"
        onClick={onIncrease}
        className="p-1 hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-gold rounded-sm"
        aria-label={`Increase quantity, current: ${qty}`}
      >
        <Plus className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}




