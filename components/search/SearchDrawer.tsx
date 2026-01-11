// SearchDrawer: Full-screen search drawer/modal
// DB Sources:
//   - search_history.user_queries (text array)
//   - products.name full-text search
//   - products.tags (text array)
//   - products.category_id (uuid)
// Structure-only: No logic, no state, no animations (structure only)
// Warm cream background with gold shimmer accent on top bar

import { X } from "lucide-react";
import SearchInput from "./SearchInput";
import SearchRecent from "./SearchRecent";
import SearchTrending from "./SearchTrending";
import SearchResults from "./SearchResults";
import SearchEmptyState from "./SearchEmptyState";

export interface SearchDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function SearchDrawer({
  isOpen = false,
  onClose,
}: SearchDrawerProps) {
  // Placeholder: determine which sections to show (no logic)
  const showRecent = true; // DB: search_history.user_queries
  const showTrending = true; // DB: products.tags
  const showResults = false; // DB: products search results
  const showEmptyState = false; // When no results

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-night/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - Full screen */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        className="fixed inset-0 z-50 bg-cream overflow-hidden flex flex-col"
      >
        {/* Header with gold shimmer accent */}
        <div className="relative border-b border-silver/30 bg-gradient-to-r from-gold/5 via-cream to-cream">
          {/* Gold shimmer accent bar */}
          <div className="h-1 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto flex items-center gap-4">
              {/* Search Input */}
              <div className="flex-1">
                <SearchInput />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-cream/50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gold flex-shrink-0"
                aria-label="Close search"
              >
                <X className="w-6 h-6 text-night" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Recent Searches */}
            {showRecent && <SearchRecent />}

            {/* Trending Searches */}
            {showTrending && <SearchTrending />}

            {/* Search Results */}
            {showResults && <SearchResults />}

            {/* Empty State */}
            {showEmptyState && <SearchEmptyState />}
          </div>
        </div>
      </div>
    </>
  );
}




