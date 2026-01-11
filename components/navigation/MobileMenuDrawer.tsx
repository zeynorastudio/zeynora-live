// MobileMenuDrawer: Mobile menu drawer sliding from left
// DB Sources:
//   - categories where parent_id IS NULL (super categories)
//   - categories where parent_id = {id} (subcategories)
// Structure-only: No logic, accordion structure only
// Accepts open + onClose props

// Accessibility:
// - role="dialog"
// - aria-modal="true"

import { X, ChevronDown } from "lucide-react";

export interface MobileMenuDrawerProps {
  open?: boolean;
  onClose?: () => void;
}

export default function MobileMenuDrawer({
  open = false,
  onClose,
}: MobileMenuDrawerProps) {
  // Placeholder super categories - DB: categories where parent_id IS NULL
  const superCategories = [
    {
      id: "1",
      name: "Lehengas", // DB: categories.name
      slug: "lehengas", // DB: categories.slug
      subcategories: [
        { name: "Bridal Lehengas", slug: "bridal-lehengas" }, // DB: categories where parent_id = {id}
        { name: "Designer Lehengas", slug: "designer-lehengas" },
        { name: "Festive Lehengas", slug: "festive-lehengas" },
      ],
    },
    {
      id: "2",
      name: "Sarees", // DB: categories.name
      slug: "sarees", // DB: categories.slug
      subcategories: [
        { name: "Silk Sarees", slug: "silk-sarees" }, // DB: categories where parent_id = {id}
        { name: "Cotton Sarees", slug: "cotton-sarees" },
        { name: "Designer Sarees", slug: "designer-sarees" },
      ],
    },
    {
      id: "3",
      name: "Kurtas", // DB: categories.name
      slug: "kurtas", // DB: categories.slug
      subcategories: [
        { name: "Casual Kurtas", slug: "casual-kurtas" }, // DB: categories where parent_id = {id}
        { name: "Formal Kurtas", slug: "formal-kurtas" },
      ],
    },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-night/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-offwhite shadow-luxury transform transition-transform duration-300 ease-in-out"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-bronze">
            <h2
              id="mobile-menu-title"
              className="serif-display text-xl text-gold"
            >
              ZEYNORA
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-cream/50 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
              aria-label="Close mobile menu"
            >
              <X className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-6 py-4">
              {superCategories.map((category) => (
                <div
                  key={category.id}
                  className="border-b border-bronze/30 last:border-b-0"
                >
                  {/* Super Category - Accordion structure (no logic) */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-4 sans-base body-md text-night hover:text-gold transition-colors focus:outline-none focus:ring-2 focus:ring-gold rounded-sm"
                    aria-expanded="false"
                    aria-controls={`subcategories-${category.id}`}
                    // DB: categories.name where parent_id IS NULL
                  >
                    <span className="serif-display text-lg">{category.name}</span>
                    <ChevronDown className="w-5 h-5 text-silver-dark" aria-hidden="true" />
                  </button>

                  {/* Subcategories List - DB: categories where parent_id = {id} */}
                  <div
                    id={`subcategories-${category.id}`}
                    className="pl-4 pb-4 space-y-3"
                  >
                    {category.subcategories.map((subcategory) => (
                      <a
                        key={subcategory.slug}
                        href={`/collections/${subcategory.slug}`}
                        className="block sans-base body-sm text-silver-dark hover:text-gold transition-colors py-2"
                        // DB: categories.name, categories.slug where parent_id = {id}
                      >
                        {subcategory.name}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t border-bronze px-6 py-4">
            <a
              href="/login"
              className="sans-base body-md text-night hover:text-gold transition-colors focus:outline-none focus:ring-2 focus:ring-gold rounded-sm"
              aria-label="Login or view account"
            >
              Login / My Account
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

