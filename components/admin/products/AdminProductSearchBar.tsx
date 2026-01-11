"use client";

import { Search } from "lucide-react";

export function AdminProductSearchBar() {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-silver-dark" />
      <input
        type="text"
        placeholder="Search products by name, slug, or UID..."
        className="w-full pl-10 pr-4 py-2 text-sm border border-silver-light rounded-lg bg-offwhite focus:outline-none focus:ring-2 focus:ring-gold/50 focus:bg-white transition-all placeholder:text-silver-dark"
        disabled={false} // Future: wire up state
      />
    </div>
  );
}


