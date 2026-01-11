// CartDrawerSkeleton: Loading skeleton for cart drawer
// Structure-only: No logic
// Mimics loading state visually with skeleton rows matching CartItem

import { Skeleton } from "@/components/ui/Skeleton";

export default function CartDrawerSkeleton() {
  return (
    <div className="divide-y divide-silver">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4 p-4">
          {/* Thumbnail skeleton */}
          <Skeleton className="w-20 h-24 rounded-lg flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            {/* Title skeleton */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Variant info skeleton */}
            <Skeleton className="h-3 w-1/2" />
            
            {/* Price skeleton */}
            <Skeleton className="h-4 w-1/4" />
            
            {/* Quantity selector skeleton */}
            <div className="flex items-center gap-3 mt-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-8 rounded-sm ml-auto" />
            </div>
          </div>
        </div>
      ))}

      {/* Summary skeleton */}
      <div className="p-6 bg-cream/30 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <div className="border-t border-silver pt-3">
          <Skeleton className="h-6 w-1/3 ml-auto" />
        </div>
        <Skeleton className="h-12 w-full rounded-md mt-4" />
      </div>
    </div>
  );
}




