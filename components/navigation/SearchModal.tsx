// SearchModal: Centered modal structure for search
// Structure-only: No search logic, input field and suggestions only
// Suggested categories and products (skeleton blocks)

// Accessibility:
// - role="dialog"
// - aria-modal="true"

import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";

export interface SearchModalProps {
  open?: boolean;
  onClose?: () => void;
}

export default function SearchModal({ open = false, onClose }: SearchModalProps) {
  if (!open) return null;

  // Placeholder suggested categories
  const suggestedCategories = [
    "Bridal Lehengas", // DB: categories.name
    "Silk Sarees", // DB: categories.name
    "Designer Kurtas", // DB: categories.name
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-night/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      >
        <div className="w-full max-w-2xl bg-cream rounded-xl border border-silver shadow-warm-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-silver">
            <h2
              id="search-modal-title"
              className="serif-display text-lg text-night"
            >
              Search
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-cream/50 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
              aria-label="Close search"
            >
              <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Input Field */}
            <div className="relative">
              <Input
                type="search"
                placeholder="Search for products..."
                className="sans-base border-b-2 border-silver focus:border-gold rounded-none px-0 py-3"
                aria-label="Search input"
              />
            </div>

            {/* Suggested Categories */}
            <div>
              <h3 className="serif-display text-sm text-night mb-3">
                Suggested Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestedCategories.map((category, index) => (
                  <button
                    key={index}
                    type="button"
                    className="sans-base body-sm px-4 py-2 bg-cream/50 border border-silver rounded-full text-night hover:border-gold hover:bg-cream transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
                    // DB: categories.name
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested Products (Skeleton Blocks) */}
            <div>
              <h3 className="serif-display text-sm text-night mb-3">
                Suggested Products
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 bg-cream/30 rounded-lg border border-silver/30"
                  >
                    <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}




