"use client";

import React from "react";
import { Separator } from "@/components/ui/Separator";

interface CartSummaryProps {
  subtotal: number;
}

export function CartSummary({ subtotal }: CartSummaryProps) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between text-night/80">
        <span>Subtotal</span>
        <span>₹{subtotal.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-night/80">
        <span>Shipping</span>
        <span className="text-xs text-silver-dark italic">Calculated at checkout</span>
      </div>
      <Separator className="my-2" />
      <div className="flex justify-between font-bold text-lg text-night">
        <span>Total</span>
        <span>₹{subtotal.toLocaleString()}</span>
      </div>
    </div>
  );
}
