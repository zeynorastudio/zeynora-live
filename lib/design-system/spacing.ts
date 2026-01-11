/**
 * Design System Spacing Constants
 * 
 * Base unit: 8px
 * All spacing values are multiples of 8px
 */

export const spacing = {
  /** 8px - Base unit */
  xs: '8px',
  /** 16px - 2x base unit */
  sm: '16px',
  /** 24px - 3x base unit */
  md: '24px',
  /** 32px - 4x base unit */
  lg: '32px',
  /** 48px - 6x base unit */
  xl: '48px',
  /** 64px - 8x base unit */
  '2xl': '64px',
} as const;

/**
 * Tailwind spacing values (using rem for consistency)
 * These map to Tailwind's spacing scale
 */
export const spacingTailwind = {
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
  '2xl': '4rem',  // 64px
} as const;

/**
 * Spacing scale for use in Tailwind classes
 * Use these values with Tailwind spacing utilities:
 * - padding: p-{key} (e.g., p-xs → p-2)
 * - margin: m-{key} (e.g., m-sm → m-4)
 * - gap: gap-{key} (e.g., gap-md → gap-6)
 */
export const spacingScale = {
  xs: 2,   // 0.5rem = 8px
  sm: 4,   // 1rem = 16px
  md: 6,   // 1.5rem = 24px
  lg: 8,   // 2rem = 32px
  xl: 12,  // 3rem = 48px
  '2xl': 16, // 4rem = 64px
} as const;

export type SpacingKey = keyof typeof spacing;





