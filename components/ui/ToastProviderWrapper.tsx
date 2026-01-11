"use client";

import React from "react";
import { Toaster } from "@/components/ui/toaster";

/**
 * Toast Provider Wrapper for Admin Pages
 * Ensures ToastContext is available for client components that use useToast
 */
export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}










