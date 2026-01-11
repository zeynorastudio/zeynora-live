/**
 * Design System Typography Utilities
 * 
 * Typography roles for consistent text styling across the application.
 * Uses existing fonts from the project (no new fonts introduced).
 */

import { cn } from "@/lib/utils";

/**
 * Typography role classes
 * These can be used as Tailwind utility classes or applied via className
 */
export const typography = {
  /**
   * Heading 1 - Large display heading
   * Use for main page titles and hero headings
   */
  h1: "text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight tracking-tight",
  
  /**
   * Heading 2 - Section heading
   * Use for section titles and major content headings
   */
  h2: "text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight tracking-tight",
  
  /**
   * Body text - Default paragraph text
   * Use for main content, descriptions, and general text
   */
  body: "text-base md:text-lg leading-relaxed",
  
  /**
   * Small/Meta text - Secondary information
   * Use for captions, labels, timestamps, and supplementary text
   */
  small: "text-sm leading-normal",
} as const;

/**
 * Typography component props
 */
export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Typography role
   */
  variant?: "h1" | "h2" | "body" | "small";
  /**
   * HTML element to render
   * If not provided, defaults based on variant:
   * - h1 → h1
   * - h2 → h2
   * - body → p
   * - small → span
   */
  as?: React.ElementType;
  /**
   * Children to render
   */
  children: React.ReactNode;
}

/**
 * Typography component helper
 * 
 * @example
 * ```tsx
 * <Typography variant="h1">Main Title</Typography>
 * <Typography variant="body" as="div">Content</Typography>
 * ```
 */
export function Typography({
  variant = "body",
  as,
  children,
  className,
  ...props
}: TypographyProps) {
  const Component = as || (variant === "h1" ? "h1" : variant === "h2" ? "h2" : variant === "body" ? "p" : "span");
  
  return (
    <Component
      className={cn(typography[variant], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Typography utility classes for direct use
 * 
 * @example
 * ```tsx
 * <h1 className={typography.h1}>Title</h1>
 * <p className={typography.body}>Content</p>
 * ```
 */
export { typography as textStyles };




