// SearchInput: Search input bar component
// Structure-only: No logic, no state
// Uses Input UI component with serif-display placeholder styling

import { Search, Mic } from "lucide-react";
import Input from "@/components/ui/Input";

export default function SearchInput() {
  return (
    <div className="relative w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <Search className="w-5 h-5 text-silver-dark" aria-hidden="true" />
      </div>
      <Input
        type="search"
        placeholder="Search for products..."
        className="pl-12 pr-12 serif-display placeholder:serif-display"
        aria-label="Search input"
      />
      <button
        type="button"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-cream/50 rounded transition-colors"
        aria-label="Voice search"
      >
        <Mic className="w-5 h-5 text-silver-dark" aria-hidden="true" />
      </button>
    </div>
  );
}




