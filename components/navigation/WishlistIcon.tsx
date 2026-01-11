"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist";

interface WishlistIconProps {
  initialCount?: number;
}

export default function WishlistIcon({ initialCount = 0 }: WishlistIconProps) {
  const { wishlist } = useWishlistStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const count = hydrated ? wishlist.length : initialCount;

  return (
    <Link
      href="/wishlist"
      className="relative p-2 text-white/80 hover:text-[#D4AF37] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4AF37] rounded-sm"
      aria-label={count > 0 ? `Wishlist with ${count} items` : "View wishlist"}
    >
      <Heart className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />

      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-[#D4AF37] text-[#3F1424] text-[11px] font-semibold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(0,0,0,0.25)]"
          aria-hidden="true"
        >
          {count}
        </span>
      )}
    </Link>
  );
}