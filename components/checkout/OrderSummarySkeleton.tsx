// OrderSummarySkeleton: Loading skeleton for OrderSummary
// Structure-only: No logic

import { Skeleton } from "@/components/ui/Skeleton";

export default function OrderSummarySkeleton() {
  return (
    <div className="bg-cream border border-silver rounded-xl p-6 shadow-luxury">
      {/* Title Skeleton */}
      <Skeleton className="h-9 w-48 mb-6" />

      {/* Product Items Skeleton */}
      <div className="space-y-4 mb-6 pb-6 border-b border-silver">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-4 items-start">
            <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Coupon Input Skeleton */}
      <div className="mb-6 pb-6 border-b border-silver">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Price Rows Skeleton */}
      <div className="space-y-3 mb-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>

      {/* Grand Total Skeleton */}
      <div className="flex justify-between items-center mb-6 pt-6 border-t-2 border-gold">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Button Skeleton */}
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  );
}




