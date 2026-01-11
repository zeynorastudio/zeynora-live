import React from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width of the container
   * @default "1280px"
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "none";
  /**
   * Horizontal padding
   * Uses design system spacing scale
   * @default "sm" (16px)
   */
  paddingX?: "xs" | "sm" | "md" | "lg";
  /**
   * Children to render inside the container
   */
  children: React.ReactNode;
}

const maxWidthMap = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
  none: "",
};

const paddingXMap = {
  xs: "px-2",   // 8px
  sm: "px-4",   // 16px
  md: "px-6",   // 24px
  lg: "px-8",   // 32px
};

/**
 * Container Component
 * 
 * Provides consistent max-width and horizontal padding across the application.
 * Responsive padding adjusts automatically:
 * - Mobile: Base padding
 * - Tablet: Base padding
 * - Desktop: Base padding
 * 
 * @example
 * ```tsx
 * <Container maxWidth="xl" paddingX="md">
 *   <YourContent />
 * </Container>
 * ```
 */
export function Container({
  children,
  maxWidth = "2xl",
  paddingX = "sm",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto",
        maxWidth !== "none" && maxWidthMap[maxWidth],
        paddingXMap[paddingX],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}





