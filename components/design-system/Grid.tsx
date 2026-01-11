import React from "react";
import { cn } from "@/lib/utils";

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns on mobile (default: 1)
   */
  colsMobile?: 1 | 2;
  /**
   * Number of columns on tablet (default: 2)
   */
  colsTablet?: 2 | 3 | 4;
  /**
   * Number of columns on desktop (default: 3)
   */
  colsDesktop?: 2 | 3 | 4 | 5 | 6;
  /**
   * Gap between grid items
   * Uses design system spacing scale
   * @default "md" (24px)
   */
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  /**
   * Children to render inside the grid
   */
  children: React.ReactNode;
}

const gapMap = {
  xs: "gap-2",   // 8px
  sm: "gap-4",   // 16px
  md: "gap-6",   // 24px
  lg: "gap-8",   // 32px
  xl: "gap-12",  // 48px
};

/**
 * Grid Component
 * 
 * Responsive grid layout with configurable columns and gap.
 * Automatically adapts to mobile, tablet, and desktop breakpoints.
 * 
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1024px
 * - Desktop: > 1024px
 * 
 * @example
 * ```tsx
 * <Grid colsMobile={1} colsTablet={2} colsDesktop={4} gap="lg">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 *   <div>Item 4</div>
 * </Grid>
 * ```
 */
const colsMobileMap = {
  1: "grid-cols-1",
  2: "grid-cols-2",
};

const colsTabletMap = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

const colsDesktopMap = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export function Grid({
  children,
  colsMobile = 1,
  colsTablet = 2,
  colsDesktop = 3,
  gap = "md",
  className,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(
        "grid",
        colsMobileMap[colsMobile],
        colsTabletMap[colsTablet],
        colsDesktopMap[colsDesktop],
        gapMap[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}





