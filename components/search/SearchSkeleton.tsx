// SearchSkeleton: Loading skeleton for search results
// Structure-only: No logic
// Skeleton placeholders for search result rows

import Skeleton from "@/components/ui/Skeleton";

export default function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex gap-4 items-center p-4 bg-cream/30 rounded-lg border border-silver/30"
        >
          {/* Thumbnail circle skeleton */}
          <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            {/* Title bar skeleton */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Price bar skeleton */}
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}




