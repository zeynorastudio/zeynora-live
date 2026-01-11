"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortBarProps {
  className?: string;
}

const SORT_OPTIONS = [
  { value: "", label: "Default" }, // sort_order ASC
  { value: "new_launch", label: "New Launch" }, // is_new_launch = true
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "featured", label: "Featured" }, // is_featured = true
  { value: "best_selling", label: "Best Sellers" }, // is_best_selling = true
];

export default function SortBar({ className = "" }: SortBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSort = searchParams.get("sort") || "";
  const currentLabel = SORT_OPTIONS.find((opt) => opt.value === currentSort)?.label || SORT_OPTIONS[0].label;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    
    // Reset to page 1 when sort changes
    params.delete("page");
    
    router.push(`/shop?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between bg-white/95 backdrop-blur-sm border-b border-silver-light py-4 px-4 md:px-6 transition-colors relative shadow-sm",
        className
      )}
    >
      <span className="sans-base text-sm font-medium text-night">Sort by</span>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm border border-silver rounded-md hover:border-gold hover:text-gold transition-all duration-200 min-w-[200px] justify-between bg-white shadow-sm hover:shadow-md"
          aria-label="Sort products"
          aria-expanded={isOpen}
        >
          <span className="text-night font-medium">{currentLabel}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-silver-dark transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-full bg-white border border-silver rounded-md shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-1">
              {SORT_OPTIONS.map((option) => {
                const isSelected = option.value === currentSort;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSortChange(option.value)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm transition-colors duration-150",
                      isSelected
                        ? "bg-cream text-gold font-semibold"
                        : "text-night hover:bg-cream/50 hover:text-gold"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
