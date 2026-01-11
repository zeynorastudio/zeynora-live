"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";

interface ProductInfoProps {
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export default function ProductInfo({ name, price, description, category }: ProductInfoProps) {
  return (
    <div className="space-y-4">
      {category && (
        <span className="text-xs font-bold tracking-widest text-silver-dark uppercase">
          {category}
        </span>
      )}
      
      <h1 className="serif-display display-md text-night leading-tight">
        {name}
      </h1>

      <div className="flex items-center gap-4">
        <span className="sans-base text-2xl text-night font-medium">
          ₹{price.toLocaleString()}
        </span>
        <Badge variant="secondary" className="bg-gold/10 text-gold-darker border-gold/20">
          In Stock
        </Badge>
      </div>

      {description && (
        <div className="prose prose-sm text-night/80 pt-4 border-t border-silver-light">
          <p>{description}</p>
        </div>
      )}
    </div>
  );
}


