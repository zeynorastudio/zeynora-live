import React from "react";
import { cn } from "@/lib/utils";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Vertical spacing (padding top and bottom)
   * Uses design system spacing scale
   * @default "lg" (32px)
   */
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /**
   * HTML element to render
   * @default "section"
   */
  as?: "section" | "div" | "article" | "aside" | "header" | "footer";
  /**
   * Children to render inside the section
   */
  children: React.ReactNode;
}

const spacingMap = {
  xs: "py-2",   // 8px
  sm: "py-4",   // 16px
  md: "py-6",   // 24px
  lg: "py-8",   // 32px
  xl: "py-12",  // 48px
  "2xl": "py-16", // 64px
};

/**
 * Section Component
 * 
 * Provides consistent vertical spacing between content sections.
 * Responsive spacing can be adjusted via className prop if needed.
 * 
 * @example
 * ```tsx
 * <Section spacing="xl">
 *   <YourContent />
 * </Section>
 * ```
 * 
 * @example With custom spacing
 * ```tsx
 * <Section spacing="md" className="md:py-12">
 *   <YourContent />
 * </Section>
 * ```
 */
export function Section({
  children,
  spacing = "lg",
  as: Component = "section",
  className,
  ...props
}: SectionProps) {
  return (
    <Component
      className={cn(spacingMap[spacing], className)}
      {...props}
    >
      {children}
    </Component>
  );
}





