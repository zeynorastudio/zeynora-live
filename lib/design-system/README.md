# Design System

Minimal design system layer for Zeynora providing consistent spacing, typography, and layout primitives.

## Spacing

Base unit: **8px**

Available spacing values:
- `xs`: 8px (0.5rem)
- `sm`: 16px (1rem)
- `md`: 24px (1.5rem)
- `lg`: 32px (2rem)
- `xl`: 48px (3rem)
- `2xl`: 64px (4rem)

### Usage

```tsx
import { spacing, spacingScale } from "@/lib/design-system";

// Direct pixel values
const padding = spacing.sm; // "16px"

// Tailwind scale values
const gapClass = `gap-${spacingScale.md}`; // "gap-6"
```

## Layout Primitives

### Container

Provides consistent max-width and horizontal padding.

```tsx
import { Container } from "@/components/design-system";

<Container maxWidth="2xl" paddingX="md">
  <YourContent />
</Container>
```

**Props:**
- `maxWidth`: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "none" (default: "2xl")
- `paddingX`: "xs" | "sm" | "md" | "lg" (default: "sm")

### Section

Provides consistent vertical spacing between content sections.

```tsx
import { Section } from "@/components/design-system";

<Section spacing="xl">
  <YourContent />
</Section>
```

**Props:**
- `spacing`: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" (default: "lg")
- `as`: "section" | "div" | "article" | "aside" | "header" | "footer" (default: "section")

### Grid

Responsive grid layout with configurable columns.

```tsx
import { Grid } from "@/components/design-system";

<Grid colsMobile={1} colsTablet={2} colsDesktop={4} gap="lg">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</Grid>
```

**Props:**
- `colsMobile`: 1 | 2 (default: 1)
- `colsTablet`: 2 | 3 | 4 (default: 2)
- `colsDesktop`: 2 | 3 | 4 | 5 | 6 (default: 3)
- `gap`: "xs" | "sm" | "md" | "lg" | "xl" (default: "md")

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Typography

Typography roles for consistent text styling.

### Usage as Component

```tsx
import { Typography } from "@/lib/design-system";

<Typography variant="h1">Main Title</Typography>
<Typography variant="h2">Section Title</Typography>
<Typography variant="body">Body text content</Typography>
<Typography variant="small">Meta information</Typography>
```

### Usage as Classes

```tsx
import { textStyles } from "@/lib/design-system";

<h1 className={textStyles.h1}>Main Title</h1>
<h2 className={textStyles.h2}>Section Title</h2>
<p className={textStyles.body}>Body text content</p>
<span className={textStyles.small}>Meta information</span>
```

**Variants:**
- `h1`: Large display heading (text-4xl → text-6xl responsive)
- `h2`: Section heading (text-2xl → text-4xl responsive)
- `body`: Default paragraph text (text-base → text-lg responsive)
- `small`: Small/meta text (text-sm)

## Complete Example

```tsx
import { Container, Section, Grid, Typography } from "@/components/design-system";
import { textStyles } from "@/lib/design-system";

export function ExamplePage() {
  return (
    <Container maxWidth="xl" paddingX="md">
      <Section spacing="xl">
        <Typography variant="h1">Welcome</Typography>
        <Typography variant="body">
          This is a complete example using the design system.
        </Typography>
      </Section>

      <Section spacing="lg">
        <h2 className={textStyles.h2}>Featured Products</h2>
        <Grid colsMobile={1} colsTablet={2} colsDesktop={4} gap="md">
          <div>Product 1</div>
          <div>Product 2</div>
          <div>Product 3</div>
          <div>Product 4</div>
        </Grid>
      </Section>
    </Container>
  );
}
```

## Notes

- All components use existing Tailwind CSS classes
- No new fonts are introduced - uses existing project fonts
- Responsive behavior works on mobile, tablet, and desktop
- Components accept standard HTML attributes and className for customization





