"use client";

import { Toaster } from "@/components/ui/toaster";

export function StorefrontToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
















