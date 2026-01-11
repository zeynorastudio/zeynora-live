import { create } from "zustand";
import { persist } from "zustand/middleware";

const CART_KEY = "zeynora_cart_v1";

export type CartItem = {
  sku: string;
  product_uid: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image?: string; // Kept for UI rendering
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: (item: CartItem) =>
        set((state) => {
          const existing = state.items.find((i) => i.sku === item.sku);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.sku === item.sku ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, item], isOpen: true };
        }),
      removeItem: (sku: string) =>
        set((state) => ({
          items: state.items.filter((i) => i.sku !== sku),
        })),
      updateQty: (sku: string, qty: number) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.sku === sku ? { ...i, quantity: Math.max(0, qty) } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0),
    }),
    {
      name: CART_KEY,
      partialize: (state) => ({ items: state.items }), // Only persist items, not isOpen
    }
  )
);

/**
 * FINAL ONE-TIME PATCH EXPORTS
 * Bridges functional requirements with reactive store
 */

export function getCart() {
  return useCartStore.getState().items;
}

export function addToCart(item: CartItem) {
  useCartStore.getState().addItem(item);
}

export function removeFromCart(sku: string) {
  useCartStore.getState().removeItem(sku);
}

export function clearCart() {
  useCartStore.getState().clearCart();
}

export function openCartDrawer() {
  useCartStore.getState().openCart();
}
