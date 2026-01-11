// ProductCardSkeleton: Loading skeleton for product cards
// Matches ProductCard spacing and structure
// Uses shimmer animation from Skeleton component

import Card from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import "@/styles/product-card.css";

export default function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-warm-sm">
      {/* Image skeleton - 4:5 aspect ratio */}
      <div className="w-full aspect-[4/5] bg-silver/20">
        <Skeleton className="w-full h-full rounded-t-xl" />
      </div>

      {/* Info section skeleton */}
      <div className="product-card-spacing">
        {/* Title skeleton */}
        <Skeleton className="h-5 w-3/4 mb-3 rounded" />

        {/* Tags skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-1 rounded-full" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>

        {/* Color dots skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
        </div>

        {/* Price skeleton */}
        <Skeleton className="h-6 w-24 mb-4 rounded" />

        {/* Button skeleton */}
        <Skeleton className="h-10 w-full md:w-32 rounded-md" />
      </div>
    </Card>
  );
}




