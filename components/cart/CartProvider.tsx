"use client";

import React from "react";

/**
 * CartProvider - Phase 2 (Local Persistence Only)
 * 
 * In this version, cart is persisted via localStorage in the store itself.
 * Server sync is handled via separate actions when needed (checkout).
 */
export default function CartProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
