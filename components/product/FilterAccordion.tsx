"use client";

// FilterAccordion: Shared accordion component for filter sections
// Used by FilterSidebar and FilterDrawer
// Structure-only, no logic

import * as React from "react";

export interface FilterAccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export default function FilterAccordion({
  title,
  children,
  defaultOpen = false,
  className = "",
}: FilterAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={`border-b border-silver/30 ${className}`}>
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 rounded-sm"
        aria-expanded={isOpen}
        aria-controls={`filter-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <h3 className="serif-display text-base text-night font-normal">
          {title}
        </h3>
        {/* Chevron Icon */}
        <svg
          className={`w-5 h-5 text-silver-dark transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div
          id={`filter-${title.toLowerCase().replace(/\s+/g, "-")}`}
          className="pb-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}




