"use client";

import { useEffect } from "react";
import { useWishlistStore } from "@/lib/store/wishlist";

export default function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { setWishlistFromServer } = useWishlistStore();

  useEffect(() => {
    // TODO: Refactored hydration to use API endpoint to avoid Next.js 15+ async cookies error in Client Components
    const hydrate = async () => {
      try {
        // Cache-busting for dev/debugging as requested
        const res = await fetch(`/api/wishlist/get?ts=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.items) {
            setWishlistFromServer(data.items);
          }
        }
      } catch (error) {
        // Silent failure - wishlist will be empty
      }
    };
    hydrate();
  }, [setWishlistFromServer]);

  return <>{children}</>;
}
