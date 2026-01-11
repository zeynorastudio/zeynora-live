import { create } from "zustand";
import { persist } from "zustand/middleware";

const WISHLIST_KEY = "zeynora_wishlist_v1";

interface WishlistState {
  wishlist: string[]; // array of product_uids
  toggleWishlist: (uid: string) => void;
  isInWishlist: (uid: string) => boolean;
  setWishlistFromServer: (items: string[]) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlist: [],
      toggleWishlist: (uid) =>
        set((state) => {
          const isIncluded = state.wishlist.includes(uid);
          if (isIncluded) {
            return { wishlist: state.wishlist.filter((id) => id !== uid) };
          }
          return { wishlist: [...state.wishlist, uid] };
        }),
      isInWishlist: (uid) => get().wishlist.includes(uid),
      setWishlistFromServer: (items) => set({ wishlist: items }),
    }),
    {
      name: WISHLIST_KEY,
    }
  )
);

/**
 * FINAL ONE-TIME PATCH EXPORTS
 */

export function toggleWishlist(uid: string) {
  useWishlistStore.getState().toggleWishlist(uid);
}

export function getWishlist() {
  return useWishlistStore.getState().wishlist;
}
