"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Minimal types for props
type Variant = {
  id: string;
  color_id: string | null;
  size_id: string | null;
  stock: number | null;
  active: boolean | null;
  colors?: { name: string; hex_code: string | null; slug: string } | null;
  sizes?: { code: string; label: string | null } | null;
};

interface VariantSelectorProps {
  variants: Variant[];
  onSelect: (variantId: string | null) => void;
}

export default function VariantSelector({ variants, onSelect }: VariantSelectorProps) {
  // Group by colors
  const colorMap = new Map<string, { name: string; hex: string; slug: string }>();
  // Group sizes by color
  const sizeMap = new Map<string, Set<string>>(); // colorSlug -> Set<sizeCode>
  
  // Map specific variant ID by color+size
  const variantLookup = new Map<string, string>(); // "colorSlug-sizeCode" -> variantId

  variants.forEach((v) => {
    if (!v.active) return;
    const colorSlug = v.colors?.slug || "default";
    const sizeCode = v.sizes?.code || "OS"; // One Size default

    if (v.colors) {
      colorMap.set(colorSlug, {
        name: v.colors.name,
        hex: v.colors.hex_code || "#000",
        slug: v.colors.slug,
      });
    }

    if (!sizeMap.has(colorSlug)) {
      sizeMap.set(colorSlug, new Set());
    }
    sizeMap.get(colorSlug)?.add(sizeCode);

    variantLookup.set(`${colorSlug}-${sizeCode}`, v.id);
  });

  const colors = Array.from(colorMap.values());
  
  // State
  const [selectedColor, setSelectedColor] = useState<string | null>(colors.length > 0 ? colors[0].slug : null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Auto-select first available size when color changes
  useEffect(() => {
    if (selectedColor) {
      const availableSizes = Array.from(sizeMap.get(selectedColor) || []);
      if (availableSizes.length > 0 && !availableSizes.includes(selectedSize || "")) {
        // Select first size
        // Try to preserve size if it exists in new color? (optional UX)
        // For now, reset or pick first.
        setSelectedSize(availableSizes[0]);
      }
    }
  }, [selectedColor, sizeMap, selectedSize]);

  // Notify parent
  useEffect(() => {
    if (selectedColor && selectedSize) {
      const id = variantLookup.get(`${selectedColor}-${selectedSize}`);
      onSelect(id || null);
    } else {
      onSelect(null);
    }
  }, [selectedColor, selectedSize, variantLookup, onSelect]);

  if (variants.length === 0) return null;

  const availableSizes = selectedColor ? Array.from(sizeMap.get(selectedColor) || []) : [];

  return (
    <div className="space-y-6">
      {/* Colors */}
      {colors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Color: <span className="text-gray-500 font-normal">{colorMap.get(selectedColor || "")?.name}</span></h3>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => (
              <button
                key={color.slug}
                onClick={() => setSelectedColor(color.slug)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold",
                  selectedColor === color.slug ? "border-gold" : "border-transparent"
                )}
                style={{ backgroundColor: color.hex }}
                aria-label={`Select color ${color.name}`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sizes */}
      {availableSizes.length > 0 && (
        <div>
           <h3 className="text-sm font-medium text-gray-900 mb-3">Size: <span className="text-gray-500 font-normal">{selectedSize}</span></h3>
           <div className="flex flex-wrap gap-3">
             {availableSizes.map((size) => (
               <button
                 key={size}
                 onClick={() => setSelectedSize(size)}
                 className={cn(
                   "min-w-[3rem] px-3 py-2 border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50",
                   selectedSize === size
                     ? "border-gold bg-gold/5 text-gold"
                     : "border-gray-200 text-gray-900 hover:border-gray-300"
                 )}
               >
                 {size}
               </button>
             ))}
           </div>
        </div>
      )}
    </div>
  );
}



