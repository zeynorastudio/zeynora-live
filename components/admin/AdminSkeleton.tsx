import { cn } from "@/lib/utils";

export function AdminSkeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("animate-pulse bg-offwhite rounded-md", className)} 
      {...props} 
    />
  );
}


