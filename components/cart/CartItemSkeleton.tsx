// CartItemSkeleton: Loading skeleton for cart items
// Structure matches CartItem component
// Uses Skeleton component for shimmer effect

import { Skeleton } from "@/components/ui/Skeleton";

export default function CartItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-silver/30">
      {/* Thumbnail Skeleton */}
      <div className="flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 space-y-3">
        {/* Product Name Skeleton */}
        <Skeleton className="h-5 w-3/4 rounded" />

        {/* Variant Info Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>

        {/* Price Skeleton */}
        <Skeleton className="h-4 w-20 rounded" />

        {/* Quantity Controls Skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-sm ml-auto" />
        </div>
      </div>
    </div>
  );
}




