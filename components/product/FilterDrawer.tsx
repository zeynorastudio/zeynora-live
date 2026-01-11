"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import FilterAccordion from "./FilterAccordion";
import "@/styles/product-card.css";
import { Filter, X } from "lucide-react";

const SIZES = ["M", "L", "XL", "XXL", "XXXL"];
const MIN_PRICE = 0;
const MAX_PRICE = 50000;
const PRICE_STEP = 1000;

export default function FilterDrawer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(MIN_PRICE);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());

  // Initialize from URL params
  useEffect(() => {
    const priceParam = searchParams.get("price");
    if (priceParam) {
      const [min, max] = priceParam.split("-");
      if (min) setMinPrice(Number(min));
      if (max) setMaxPrice(Number(max));
    } else {
      setMinPrice(MIN_PRICE);
      setMaxPrice(MAX_PRICE);
    }

    const sizeParam = searchParams.get("size");
    if (sizeParam) {
      const sizes = sizeParam.split(",");
      setSelectedSizes(new Set(sizes));
    } else {
      setSelectedSizes(new Set());
    }
  }, [searchParams]);

  const handleSizeToggle = (size: string) => {
    const newSizes = new Set(selectedSizes);
    if (newSizes.has(size)) {
      newSizes.delete(size);
    } else {
      newSizes.add(size);
    }
    setSelectedSizes(newSizes);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Update price filter - use slider values
    if (minPrice > MIN_PRICE || maxPrice < MAX_PRICE) {
      params.set("price", `${minPrice}-${maxPrice}`);
    } else {
      params.delete("price");
    }

    // Update size filter
    if (selectedSizes.size > 0) {
      params.set("size", Array.from(selectedSizes).join(","));
    } else {
      params.delete("size");
    }

    // Reset to page 1 when filters change
    params.delete("page");

    router.push(`/shop?${params.toString()}`);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setMinPrice(MIN_PRICE);
    setMaxPrice(MAX_PRICE);
    setSelectedSizes(new Set());
    const params = new URLSearchParams(searchParams.toString());
    params.delete("price");
    params.delete("size");
    params.delete("page");
    router.push(`/shop?${params.toString()}`);
  };

  const hasActiveFilters = (minPrice > MIN_PRICE || maxPrice < MAX_PRICE) || selectedSizes.size > 0;

  return (
    <>
      {/* Trigger Button - Show on both desktop and mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 border border-silver rounded-md hover:border-gold hover:text-gold transition-colors relative"
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-night/50 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer - Slide from left */}
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-offwhite flex flex-col shadow-xl animate-in slide-in-from-left duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-silver">
              <h2 className="serif-display text-lg text-night">Filters</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-cream/50 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
                aria-label="Close filters"
              >
                <X className="w-6 h-6 text-night" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Price Range Filter - Slider */}
                <FilterAccordion title="Price" defaultOpen={true}>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="sans-base text-base font-medium text-night">₹{minPrice.toLocaleString('en-IN')}</span>
                        <span className="sans-base text-base font-medium text-night">₹{maxPrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="relative h-8 flex items-center px-2">
                        {/* Track */}
                        <div className="absolute w-full h-1.5 bg-silver-light rounded-full" />
                        {/* Active Range */}
                        <div 
                          className="absolute h-1.5 bg-gold rounded-full transition-all duration-150"
                          style={{
                            left: `${((minPrice - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
                            width: `${((maxPrice - minPrice) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
                          }}
                        />
                        {/* Min Range Input */}
                        <input
                          type="range"
                          min={MIN_PRICE}
                          max={MAX_PRICE}
                          step={PRICE_STEP}
                          value={minPrice}
                          onChange={(e) => {
                            const newMin = Number(e.target.value);
                            if (newMin < maxPrice) {
                              setMinPrice(newMin);
                            }
                          }}
                          className="absolute w-full h-6 opacity-0 cursor-pointer z-20"
                          style={{
                            WebkitAppearance: 'none',
                            appearance: 'none',
                          }}
                        />
                        {/* Max Range Input */}
                        <input
                          type="range"
                          min={MIN_PRICE}
                          max={MAX_PRICE}
                          step={PRICE_STEP}
                          value={maxPrice}
                          onChange={(e) => {
                            const newMax = Number(e.target.value);
                            if (newMax > minPrice) {
                              setMaxPrice(newMax);
                            }
                          }}
                          className="absolute w-full h-6 opacity-0 cursor-pointer z-20"
                          style={{
                            WebkitAppearance: 'none',
                            appearance: 'none',
                          }}
                        />
                        {/* Custom Min Thumb */}
                        <div
                          className="absolute w-5 h-5 bg-gold rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform z-30 pointer-events-none"
                          style={{
                            left: `calc(${((minPrice - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}% - 10px)`,
                          }}
                        />
                        {/* Custom Max Thumb */}
                        <div
                          className="absolute w-5 h-5 bg-gold rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform z-30 pointer-events-none"
                          style={{
                            left: `calc(${((maxPrice - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}% - 10px)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </FilterAccordion>

                {/* Size Filter */}
                <FilterAccordion title="Size" defaultOpen={true}>
                  <div className="space-y-3">
                    {SIZES.map((size) => {
                      const isChecked = selectedSizes.has(size);
                      return (
                        <label
                          key={size}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSizeToggle(size)}
                            className="w-4 h-4 rounded border-silver text-bronze focus:ring-bronze focus:ring-2 cursor-pointer"
                            aria-label={`Size: ${size}`}
                          />
                          <span className="sans-base text-sm text-night group-hover:text-bronze transition-colors">
                            {size}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterAccordion>
              </div>
            </div>

            {/* Footer with Apply and Clear Buttons */}
            <div className="border-t border-silver px-6 py-4 bg-offwhite space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={applyFilters}
                aria-label="Apply filters"
              >
                Apply Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
