# Zeynora — Layout Architecture Blueprint

**Version:** 1.0  
**Date:** 2025  
**Sub-Phase:** 1.2 — Layout Architecture (No Code Output)  
**Architecture Approach:** Hybrid Architecture

---

## Document Purpose

This blueprint defines the complete structural and conceptual architecture for the Zeynora storefront layout system. This document describes **how** components, pages, and layouts should be organized and interact—it does **not** contain implementation code. All architectural decisions align with the Brand Foundation established in Phase 1.1 and respect the database-first, Supabase Storage-only image policy.

---

## 1. Global Layout Structure

### 1.1 Root Layout (`app/layout.tsx`)

**Purpose:**  
The root layout wraps the entire application and establishes global foundations that apply to all routes (storefront, admin, super-admin).

**Responsibilities:**
- Font loading and CSS variable injection (Geist Sans, Geist Mono)
- Global metadata (title, description, Open Graph)
- HTML structure and language attribute
- Global CSS imports (`globals.css`)
- Body-level styling classes (antialiased, font variables)

**Current State:**  
Already scaffolded with Geist fonts and basic metadata. No changes needed at this phase.

**Future Considerations:**
- Theme provider wrapper (if dark mode is added later)
- Analytics scripts (when needed)
- Global error boundary (future enhancement)

**Provider Placement Strategy:**
- **Root Layout:** Only font and metadata—no React Context providers
- **Storefront Layout:** Cart context, Supabase client context, theme context (if needed)
- **Admin Layouts:** Separate provider trees for admin-specific contexts

---

### 1.2 Storefront Layout (`app/(storefront)/layout.tsx`)

**Purpose:**  
Wraps all public-facing storefront pages and provides shared UI elements (navbar, footer) and context providers.

**Structure Concept:**

```
StorefrontLayout
├── Providers Layer
│   ├── SupabaseClientProvider (client-side Supabase instance)
│   ├── CartProvider (Zustand store wrapper, if needed)
│   └── ThemeProvider (if dark mode is implemented)
├── Navigation Layer
│   └── Navbar Component (persistent across all storefront pages)
├── Content Layer
│   └── {children} (page-specific content)
└── Footer Layer
    └── Footer Component (persistent across all storefront pages)
```

**Provider Hierarchy:**
- Providers wrap the entire storefront route group
- Navbar and Footer are siblings to `{children}`, not wrapped by providers
- This allows navbar/footer to access context (cart count, user state) while remaining persistent

**Responsive Behavior:**
- Desktop: Full navbar with mega menu, full footer
- Mobile: Collapsed navbar with hamburger menu, condensed footer
- Tablet: Adaptive navbar (mega menu may collapse to dropdown), full footer

**Data Dependencies:**
- Navbar: Categories from database (super categories + subcategories)
- Footer: Static content (links, contact info) + dynamic categories
- Cart: Zustand store (client-side state) + Supabase for persistence

---

### 1.3 Page Shell Organization

**Concept:**  
Each page within `app/(storefront)/` follows a consistent shell pattern:

```
Page Shell Structure:
├── Page Container (max-width wrapper, padding)
├── Page Header (optional: breadcrumbs, title, filters)
├── Page Content (main content area)
└── Page Footer (optional: related content, pagination)
```

**Container Rules:**
- Maximum width: `1280px` (desktop), full width (mobile)
- Horizontal padding: `1rem` (mobile), `2rem` (tablet), `3rem` (desktop)
- Vertical spacing: Consistent section gaps (`4rem` desktop, `2rem` mobile)

**Responsive Breakpoints:**
- Mobile: `< 768px` (single column, stacked layouts)
- Tablet: `768px - 1024px` (2-column grids, adaptive navigation)
- Desktop: `> 1024px` (3-4 column grids, full mega menu)

---

## 2. Folder & Section Architecture (Hybrid Approach)

### 2.1 Component Organization Strategy

**Hybrid Architecture Rationale:**  
Combines atomic design principles (UI components) with feature-based organization (sections, product components) for maintainability and scalability.

**Folder Structure:**

```
components/
├── ui/                          # Shadcn-based atomic components
│   ├── Button.tsx               # Already scaffolded
│   ├── Card.tsx                 # Product cards, content cards
│   ├── Input.tsx                # Form inputs, search bar
│   ├── Select.tsx               # Dropdowns, filters
│   ├── Dialog.tsx               # Modals, mobile filters
│   ├── Drawer.tsx               # Cart drawer, mobile menu
│   ├── Badge.tsx                # Product badges, sale tags
│   ├── Separator.tsx            # Section dividers
│   └── Skeleton.tsx             # Loading states
│
├── navigation/                  # Navigation-specific components
│   ├── Navbar.tsx               # Main navigation bar
│   ├── MegaMenu.tsx             # Desktop mega menu dropdown
│   ├── MobileMenu.tsx           # Mobile hamburger menu
│   ├── SearchBar.tsx            # Global search input
│   ├── CartIcon.tsx             # Cart icon with badge
│   └── Breadcrumbs.tsx          # Page breadcrumb navigation
│
├── sections/                    # Homepage and landing page sections
│   ├── HeroSection.tsx          # Split-screen hero
│   ├── CategoryTiles.tsx        # Indian heritage category grid
│   ├── SeasonalCollection.tsx   # Seasonal collection block
│   ├── BestSellers.tsx          # Best sellers product grid
│   ├── NewArrivals.tsx          # New arrivals product grid
│   └── SaleStrip.tsx            # Optional promotional strip
│
├── product/                     # Product-related components
│   ├── ProductCard.tsx          # Product card for grids
│   ├── ProductGrid.tsx          # Responsive product grid wrapper
│   ├── ProductImageGallery.tsx  # PDP image gallery
│   ├── ProductInfo.tsx          # PDP product information column
│   ├── VariantSelector.tsx      # Color/size variant picker
│   ├── FabricWorkSection.tsx    # Fabric + Work attributes display
│   ├── RelatedProducts.tsx      # Related products section
│   └── ProductFilters.tsx       # PLP filter sidebar
│
├── cart/                        # Cart-related components
│   ├── CartDrawer.tsx           # Slide-over cart drawer
│   ├── CartItem.tsx             # Individual cart item row
│   ├── CartSummary.tsx          # Cart totals and checkout CTA
│   └── MiniCart.tsx             # Optional mini cart preview
│
├── common/                      # Shared reusable components
│   ├── Footer.tsx               # Site footer
│   ├── LoadingSpinner.tsx       # Loading indicators
│   ├── EmptyState.tsx           # Empty state messages
│   ├── ErrorBoundary.tsx        # Error handling component
│   └── Image.tsx                # Optimized Supabase image wrapper
│
└── checkout/                    # Checkout flow components
    ├── AddressForm.tsx          # Shipping address form
    ├── ShippingMethod.tsx       # Shipping options selector
    ├── PaymentMethod.tsx        # Payment method placeholder
    └── OrderSummary.tsx         # Checkout order summary box
```

**Component Reusability Principles:**
- **UI Components:** Pure, unstyled base components (shadcn style)
- **Feature Components:** Composed of UI components + business logic
- **Section Components:** Full-featured sections with data fetching
- **Common Components:** Shared across multiple features

**Import Path Strategy:**
- Use `@/components/ui/Button` for UI components
- Use `@/components/navigation/Navbar` for feature components
- Use `@/components/sections/HeroSection` for sections
- Avoid deep nesting (maximum 2 levels)

---

### 2.2 App Router Structure (`app/(storefront)/`)

**Route Group Organization:**

```
app/(storefront)/
├── layout.tsx                   # Storefront layout (navbar, footer, providers)
├── page.tsx                     # Homepage
│
├── product/
│   └── [slug]/
│       ├── layout.tsx           # Product detail page layout (optional)
│       └── page.tsx             # Product detail page
│
├── collections/
│   ├── page.tsx                 # All collections listing (optional)
│   └── [slug]/
│       ├── layout.tsx           # Collection page layout (optional)
│       └── page.tsx             # Collection/PLP page
│
├── cart/
│   └── page.tsx                 # Cart page (full page view, optional)
│
├── checkout/
│   └── page.tsx                 # Checkout page
│
└── [other routes]/              # Future routes (about, contact, etc.)
```

**Layout Inheritance:**
- `app/(storefront)/layout.tsx` wraps all storefront routes
- Individual route layouts (`product/[slug]/layout.tsx`) can add route-specific wrappers
- Homepage (`page.tsx`) uses sections directly, no nested layout needed
- PLP (`collections/[slug]/page.tsx`) may have a layout for filter persistence

**Page Component Responsibilities:**
- **Homepage (`page.tsx`):** Composes sections, fetches homepage data
- **PLP (`collections/[slug]/page.tsx`):** Handles filters, sorting, product grid
- **PDP (`product/[slug]/page.tsx`):** Product detail, variant selection, related products
- **Checkout (`checkout/page.tsx`):** Multi-step form, order summary

---

## 3. Homepage Section Map

### 3.1 Section Architecture Overview

**Homepage Structure:**

```
Homepage (app/(storefront)/page.tsx)
├── HeroSection                  # Split-screen hero
├── CategoryTiles                # Indian heritage category grid
├── SeasonalCollection           # Seasonal collection block
├── BestSellers                  # Best sellers product grid
├── NewArrivals                  # New arrivals product grid
├── SaleStrip (optional)         # Promotional strip
└── [Footer rendered by layout]  # Footer from storefront layout
```

**Section Composition Strategy:**
- Each section is a self-contained component in `components/sections/`
- Homepage `page.tsx` imports and composes sections
- Sections handle their own data fetching (Server Components)
- Sections are independently responsive

---

### 3.2 Split-Screen Hero Section

**Component:** `components/sections/HeroSection.tsx`

**Purpose:**  
Primary visual entry point showcasing brand identity and featured collection/product.

**Layout Structure:**
- **Desktop:** 50/50 split (left: image, right: content OR vice versa)
- **Mobile:** Stacked (image full-width top, content below)
- **Tablet:** Adaptive (may stack or maintain split based on content)

**Content Structure:**
- **Left Side (or Top on Mobile):**
  - Hero image (from Supabase Storage: `banners/hero-{campaign-slug}-{date}.jpg`)
  - Image aspect ratio: 21:9 (desktop), 16:9 (mobile)
  - Overlay: Optional subtle gradient (5% opacity gold or vine red)
- **Right Side (or Bottom on Mobile):**
  - Headline (serif, Display XL or Display 2XL)
  - Subheadline (sans serif, Body LG)
  - CTA button ("Explore Collection" or "Discover")
  - Optional: Secondary CTA ("View Collection")

**Data Dependencies:**
- Hero image URL from database (`banners` table or `campaigns` table)
- Headline and subheadline from database (campaign content)
- CTA link destination (collection slug or product slug)
- Seasonal/festive content toggle (vine red accents during festive periods)

**Responsive Behavior:**
- Desktop: Side-by-side layout, image and content equal width
- Tablet: May stack or maintain split with adjusted proportions
- Mobile: Always stacked, image full-width, content centered below

**Brand Alignment:**
- Uses serif font for headline (elegance)
- Gold accent on CTA button (luxury)
- Subtle cultural elements in image (not overwhelming)
- Maximum 8 words in headline

---

### 3.3 Indian Heritage Category Tiles

**Component:** `components/sections/CategoryTiles.tsx`

**Purpose:**  
Showcase main product categories (wedding, festive, luxury, everyday) with visual tiles linking to collection pages.

**Layout Structure:**
- **Desktop:** 4-column grid (wedding, festive, luxury, everyday)
- **Tablet:** 2-column grid
- **Mobile:** Single column, stacked

**Tile Structure (per category):**
- **Image:** Category tile image (from Supabase Storage: `categories/{category-slug}-tile.jpg`)
- **Overlay:** Subtle cultural pattern at 5-10% opacity (optional)
- **Content:**
  - Category name (serif, Display MD)
  - Short description (sans serif, Body SM, optional)
  - "Explore" link (subtle, gold accent on hover)

**Data Dependencies:**
- Categories from database (`categories` table with `is_featured` flag)
- Category images from Supabase Storage
- Category slugs for routing (`/collections/{slug}`)
- Category descriptions (optional, from database)

**Category Mapping:**
- **Wedding:** Bridal wear, wedding collections
- **Festive:** Festival-specific collections (Diwali, Holi, etc.)
- **Luxury:** Premium, high-end collections
- **Everyday:** Casual, daily wear collections

**Responsive Behavior:**
- Desktop: 4 tiles in a row, equal spacing
- Tablet: 2 tiles per row, 2 rows
- Mobile: Single column, full-width tiles

**Brand Alignment:**
- Subtle cultural patterns (not overwhelming)
- Clean, minimal tile design
- Gold accent on hover (luxury feel)
- Serif font for category names (elegance)

---

### 3.4 Seasonal Collection Block

**Component:** `components/sections/SeasonalCollection.tsx`

**Purpose:**  
Highlight current seasonal or festive collection with featured products and collection-level CTA.

**Layout Structure:**
- **Desktop:** Full-width banner with product grid (3-4 products featured)
- **Mobile:** Stacked banner and product grid (2 products featured)

**Content Structure:**
- **Header:**
  - Section title (serif, Display LG): "Seasonal Collection" or "Festive Collection"
  - Optional subtitle (sans serif, Body MD)
- **Product Grid:**
  - 3-4 featured products (desktop), 2 products (mobile)
  - Product cards with images, names, prices
  - "View All" link to collection page
- **Background:**
  - Subtle gradient or pattern (5% opacity maximum)
  - Festive periods: May use vine red accents (10% opacity)

**Data Dependencies:**
- Seasonal collection from database (`collections` table with `is_seasonal` flag)
- Featured products from collection (top 3-4 products)
- Collection image (optional banner: `categories/{collection-slug}-banner.jpg`)
- Current date for seasonal/festive detection

**Responsive Behavior:**
- Desktop: Horizontal layout, products in a row
- Mobile: Vertical layout, products stacked

**Brand Alignment:**
- Seasonal messaging aligns with brand voice (elegant, not urgent)
- Festive accents only during appropriate periods
- Product-focused, not promotional-heavy

---

### 3.5 Best Sellers Block

**Component:** `components/sections/BestSellers.tsx`

**Purpose:**  
Display top-selling products based on sales data.

**Layout Structure:**
- **Desktop:** Horizontal scrolling product grid (4-6 products visible)
- **Mobile:** Horizontal scrolling product grid (2 products visible)

**Content Structure:**
- **Header:**
  - Section title (serif, Display LG): "Best Sellers"
  - Optional "View All" link
- **Product Grid:**
  - Horizontal scrollable grid
  - Product cards (from `components/product/ProductCard.tsx`)
  - Each card: Image, name, price, "Add to Cart" button

**Data Dependencies:**
- Products from database (`products` table)
- Sales data aggregation (`order_items` table join)
- Top N products (configurable, default 8-12)
- Product images from Supabase Storage

**Responsive Behavior:**
- Desktop: 4-6 products visible, horizontal scroll
- Tablet: 3 products visible, horizontal scroll
- Mobile: 2 products visible, horizontal scroll
- Smooth scroll behavior, no pagination dots (luxury feel)

**Brand Alignment:**
- Clean product cards (no sale badges unless actually on sale)
- Gold accent on "Add to Cart" buttons
- Minimal, product-focused design

---

### 3.6 New Arrivals Block

**Component:** `components/sections/NewArrivals.tsx`

**Purpose:**  
Showcase recently added products to encourage exploration.

**Layout Structure:**
- **Desktop:** Horizontal scrolling product grid (4-6 products visible)
- **Mobile:** Horizontal scrolling product grid (2 products visible)

**Content Structure:**
- **Header:**
  - Section title (serif, Display LG): "New Arrivals"
  - Optional "View All" link
- **Product Grid:**
  - Same structure as Best Sellers
  - Optional "New" badge on product cards (subtle, gold accent)

**Data Dependencies:**
- Products from database (`products` table)
- Filter by `created_at` date (last 30-60 days)
- Sorted by newest first
- Product images from Supabase Storage

**Responsive Behavior:**
- Same as Best Sellers (horizontal scroll, responsive column count)

**Brand Alignment:**
- "New" badge is subtle (not garish)
- Same product card design as Best Sellers (consistency)

---

### 3.7 Optional Sale Strip

**Component:** `components/sections/SaleStrip.tsx`

**Purpose:**  
Promotional banner for sales or special offers (only displayed when active).

**Layout Structure:**
- **Desktop:** Full-width horizontal strip (top of page or between sections)
- **Mobile:** Full-width horizontal strip, text may wrap

**Content Structure:**
- **Text:** Sale message (elegant, not urgent)
- **CTA:** Optional "Shop Sale" link
- **Background:** Subtle gold or vine red gradient (10% opacity maximum)

**Data Dependencies:**
- Sale status from database (`sales` or `campaigns` table)
- Sale message from database
- Sale end date for conditional display
- Only displayed when sale is active

**Display Rules:**
- Only shown when active sale exists in database
- Never hardcoded
- Message tone: Elegant ("Discover our seasonal collection" not "HUGE SALE!")
- Maximum height: `60px` (desktop), `80px` (mobile)

**Brand Alignment:**
- Elegant messaging (no urgency language)
- Subtle background (not overwhelming)
- Gold or vine red accents (luxury + festive)

---

### 3.8 Footer

**Component:** `components/common/Footer.tsx`

**Purpose:**  
Site-wide footer with links, contact info, and brand information.

**Layout Structure:**
- **Desktop:** 4-column grid (Links, Categories, Contact, Newsletter)
- **Mobile:** Stacked columns, single column layout

**Content Structure:**
- **Column 1: Brand & Links**
  - Brand name/logo
  - About link
  - Contact link
  - Privacy Policy link
  - Terms of Service link
- **Column 2: Categories**
  - Main category links (from database)
  - Dynamic list based on featured categories
- **Column 3: Contact Info**
  - Email address
  - Phone number (optional)
  - Social media links (optional)
- **Column 4: Newsletter**
  - Newsletter signup form (optional, future)
  - Email input + submit button

**Data Dependencies:**
- Categories from database (for category links)
- Contact info (may be static or from database)
- Brand info (static or from database)

**Responsive Behavior:**
- Desktop: 4-column grid
- Tablet: 2-column grid
- Mobile: Single column, stacked

**Brand Alignment:**
- Clean, minimal design
- Gold accent on links (hover state)
- Serif font for brand name (elegance)
- Sans serif for links and text (readability)

---

## 4. PLP (Product Listing Page) Layout Architecture

### 4.1 PLP Structure Overview

**Route:** `app/(storefront)/collections/[slug]/page.tsx`

**Purpose:**  
Display filtered and sorted product listings for a collection/category.

**Layout Structure:**

```
PLP Layout:
├── Page Header
│   ├── Breadcrumbs
│   ├── Collection Title (serif, Display XL)
│   └── Collection Description (optional)
├── Main Content Area
│   ├── Filter Sidebar (desktop) / Filter Drawer (mobile)
│   └── Product Grid Area
│       ├── Sort Bar
│       ├── Product Grid
│       └── Pagination (future)
└── [Footer from layout]
```

---

### 4.2 Filter Sidebar Layout (Desktop)

**Component:** `components/product/ProductFilters.tsx`

**Position:** Left sidebar, fixed width (`280px`), scrollable if content exceeds viewport

**Filter Categories:**
- **Price Range:** Slider or input fields (min/max)
- **Fabric Type:** Checkboxes (Pure Silk, Cotton Silk, Georgette, etc.)
- **Work Type:** Checkboxes (Zari Work, Embroidery, Print, etc.)
- **Occasion:** Checkboxes (Wedding, Festive, Everyday, Luxury)
- **Color:** Color swatches or checkboxes
- **Size:** Checkboxes (if applicable)
- **Availability:** Radio buttons (In Stock, Out of Stock, All)

**Filter UI Structure:**
- Each filter category is collapsible (accordion style)
- Filter labels: Sans serif, Body MD, Silver-dark
- Filter values: Sans serif, Body SM, Black
- Active filters: Gold accent border or background
- "Clear Filters" button at bottom (gold accent)

**Data Dependencies:**
- Filter options from database (distinct values from `products` table)
- Active filters from URL query parameters (`?fabric=pure_silk&work=zari_work`)
- Product count after filtering (displayed in filter sidebar)

**Query Parameter Strategy:**
- Filters stored in URL query params (e.g., `?fabric=pure_silk&price_min=1000&price_max=5000`)
- No page reload on filter change (client-side navigation)
- Filters persist across page navigation
- "Clear All" resets URL to base collection URL

---

### 4.3 Mobile Filter Drawer

**Component:** `components/product/ProductFilters.tsx` (same component, different wrapper)

**Position:** Slide-over drawer from bottom or side (mobile)

**Trigger:** "Filters" button in sort bar (mobile only)

**Structure:**
- Same filter categories as desktop sidebar
- Drawer overlay (backdrop with 50% opacity black)
- Drawer content: Scrollable, full-height minus header
- Header: "Filters" title + "Close" button + "Clear All" button
- Footer: "Apply Filters" button (gold accent, full-width)

**Behavior:**
- Opens on "Filters" button click
- Closes on backdrop click, close button, or "Apply Filters"
- Filters applied on "Apply Filters" click (updates URL)
- Drawer state managed by Dialog component (shadcn)

---

### 4.4 Product Grid Rules

**Component:** `components/product/ProductGrid.tsx`

**Grid Layout:**
- **Desktop (>1024px):** 3 columns
- **Tablet (768px-1024px):** 2 columns
- **Mobile (<768px):** 1 column

**Grid Spacing:**
- Gap between products: `1.5rem` (desktop), `1rem` (mobile)
- Grid padding: Inherits from page container padding

**Product Card Structure:**
- Each product rendered using `components/product/ProductCard.tsx`
- Card includes: Image, name, price, optional badge, "Add to Cart" button
- Card aspect ratio: 4:5 (vertical, fashion-focused)

**Empty State:**
- When no products match filters: Display `components/common/EmptyState.tsx`
- Message: "No products found. Try adjusting your filters."
- Optional: "Clear Filters" button

**Loading State:**
- While fetching: Display skeleton cards (`components/ui/Skeleton.tsx`)
- Skeleton matches product card layout (image placeholder + text placeholders)

**Data Dependencies:**
- Products from database (`products` table)
- Filtered by collection slug (`collections` table join)
- Filtered by query parameters (fabric, work, price, etc.)
- Sorted by sort option (price, name, newest, etc.)
- Paginated (future: infinite scroll or page numbers)

---

### 4.5 Sorting Bar

**Component:** `components/product/SortBar.tsx` (or part of ProductGrid)

**Position:** Above product grid, right-aligned (desktop), full-width (mobile)

**Layout:**
- **Desktop:** "Sort by:" label + dropdown select
- **Mobile:** Full-width select dropdown

**Sort Options:**
- "Newest First" (default)
- "Price: Low to High"
- "Price: High to Low"
- "Name: A to Z"
- "Name: Z to A"
- "Best Sellers" (if sales data available)

**UI:**
- Select component from `components/ui/Select.tsx`
- Label: Sans serif, Body SM, Silver-dark
- Dropdown: Sans serif, Body MD, Black
- Active option: Gold accent (subtle)

**Query Parameter Strategy:**
- Sort stored in URL query param (`?sort=price_asc`)
- Changes trigger product refetch (no page reload)
- Sort persists across filter changes

---

### 4.6 Remaining Space for Future Sale Logic Integration

**Reserved Areas:**
- **Sale Badge on Product Cards:** Space reserved for sale badge (top-right corner of product card)
- **Sale Filter Option:** Space in filter sidebar for "On Sale" checkbox
- **Sale Sort Option:** "Price: Sale First" option in sort dropdown
- **Sale Banner:** Optional banner above product grid when collection has active sale

**Integration Points:**
- Sale status from database (`products.on_sale`, `products.sale_price`)
- Sale badge component: `components/ui/Badge.tsx` (gold or vine red accent)
- Sale price display: Strikethrough original price + sale price in gold
- Sale filter: Filters products where `on_sale = true`

**No Implementation:**  
These areas are architecturally reserved but not implemented in this phase.

---

## 5. PDP (Product Detail Page) Structure

### 5.1 PDP Layout Overview

**Route:** `app/(storefront)/product/[slug]/page.tsx`

**Purpose:**  
Display complete product information, images, variants, and purchase options.

**Layout Structure:**

```
PDP Layout:
├── Breadcrumbs
├── Main Content Area (Desktop: 2-column, Mobile: Stacked)
│   ├── Left Column: Image Gallery
│   └── Right Column: Product Info
│       ├── Product Name
│       ├── Price
│       ├── Variant Selector
│       ├── Add to Cart Button
│       ├── Fabric + Work Attributes
│       └── Product Description
├── Related Products Section
└── [Footer from layout]
```

---

### 5.2 Image Gallery Layout

**Component:** `components/product/ProductImageGallery.tsx`

**Desktop Layout:**
- **Main Image:** Large display area (left side, 60% width)
  - Aspect ratio: 4:5 (vertical)
  - Image from Supabase Storage: `products/{product-id}/hero-{product-id}-{variant-id}.jpg`
  - Zoom functionality (optional, future)
  - Fullscreen view on click (optional, future)
- **Thumbnail Strip:** Vertical strip (right side, 40% width)
  - 4-6 thumbnail images
  - Active thumbnail: Gold border
  - Scrollable if more than 6 images
  - Click thumbnail to change main image

**Mobile Layout:**
- **Main Image:** Full-width carousel
  - Swipeable (touch gestures)
  - Dot indicators at bottom (optional)
  - Same aspect ratio: 4:5
- **Thumbnail Strip:** Horizontal strip below main image (optional, or hidden)
  - Scrollable horizontally
  - Smaller thumbnails

**Image Sources:**
- Hero image: `products/{product-id}/hero-{product-id}-{variant-id}.jpg`
- Detail images: `products/{product-id}/detail-{product-id}-{variant-id}-{sequence}.jpg`
- Lifestyle images: `products/{product-id}/lifestyle-{product-id}-{variant-id}-{sequence}.jpg`
- All images from Supabase Storage (no external URLs)

**Data Dependencies:**
- Product images from database (`product_images` table)
- Variant-specific images (if variants have different images)
- Image order/sequence for display order

**Responsive Behavior:**
- Desktop: Side-by-side (main + thumbnails)
- Tablet: May stack or maintain side-by-side
- Mobile: Full-width carousel

---

### 5.3 Product Info Column Structure

**Component:** `components/product/ProductInfo.tsx`

**Desktop Position:** Right column (40% width)

**Mobile Position:** Below image gallery, full-width

**Content Hierarchy (top to bottom):**

1. **Product Name**
   - Serif font, Display LG
   - Single line or wrapped (max 2 lines)
   - Color: Black (`#0A0A0A`)

2. **Price**
   - Sans serif, Display MD
   - Gold accent color (`#D4AF37`)
   - Format: "₹X,XXX" (Indian Rupee symbol)
   - Sale price: Strikethrough original + sale price in gold
   - Optional: "Starting from ₹X,XXX" if multiple variants

3. **Variant Selector**
   - Component: `components/product/VariantSelector.tsx`
   - Color variants: Color swatches (circles with border)
   - Size variants: Button group (if applicable)
   - Selected variant: Gold border or background
   - Variant name displayed below selector

4. **Add to Cart Button**
   - Primary CTA button (gold background, black text)
   - Full-width on mobile, auto-width on desktop
   - Disabled state: If out of stock or no variant selected
   - Loading state: While adding to cart

5. **Fabric + Work Attributes**
   - Component: `components/product/FabricWorkSection.tsx`
   - Position: Below Add to Cart button
   - Layout: 2-column grid (desktop), stacked (mobile)
   - See Section 5.4 for details

6. **Product Description**
   - Sans serif, Body MD
   - Multi-paragraph text
   - Formatting: Bold for key features, bullet points for details
   - Read more/less toggle if description is long

**Data Dependencies:**
- Product data from database (`products` table)
- Variants from database (`product_variants` table)
- Inventory status (`inventory` table or `variants.stock_quantity`)
- Fabric/work attributes from product record

**Responsive Behavior:**
- Desktop: Right column, fixed width
- Mobile: Full-width, stacked below image gallery

---

### 5.4 Variant Switching Placement

**Component:** `components/product/VariantSelector.tsx`

**Position:** Within Product Info column, below price, above Add to Cart button

**Variant Types:**
- **Color Variants:** Primary variant type
  - Display: Color swatches (circles, `32px` diameter)
  - Swatch border: `2px` solid (black default, gold when selected)
  - Swatch background: Actual color (from `variants.color_hex` or image)
  - Hover: Slight scale (1.1x)
  - Label: Variant name below swatch (optional)
- **Size Variants:** Secondary (if applicable)
  - Display: Button group (horizontal row)
  - Buttons: Outlined style, gold border when selected
  - Labels: Size codes (S, M, L, XL) or measurements

**Variant Selection Logic:**
- Clicking variant updates selected variant state
- Selected variant: Gold accent (border or background)
- Main image updates to variant-specific image (if available)
- Price updates to variant-specific price (if different)
- Stock status updates based on variant inventory

**Out of Stock Handling:**
- Out of stock variants: Grayed out, disabled
- Visual indicator: "Out of Stock" text or icon
- Cannot select out of stock variants

**Data Dependencies:**
- Variants from database (`product_variants` table)
- Variant images (if variant-specific images exist)
- Variant prices (if prices differ by variant)
- Inventory status per variant

---

### 5.5 Fabric + Work Attributes Block

**Component:** `components/product/FabricWorkSection.tsx`

**Position:** Below Add to Cart button, within Product Info column

**Layout:**
- **Desktop:** 2-column grid
- **Mobile:** Single column, stacked

**Fabric Attributes Section:**
- **Title:** "Details" (sans serif, Body MD, Silver-dark)
- **Attributes:**
  - Fabric Type: Label + Value
  - Fabric Weight: Label + Value
  - Fabric Origin: Label + Value
  - Care Instructions: Label + Value
- **Styling:**
  - Label: Sans serif, Body SM, Silver-dark (`#808080`)
  - Value: Sans serif, Body MD, Black (`#0A0A0A`)
  - Separator: `1px solid #E8E8E8` between items
  - Padding: `1rem` vertical spacing

**Work Attributes Section:**
- **Title:** "Work & Embellishment" (sans serif, Body MD, Silver-dark)
- **Attributes:**
  - Work Type: Label + Value
  - Work Detail: Label + Value
  - Work Coverage: Label + Value
  - Technique: Label + Value
- **Styling:** Same as Fabric Attributes

**Data Dependencies:**
- Fabric attributes from product record (`products.fabric_type`, `products.fabric_weight`, etc.)
- Work attributes from product record (`products.work_type`, `products.work_detail`, etc.)
- Display names formatted from database values (e.g., `pure_silk` → "Pure Silk")

**Responsive Behavior:**
- Desktop: 2-column grid (Fabric | Work)
- Mobile: Stacked (Fabric above Work)

---

### 5.6 Related Products Section

**Component:** `components/product/RelatedProducts.tsx`

**Position:** Below main product content, full-width section

**Layout:**
- **Desktop:** Horizontal scrolling grid (4 products visible)
- **Mobile:** Horizontal scrolling grid (2 products visible)

**Content Structure:**
- **Header:**
  - Section title (serif, Display LG): "You May Also Like" or "Related Products"
- **Product Grid:**
  - Same product cards as PLP (`components/product/ProductCard.tsx`)
  - Horizontal scroll (smooth, no pagination dots)

**Data Dependencies:**
- Related products from database (same category, similar fabric/work, or algorithm-based)
- Product images from Supabase Storage
- Related products logic: Same category, similar price range, or manual curation

**Responsive Behavior:**
- Desktop: 4 products visible, horizontal scroll
- Tablet: 3 products visible, horizontal scroll
- Mobile: 2 products visible, horizontal scroll

---

## 6. Navigation System Architecture

### 6.1 Navbar Layout

**Component:** `components/navigation/Navbar.tsx`

**Position:** Fixed or sticky at top of page (within storefront layout)

**Desktop Layout:**

```
Navbar (Desktop):
├── Top Bar (optional: promotional message or sale banner)
├── Main Navbar
│   ├── Left: Logo/Brand Name
│   ├── Center: Main Navigation Links (Categories)
│   └── Right: Search Icon, Cart Icon, User Icon (optional)
└── Mega Menu (dropdown, appears on hover/click)
```

**Mobile Layout:**

```
Navbar (Mobile):
├── Top Bar (collapsed or hidden)
├── Main Navbar
│   ├── Left: Hamburger Menu Icon
│   ├── Center: Logo/Brand Name
│   └── Right: Search Icon, Cart Icon
└── Mobile Menu (drawer, slides in from left)
```

**Styling:**
- Background: White (`#FAFAFA`) or Black (`#0A0A0A`) based on brand preference
- Height: `64px` (desktop), `56px` (mobile)
- Border: `1px solid #E8E8E8` (bottom border)
- Logo: Serif font (brand name) or image from Supabase Storage

**Data Dependencies:**
- Categories from database (`categories` table)
- Super categories (parent categories) for mega menu
- Cart count from Zustand store or Supabase
- User state (if logged in) from Supabase Auth

---

### 6.2 Mega Menu Structure

**Component:** `components/navigation/MegaMenu.tsx`

**Trigger:** Hover over category link (desktop) or click category link (tablet/mobile)

**Desktop Layout:**

```
Mega Menu (Desktop):
├── Super Category Columns (3-4 columns)
│   ├── Column 1: Super Category Name (serif, Display MD)
│   │   ├── Subcategory Links (sans serif, Body MD)
│   │   └── "View All" link (gold accent)
│   ├── Column 2: Super Category Name
│   │   ├── Subcategory Links
│   │   └── "View All" link
│   └── [Additional columns...]
└── Featured Image (optional, right side)
    └── Category image or featured product image
```

**Super Category Examples:**
- **Sarees** (subcategories: Silk Sarees, Cotton Sarees, Designer Sarees)
- **Lehengas** (subcategories: Bridal Lehengas, Party Lehengas, Casual Lehengas)
- **Suits & Sets** (subcategories: Anarkali Suits, Palazzo Suits, Indo-Western)
- **Accessories** (subcategories: Jewelry, Bags, Footwear)
- **Men's Wear** (subcategories: Kurta, Sherwani, Indo-Western)
- **Collections** (subcategories: Wedding Collection, Festive Collection, Luxury Collection)

**Styling:**
- Background: White (`#FAFAFA`)
- Border: `1px solid #E8E8E8` (top border)
- Shadow: Subtle shadow (`0 4px 6px rgba(0, 0, 0, 0.1)`)
- Padding: `2rem` (desktop)
- Width: Full-width (spans entire viewport width)
- Max-height: `500px` (scrollable if content exceeds)

**Data Dependencies:**
- Super categories from database (`categories` table where `parent_id IS NULL`)
- Subcategories from database (`categories` table where `parent_id = super_category_id`)
- Category images (optional, from Supabase Storage)
- Category slugs for routing

**Behavior:**
- Opens on hover (desktop) or click (tablet)
- Closes on mouse leave (desktop) or click outside (tablet/mobile)
- Smooth animation (fade in/out, 0.3s duration)

---

### 6.3 Mobile Menu (Hamburger Menu)

**Component:** `components/navigation/MobileMenu.tsx`

**Trigger:** Hamburger icon click (left side of navbar)

**Layout:**

```
Mobile Menu (Drawer):
├── Header
│   ├── Brand Name/Logo
│   └── Close Button (X icon)
├── Menu Items (scrollable)
│   ├── Super Category (accordion)
│   │   ├── Super Category Name (clickable, expands)
│   │   └── Subcategory Links (revealed on expand)
│   ├── Super Category (accordion)
│   │   └── [Same structure...]
│   └── [Additional menu items...]
└── Footer (optional)
    ├── Search Bar
    └── User Account Link (if logged in)
```

**Styling:**
- Drawer: Slides in from left (full-height, `320px` width)
- Background: White (`#FAFAFA`)
- Overlay: Black backdrop (`50%` opacity)
- Accordion: Expands/collapses subcategories
- Active category: Gold accent (border or background)

**Behavior:**
- Opens on hamburger click
- Closes on backdrop click, close button, or menu item click
- Smooth slide animation (0.3s duration)
- Subcategories expand/collapse with accordion animation

**Data Dependencies:**
- Same as mega menu (super categories + subcategories)
- User state (for account link)

---

### 6.4 Search Bar Placement

**Component:** `components/navigation/SearchBar.tsx`

**Desktop Placement:**
- **Option 1:** Icon in navbar (right side), expands to full search bar on click
- **Option 2:** Always visible search bar (center or right side of navbar)
- **Recommended:** Icon that expands to search bar (cleaner navbar)

**Mobile Placement:**
- **Option 1:** Icon in navbar, opens search drawer/modal on click
- **Option 2:** Search bar in mobile menu drawer
- **Recommended:** Icon that opens search modal (full-screen or drawer)

**Search Bar Structure:**
- **Input Field:** Text input, placeholder "Search products..."
- **Search Icon:** Inside input (left side) or as button (right side)
- **Results Dropdown:** Appears below input (desktop) or full-screen (mobile)
  - Recent searches (optional)
  - Popular searches (optional)
  - Search results preview (products matching query)

**Search Results Display:**
- Product cards (mini version: image + name + price)
- "View All Results" link
- Maximum 5-8 results in dropdown
- Full results page: `/search?q={query}` (future route)

**Data Dependencies:**
- Search query from input
- Products from database (full-text search on `products.name`, `products.description`)
- Search results sorted by relevance or popularity

**Behavior:**
- Search on input change (debounced, 300ms delay)
- Results update as user types
- Click result navigates to product page
- Click outside closes dropdown

---

### 6.5 Cart Icon & State Management Placeholder

**Component:** `components/navigation/CartIcon.tsx`

**Position:** Right side of navbar (desktop and mobile)

**Visual Structure:**
- **Icon:** Shopping cart icon (Lucide React)
- **Badge:** Item count badge (top-right corner of icon)
  - Background: Gold (`#D4AF37`)
  - Text: White or Black (for contrast)
  - Shape: Circle or pill
  - Only visible when cart has items (count > 0)

**Styling:**
- Icon size: `24px` (desktop), `20px` (mobile)
- Badge size: `18px` diameter (minimum)
- Badge position: Absolute, top-right of icon
- Hover: Gold accent on icon (if no badge)

**Behavior:**
- Click icon: Opens cart drawer (`components/cart/CartDrawer.tsx`)
- Badge updates in real-time (when items added/removed)
- Badge hidden when cart is empty

**State Management:**
- Cart state: Zustand store (client-side)
- Cart persistence: Supabase (server-side, synced on add/remove)
- Cart count: Computed from cart items array length
- Real-time updates: Zustand store subscriptions

**Data Dependencies:**
- Cart items from Zustand store
- Cart count computed from store
- Cart drawer opens on icon click

---

## 7. Cart Drawer Architecture

### 7.1 Cart Slide-Over Layout

**Component:** `components/cart/CartDrawer.tsx`

**Position:** Slide-over drawer from right side of screen

**Trigger:** Cart icon click (navbar) or "View Cart" button (product page)

**Layout Structure:**

```
Cart Drawer:
├── Header
│   ├── Title: "Shopping Cart" (serif, Display MD)
│   └── Close Button (X icon)
├── Cart Items (scrollable)
│   ├── Cart Item 1
│   ├── Cart Item 2
│   └── [Additional items...]
├── Empty State (if cart is empty)
│   └── "Your cart is empty" message + "Continue Shopping" button
└── Footer (sticky at bottom)
    ├── Cart Summary
    └── Checkout Button
```

**Drawer Dimensions:**
- **Desktop:** `420px` width, full-height
- **Mobile:** Full-width (`100vw`), full-height
- **Overlay:** Black backdrop (`50%` opacity)

**Styling:**
- Background: White (`#FAFAFA`)
- Border: `1px solid #E8E8E8` (left border, desktop)
- Shadow: Subtle shadow (`0 4px 6px rgba(0, 0, 0, 0.1)`)
- Animation: Slide in from right (0.3s duration)

**Behavior:**
- Opens on cart icon click
- Closes on backdrop click, close button, or checkout button click
- Scrollable cart items area (if items exceed viewport)
- Footer remains sticky at bottom

**Data Dependencies:**
- Cart items from Zustand store
- Product data from database (for cart item details)
- Product images from Supabase Storage

---

### 7.2 Cart Item Structure

**Component:** `components/cart/CartItem.tsx`

**Layout:**

```
Cart Item:
├── Product Image (left, 80px × 100px)
├── Product Info (center, flex-grow)
│   ├── Product Name (sans serif, Body MD)
│   ├── Variant Info (sans serif, Body SM, Silver-dark)
│   ├── Price (sans serif, Body MD, Gold accent)
│   └── Quantity Selector
└── Remove Button (right, X icon)
```

**Product Image:**
- Aspect ratio: 4:5 (vertical)
- Source: Supabase Storage (`products/{product-id}/thumbnail-{product-id}-{variant-id}.jpg`)
- Size: `80px × 100px` (fixed)

**Product Info:**
- **Product Name:** Sans serif, Body MD, Black
- **Variant Info:** Color, size (if applicable), sans serif, Body SM, Silver-dark
- **Price:** Sans serif, Body MD, Gold accent (`#D4AF37`)
- **Quantity Selector:** Input field or +/- buttons
  - Min: 1
  - Max: Stock quantity (from database)
  - Updates cart on change

**Remove Button:**
- Icon: X icon (Lucide React)
- Position: Top-right of cart item
- Hover: Gold accent
- Click: Removes item from cart

**Styling:**
- Border: `1px solid #E8E8E8` (bottom border, between items)
- Padding: `1rem` vertical, `1.5rem` horizontal
- Hover: Subtle background change (optional)

**Data Dependencies:**
- Cart item data from Zustand store (product_id, variant_id, quantity)
- Product details from database (name, price, image)
- Variant details from database (color, size)

**Behavior:**
- Quantity change updates cart store (and Supabase)
- Remove button removes item from cart
- Price updates based on quantity
- Out of stock handling: Disable quantity increase if stock insufficient

---

### 7.3 Summary Block Structure

**Component:** `components/cart/CartSummary.tsx`

**Position:** Sticky footer of cart drawer

**Layout:**

```
Cart Summary:
├── Subtotal
│   ├── Label: "Subtotal" (sans serif, Body MD, Silver-dark)
│   └── Value: "₹X,XXX" (sans serif, Body MD, Black)
├── Shipping (optional)
│   ├── Label: "Shipping" (sans serif, Body MD, Silver-dark)
│   └── Value: "Calculated at checkout" or "Free" (sans serif, Body SM, Silver-dark)
├── Total
│   ├── Label: "Total" (sans serif, Body LG, Black)
│   └── Value: "₹X,XXX" (sans serif, Display MD, Gold accent)
├── Separator (1px solid #E8E8E8)
└── Checkout Button
    └── "Proceed to Checkout" (gold background, black text, full-width)
```

**Styling:**
- Background: White (`#FAFAFA`)
- Padding: `1.5rem`
- Border: `1px solid #E8E8E8` (top border)
- Sticky: Fixed at bottom of drawer

**Checkout Button:**
- Full-width button
- Gold background (`#D4AF37`), black text
- Disabled if cart is empty
- Click: Navigates to `/checkout` page

**Data Dependencies:**
- Cart items from Zustand store
- Subtotal: Sum of (item price × quantity) for all items
- Total: Subtotal + shipping (shipping calculated at checkout)
- Discount: Future discount logic (not implemented in this phase)

**Future Discount Logic Integration:**
- **Discount Code Input:** Space reserved above subtotal for discount code input field
- **Discount Display:** Space reserved in summary for discount line item
- **Discount Calculation:** Discount applied to subtotal before total calculation
- **Integration Point:** Discount logic will plug into CartSummary component (no implementation in this phase)

---

## 8. Checkout Architecture (Skeleton Only)

### 8.1 Checkout Page Structure

**Route:** `app/(storefront)/checkout/page.tsx`

**Purpose:**  
Multi-step checkout flow for collecting shipping address, shipping method, and payment information.

**Layout Structure:**

```
Checkout Page:
├── Page Header
│   ├── Breadcrumbs
│   └── Page Title: "Checkout" (serif, Display XL)
├── Main Content Area (Desktop: 2-column, Mobile: Stacked)
│   ├── Left Column: Checkout Forms
│   │   ├── Step 1: Shipping Address
│   │   ├── Step 2: Shipping Method
│   │   └── Step 3: Payment Method (placeholder)
│   └── Right Column: Order Summary Box
└── [Footer from layout]
```

**Responsive Behavior:**
- **Desktop:** 2-column layout (forms left, summary right)
- **Mobile:** Stacked layout (forms top, summary bottom, sticky)

---

### 8.2 Page Sections

#### 8.2.1 Shipping Address Section

**Component:** `components/checkout/AddressForm.tsx`

**Position:** Left column (desktop), top section (mobile)

**Form Fields:**
- **Full Name:** Text input (required)
- **Email:** Email input (required)
- **Phone:** Phone input (required, Indian format)
- **Address Line 1:** Text input (required)
- **Address Line 2:** Text input (optional)
- **City:** Text input (required)
- **State:** Select dropdown (required, Indian states)
- **Pincode:** Text input (required, 6 digits)
- **Country:** Pre-filled "India" (or select if international shipping)

**Form Validation:**
- Required fields: Full Name, Email, Phone, Address Line 1, City, State, Pincode
- Email format validation
- Phone format validation (10 digits)
- Pincode format validation (6 digits)

**Styling:**
- Form fields: Input components from `components/ui/Input.tsx`
- Labels: Sans serif, Body SM, Silver-dark
- Inputs: Sans serif, Body MD, Black
- Error messages: Sans serif, Body SM, Vine red (`#8B2635`)
- Section title: Serif, Display MD

**Data Dependencies:**
- Form data stored in component state (or form library like React Hook Form)
- Saved addresses from database (if user is logged in, optional)
- Indian states list (static or from database)

---

#### 8.2.2 Shipping Method Section

**Component:** `components/checkout/ShippingMethod.tsx`

**Position:** Below shipping address section

**Layout:**
- Radio button group (one option selected)
- Each option: Radio button + shipping method name + price + estimated delivery

**Shipping Options:**
- **Standard Shipping:** 5-7 business days, ₹X (or free if order > threshold)
- **Express Shipping:** 2-3 business days, ₹X
- **Same Day Delivery:** Same day (if available), ₹X

**Styling:**
- Radio buttons: Custom styled (gold accent when selected)
- Option cards: Bordered cards, hover effect
- Selected option: Gold border or background
- Price: Gold accent (`#D4AF37`)

**Data Dependencies:**
- Shipping methods from database (`shipping_methods` table)
- Shipping costs calculated based on order total or weight
- Estimated delivery dates calculated based on shipping method

**Behavior:**
- Selecting shipping method updates order summary (shipping cost)
- Shipping cost added to total

---

#### 8.2.3 Payment Method Placeholder

**Component:** `components/checkout/PaymentMethod.tsx`

**Position:** Below shipping method section

**Purpose:**  
Placeholder for future payment integration (Razorpay, Stripe, etc.)

**Layout:**
- **Payment Options:** Radio button group (placeholder)
  - **Credit/Debit Card:** (placeholder, not functional)
  - **Net Banking:** (placeholder, not functional)
  - **UPI:** (placeholder, not functional)
  - **Cash on Delivery:** (placeholder, not functional)

**Styling:**
- Same as shipping method (radio button group, card layout)
- Placeholder text: "Payment integration coming soon" or similar

**Future Integration:**
- Payment gateway integration (Razorpay, Stripe)
- Payment form fields (card number, CVV, etc.)
- Payment processing logic
- Order confirmation after payment

**No Implementation:**  
This section is architecturally defined but not implemented in this phase.

---

### 8.3 Order Summary Box

**Component:** `components/checkout/OrderSummary.tsx`

**Position:** Right column (desktop), sticky bottom (mobile)

**Layout:**

```
Order Summary Box:
├── Title: "Order Summary" (serif, Display MD)
├── Cart Items List (collapsible)
│   ├── Item 1 (image + name + quantity + price)
│   ├── Item 2
│   └── [Additional items...]
├── Summary Details
│   ├── Subtotal: "₹X,XXX"
│   ├── Shipping: "₹X" or "Free"
│   ├── Discount: "₹X" (if applicable, future)
│   └── Total: "₹X,XXX" (gold accent, Display MD)
└── Place Order Button (gold background, black text, full-width)
```

**Styling:**
- Background: White (`#FAFAFA`)
- Border: `1px solid #E8E8E8`
- Padding: `1.5rem`
- Border radius: `8px` (subtle)
- Sticky: Fixed at bottom on mobile (when scrolling)

**Cart Items List:**
- Collapsible section ("Show items" / "Hide items")
- Each item: Thumbnail image (40px × 50px) + name + quantity + price
- Compact display (not full cart item cards)

**Summary Details:**
- Labels: Sans serif, Body SM, Silver-dark
- Values: Sans serif, Body MD, Black (Total: Gold accent)
- Separator: `1px solid #E8E8E8` before total

**Place Order Button:**
- Full-width button
- Gold background (`#D4AF37`), black text
- Disabled if forms are incomplete
- Click: Processes order (future: payment integration)

**Data Dependencies:**
- Cart items from Zustand store (or passed as props)
- Subtotal: Sum of item prices × quantities
- Shipping cost: From shipping method selection
- Total: Subtotal + shipping - discount (if applicable)

**Responsive Behavior:**
- **Desktop:** Fixed position in right column
- **Mobile:** Sticky at bottom of page (when scrolling)
- Cart items list: Collapsible to save space

---

## 9. Principles

### 9.1 UI Consistency with Brand Foundation

**Color Usage:**
- **Gold (`#D4AF37`):** Primary CTAs, price displays, cart icon badge, hover states
- **Vine Red (`#8B2635`):** Festive periods only, error states, limited edition badges
- **Bronze (`#CD7F32`):** Secondary CTAs, category highlights, warm accents
- **Silver (`#C0C0C0`):** Inactive states, secondary text, dividers
- **Black (`#0A0A0A`):** Primary text, navigation bars, footer
- **White (`#FAFAFA`):** Primary backgrounds, card surfaces

**Typography Usage:**
- **Serif (Georgia):** Headlines, product names, category titles, brand name
- **Sans Serif (Geist Sans):** Body text, navigation, buttons, forms, descriptions
- **Monospace (Geist Mono):** Order numbers, SKUs, technical info (admin only)

**Spacing Consistency:**
- Follow Tailwind spacing scale (`0.25rem`, `0.5rem`, `1rem`, `1.5rem`, `2rem`, `3rem`, `4rem`)
- Section gaps: `4rem` (desktop), `2rem` (mobile)
- Component padding: `1rem` (mobile), `1.5rem` (tablet), `2rem` (desktop)

**Shadow Consistency:**
- Subtle: `0 1px 3px rgba(0, 0, 0, 0.1)` (cards, subtle elevation)
- Standard: `0 4px 6px rgba(0, 0, 0, 0.1)` (hover states, raised cards)
- Prominent: `0 10px 15px rgba(0, 0, 0, 0.1)` (modals, drawers)

---

### 9.2 Hybrid Luxury × Subtle Festive Identity

**Luxury Elements:**
- **Whitespace:** Generous negative space (minimum 30% of page)
- **Clean Layouts:** Minimal, product-focused designs
- **Elegant Typography:** Serif headlines, clean sans serif body
- **Subtle Accents:** Gold used sparingly (maximum 15% of page)
- **High-Quality Imagery:** Professional product photography
- **Smooth Animations:** Gentle transitions (0.3s - 0.5s duration)

**Festive Elements (Subtle):**
- **Cultural Patterns:** Abstract patterns at 5-10% opacity (not overwhelming)
- **Warm Tones:** Warm-toned photography, subtle gold/vine red accents
- **Cultural Context:** Subtle cultural elements in images (marigold petals, diya in background)
- **Festive Periods:** Increased use of vine red and gold (up to 25% of page during festivals)

**Balance Rules:**
- **Never sacrifice luxury for festive:** Festive elements must remain subtle
- **Never sacrifice festive for luxury:** Cultural warmth must be present
- **Product is always the hero:** Backgrounds and patterns support, never compete
- **Elegance first:** All designs prioritize elegance and sophistication

**Examples of Good Balance:**
- ✅ Clean white background with subtle gold accent border (luxury + festive)
- ✅ Minimal product card with warm-toned photography (luxury + cultural)
- ✅ Elegant serif headline with subtle cultural pattern at 5% opacity (luxury + festive)

**Examples of Bad Balance:**
- ❌ Bright red and gold backgrounds with busy patterns (too festive, loses luxury)
- ❌ Pure white minimalism with no cultural warmth (too cold, loses festive)
- ❌ Traditional Indian patterns covering entire background (too busy, loses luxury)

---

### 9.3 Component Layering for Maintainability

**Layer 1: UI Components (`components/ui/`)**
- **Purpose:** Pure, unstyled base components (shadcn style)
- **Dependencies:** None (or minimal: Tailwind, Lucide icons)
- **Reusability:** High (used across all features)
- **Examples:** Button, Input, Select, Card, Dialog, Drawer

**Layer 2: Feature Components (`components/navigation/`, `components/product/`, `components/cart/`)**
- **Purpose:** Composed components with business logic
- **Dependencies:** UI components, Zustand stores, Supabase clients
- **Reusability:** Medium (used within specific features)
- **Examples:** Navbar, ProductCard, CartDrawer, VariantSelector

**Layer 3: Section Components (`components/sections/`)**
- **Purpose:** Full-featured sections with data fetching
- **Dependencies:** Feature components, UI components, database queries
- **Reusability:** Low (used on specific pages)
- **Examples:** HeroSection, CategoryTiles, BestSellers, NewArrivals

**Layer 4: Page Components (`app/(storefront)/**/page.tsx`)**
- **Purpose:** Page composition and routing
- **Dependencies:** Section components, feature components, layouts
- **Reusability:** None (specific to routes)
- **Examples:** Homepage, PLP, PDP, Checkout

**Layering Rules:**
- **Never skip layers:** Sections use feature components, feature components use UI components
- **No circular dependencies:** Lower layers never import from higher layers
- **Single responsibility:** Each component has one clear purpose
- **Composition over inheritance:** Build complex components by composing simple ones

**Import Strategy:**
- UI components: `@/components/ui/Button`
- Feature components: `@/components/navigation/Navbar`
- Section components: `@/components/sections/HeroSection`
- Common components: `@/components/common/Footer`

**Maintainability Benefits:**
- **Easy updates:** Change UI component once, affects all features
- **Clear dependencies:** Know what each component needs
- **Testable:** Test UI components independently, then feature components, then sections
- **Scalable:** Add new features by composing existing components

---

### 9.4 Database-First Architecture

**No Hardcoded Content:**
- All product data from database (`products` table)
- All category data from database (`categories` table)
- All collection data from database (`collections` table)
- All images from Supabase Storage (no external URLs)
- All content (headlines, descriptions) from database

**Data Fetching Strategy:**
- **Server Components:** Fetch data in Server Components (Next.js App Router)
- **Client Components:** Use Zustand stores for client-side state (cart, UI state)
- **Supabase:** Use Supabase client/server helpers (`lib/supabase/client.ts`, `lib/supabase/server.ts`)

**Image Loading:**
- All images from Supabase Storage
- Use optimized image component (`components/common/Image.tsx`) for Supabase URLs
- Image paths follow naming conventions (`products/{product-id}/hero-{product-id}-{variant-id}.jpg`)

**Query Parameter Strategy:**
- Filters: URL query params (`?fabric=pure_silk&work=zari_work`)
- Sort: URL query param (`?sort=price_asc`)
- Pagination: URL query param (`?page=2`) (future)
- No client-side-only state for filters/sort (persist in URL)

---

### 9.5 Responsive Design Principles

**Mobile-First Approach:**
- Design for mobile first, enhance for desktop
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- Breakpoints: Mobile (`< 768px`), Tablet (`768px - 1024px`), Desktop (`> 1024px`)

**Grid Responsiveness:**
- **Product Grids:** 1 column (mobile), 2 columns (tablet), 3-4 columns (desktop)
- **Category Tiles:** 1 column (mobile), 2 columns (tablet), 4 columns (desktop)
- **Navigation:** Hamburger menu (mobile), mega menu (desktop)

**Touch Targets:**
- Minimum touch target: `44px × 44px` (mobile)
- Adequate spacing between interactive elements
- No hover-only interactions (provide tap alternatives)

**Performance:**
- Lazy load images below the fold
- Use Next.js Image component for optimization
- Minimize JavaScript bundle size (code splitting)

---

## 10. Implementation Notes

### 10.1 What Is NOT Included in This Blueprint

**Not Included:**
- Actual component code (JSX, TypeScript)
- CSS/Tailwind class implementations
- Database schema or SQL queries
- API routes or server actions
- Authentication flows
- Payment gateway integration
- Admin panel components
- Super admin components

**Why:**
- This blueprint is architectural only (structure and concepts)
- Implementation code comes in later phases
- Database schema is defined separately (not executed in this phase)
- API routes and server actions are implementation details

---

### 10.2 What IS Included in This Blueprint

**Included:**
- Complete folder structure and organization
- Component hierarchy and relationships
- Layout structure for all pages
- Responsive behavior descriptions
- Data dependency mappings
- Brand alignment guidelines
- Component layering principles

**Why:**
- These are architectural decisions that guide implementation
- They ensure consistency across the codebase
- They align with Brand Foundation from Phase 1.1
- They respect database-first and Supabase Storage policies

---

### 10.3 Next Steps After This Blueprint

**Phase 1.3 (Future):**
- Implement UI components (`components/ui/`)
- Implement navigation components (`components/navigation/`)
- Implement product components (`components/product/`)
- Implement cart components (`components/cart/`)
- Implement section components (`components/sections/`)
- Implement common components (`components/common/`)

**Phase 1.4 (Future):**
- Implement homepage (`app/(storefront)/page.tsx`)
- Implement PLP (`app/(storefront)/collections/[slug]/page.tsx`)
- Implement PDP (`app/(storefront)/product/[slug]/page.tsx`)
- Implement checkout (`app/(storefront)/checkout/page.tsx`)

**Phase 1.5 (Future):**
- Database integration (data fetching)
- Image loading from Supabase Storage
- Cart state management (Zustand + Supabase)
- Filter and sort functionality

---

## Document Control

**Version:** 1.0  
**Last Updated:** 2025  
**Next Review:** After Sub-Phase 1.3 implementation  
**Status:** Active Architectural Blueprint

**Notes:**
- This document serves as the architectural foundation for all layout implementation
- Any deviations must be documented and approved
- All team members must reference this document before implementing layouts
- Updates to this document require version control and team notification

---

**END OF LAYOUT ARCHITECTURE BLUEPRINT**




