// SearchBar: Search icon button that opens SearchDrawer
// Structure-only: No logic, trigger prop only
// Accessibility: ARIA labels, keyboard navigation

import { Search } from "lucide-react";

export interface SearchBarProps {
  onSearchClick?: () => void;
}

export default function SearchBar({ onSearchClick }: SearchBarProps) {
  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={onSearchClick}
        className="w-full flex items-center gap-3 rounded-md border border-silver bg-cream px-4 py-2 text-night hover:border-gold focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition-colors"
        aria-label="Open search"
        aria-expanded="false"
      >
        <Search className="w-5 h-5 text-silver-dark flex-shrink-0" aria-hidden="true" />
        <span className="sans-base body-sm text-silver-dark flex-1 text-left">
          Search...
        </span>
      </button>
    </div>
  );
}

