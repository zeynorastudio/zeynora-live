import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "gold" | "vine" | "bronze" | "success";
}

export function Badge({
  className,
  variant = "gold",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
    gold: "bg-gold text-night",
    vine: "bg-vine text-offwhite",
    bronze: "bg-bronze text-offwhite",
    success: "bg-green-100 text-green-800 border-green-200",
  };
  
  return (
    <div className={cn("inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
  );
}
