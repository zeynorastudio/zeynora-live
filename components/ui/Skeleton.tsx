import * as React from "react"
import { cn } from "@/lib/utils"

function SkeletonComponent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-silver/30", className)}
      {...props}
    />
  )
}

export { SkeletonComponent as Skeleton };
export default SkeletonComponent;
