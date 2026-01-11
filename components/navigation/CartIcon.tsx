"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";

export interface CartIconProps {
  onOpen?: () => void;
  initialCount?: number;
}

export default function CartIcon({ onOpen, initialCount = 0 }: CartIconProps) {
  const { getTotalItems, openCart } = useCartStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Phase 2: Total quantity across all cart items (SKU-level)
  const itemCount = hydrated ? getTotalItems() : initialCount;

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    openCart(); // Use cart store's openCart
    onOpen?.(); // Also call prop if provided for backward compatibility
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative p-2 text-white/80 hover:text-[#D4AF37] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37] rounded-sm"
      aria-label={itemCount > 0 ? `Open cart (${itemCount} items)` : "Open cart"}
    >
      <ShoppingBag className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />

      {itemCount > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-[#D4AF37] text-[#3F1424] text-[11px] font-semibold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(0,0,0,0.25)]"
          aria-hidden="true"
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}
