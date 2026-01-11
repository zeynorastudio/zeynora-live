// SearchEmptyState: Empty search state UI
// Structure-only: No logic
// Warm minimal empty state with serif-display title

import { Search } from "lucide-react";

export default function SearchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full bg-cream/50 border border-silver flex items-center justify-center">
          <Search className="w-8 h-8 text-silver-dark" aria-hidden="true" />
        </div>
      </div>
      <h3 className="serif-display display-md text-night mb-3">
        No results found
      </h3>
      <p className="sans-base body-md text-silver-dark mb-6 max-w-md">
        Try searching for something else or browse our collections.
      </p>
      <div className="sans-base body-sm text-night">
        <span className="text-silver-dark">Try searching for </span>
        <span className="serif-display text-gold">'Lehenga'</span>
      </div>
    </div>
  );
}




