# Zeynora — Brand Foundation Specification

**Version:** 1.0  
**Date:** 2025  
**Brand Identity:** Hybrid Luxury × Subtle Indian Festive Ecommerce

---

## 1. Color System

### 1.1 Primary Colors

**Luxury Gold**
- **Primary Gold:** `#D4AF37`
  - Usage: Primary CTAs, accent highlights, premium badges, price emphasis, hover states on luxury items
  - Never use for large background blocks
  - Maximum 15% of any page composition

- **Gold Light:** `#F4E4BC`
  - Usage: Subtle backgrounds, hover states on light surfaces, secondary accents
  - Use sparingly to maintain luxury feel

- **Gold Dark:** `#B8941A`
  - Usage: Pressed states, deep accents, premium product category badges
  - Use for depth and contrast

**Vine Red (Indian Festive)**
- **Primary Vine Red:** `#8B2635`
  - Usage: Festive season banners, special occasion CTAs, cultural celebration highlights
  - Use only during festive periods or for culturally significant collections
  - Maximum 10% of page during non-festive periods

- **Vine Red Light:** `#C45A6B`
  - Usage: Hover states on vine red elements, subtle festive accents
  - Use with restraint

- **Vine Red Dark:** `#5A1A22`
  - Usage: Deep festive accents, premium festive product badges

**Bronze (Warm Accent)**
- **Primary Bronze:** `#CD7F32`
  - Usage: Secondary CTAs, category highlights, warm seasonal accents
  - Use as alternative to gold when variety is needed
  - Maximum 8% of page composition

- **Bronze Light:** `#E8B882`
  - Usage: Light accents, subtle warmth

- **Bronze Dark:** `#A66D28`
  - Usage: Depth and contrast

**Silver (Neutral Luxury)**
- **Primary Silver:** `#C0C0C0`
  - Usage: Secondary navigation, inactive states, subtle dividers, premium product details
  - Use for elegance without warmth

- **Silver Light:** `#E8E8E8`
  - Usage: Light backgrounds, subtle separations

- **Silver Dark:** `#808080`
  - Usage: Muted text, disabled states, subtle borders

### 1.2 Secondary Colors

**Neutral Black**
- **Primary Black:** `#0A0A0A`
  - Usage: Primary text, navigation bars, footer, premium product backgrounds
  - Primary text color for all body copy

- **Black Light:** `#1A1A1A`
  - Usage: Secondary text, card backgrounds, subtle depth

**Neutral White**
- **Primary White:** `#FAFAFA`
  - Usage: Primary backgrounds, card surfaces, main content areas
  - Default background for all pages

- **White Off:** `#F5F5F5`
  - Usage: Subtle section separations, alternate card backgrounds

### 1.3 Support Colors

**Success:** `#2D5016` (Deep forest green)  
**Error:** `#8B2635` (Vine red, repurposed for errors)  
**Warning:** `#B8941A` (Gold dark)  
**Info:** `#4A5568` (Cool gray)

### 1.4 Color Usage Rules

**When to Use Gold:**
- Primary call-to-action buttons
- Price displays and currency symbols
- Premium product badges
- Hover states on luxury items
- Navigation highlights for current page
- Cart icon when items are present
- Star ratings and reviews

**When to Use Vine Red:**
- Festive season banners (Diwali, Holi, Navratri, etc.)
- Special occasion collections
- Cultural celebration campaigns
- Limited edition product badges
- Festive email campaigns

**When to Use Bronze:**
- Secondary CTAs (e.g., "Add to Wishlist")
- Category tiles requiring warmth
- Autumn/winter seasonal collections
- Alternative accent when gold is overused

**When to Use Silver:**
- Inactive navigation items
- Disabled form elements
- Subtle dividers and borders
- Premium product detail sections
- Secondary information hierarchy

### 1.5 Contrast Rules for Accessibility

**Text on Background Contrast Ratios (WCAG AA minimum):**
- Primary text (`#0A0A0A`) on white (`#FAFAFA`): 16.8:1 ✓
- Gold (`#D4AF37`) on black (`#0A0A0A`): 4.8:1 ✓
- Gold (`#D4AF37`) on white (`#FAFAFA`): 1.8:1 ✗ (Use gold-dark `#B8941A` instead: 3.2:1)
- Vine red (`#8B2635`) on white (`#FAFAFA`): 7.2:1 ✓
- Silver (`#C0C0C0`) on black (`#0A0A0A`): 3.1:1 ✗ (Use silver-dark `#808080` instead: 4.8:1)

**Rules:**
- Never place gold text directly on white backgrounds
- Always use gold-dark or black text on gold backgrounds
- Ensure all interactive elements meet WCAG AA contrast (4.5:1 minimum)
- Test all color combinations in both light and dark modes

---

## 2. Typography System

### 2.1 Font Families

**Serif (Elegance & Tradition)**
- **Primary Serif:** `Georgia, serif`
- **Usage:** 
  - Hero headlines
  - Product names on PDP
  - Category titles
  - Brand name display
  - Premium collection headlines
  - Festive messaging
- **When NOT to use:** Body text, long-form content, UI elements, navigation

**Sans Serif (Modern & Clean)**
- **Primary Sans:** `var(--font-geist-sans), system-ui, sans-serif`
- **Usage:**
  - All body text
  - Navigation menus
  - Product descriptions
  - Form labels and inputs
  - Button text
  - UI components
  - Footer content
  - Meta information

**Monospace (Technical)**
- **Primary Mono:** `var(--font-geist-mono), monospace`
- **Usage:**
  - Order numbers
  - SKU codes
  - Timestamps
  - Technical specifications
  - Admin interfaces only

### 2.2 Type Scale & Hierarchy

**Display Sizes (Serif)**
- **Display 2XL:** `4.5rem` (72px) / Line height: 1.1 / Letter spacing: -0.02em
  - Usage: Hero headlines (maximum 1 per page)
  - Maximum 8 words

- **Display XL:** `3.75rem` (60px) / Line height: 1.1 / Letter spacing: -0.02em
  - Usage: Section headlines, major collection titles
  - Maximum 10 words

- **Display LG:** `3rem` (48px) / Line height: 1.2 / Letter spacing: -0.01em
  - Usage: Category page titles, featured collection headlines
  - Maximum 12 words

- **Display MD:** `2.25rem` (36px) / Line height: 1.2 / Letter spacing: -0.01em
  - Usage: Product category tiles, secondary section headlines
  - Maximum 15 words

- **Display SM:** `1.875rem` (30px) / Line height: 1.3
  - Usage: Product card titles, tertiary headlines
  - Maximum 20 words

**Body Sizes (Sans Serif)**
- **Body XL:** `1.25rem` (20px) / Line height: 1.6
  - Usage: Lead paragraphs, important product descriptions
  - Maximum line length: 65ch

- **Body LG:** `1.125rem` (18px) / Line height: 1.6
  - Usage: Standard body text, product descriptions
  - Maximum line length: 65ch

- **Body MD:** `1rem` (16px) / Line height: 1.6
  - Usage: Default body text, form labels, navigation items
  - Maximum line length: 65ch

- **Body SM:** `0.875rem` (14px) / Line height: 1.5
  - Usage: Secondary information, meta text, captions
  - Maximum line length: 60ch

- **Body XS:** `0.75rem` (12px) / Line height: 1.4
  - Usage: Fine print, legal text, timestamps
  - Maximum line length: 55ch

### 2.3 Font Weight Rules

**Serif Weights:**
- **400 (Regular):** Default for all serif display text
- **600 (Semi-bold):** Never use (too heavy for luxury feel)
- **700 (Bold):** Only for brand name in logo
- **300 (Light):** Never use (too weak for luxury)

**Sans Serif Weights:**
- **400 (Regular):** Default for body text, navigation, descriptions
- **500 (Medium):** CTAs, important labels, emphasis
- **600 (Semi-bold):** Section subheadings, product names on cards
- **700 (Bold):** Never use in storefront (reserved for admin only)

**Rules:**
- Maximum 2 weight variations per page section
- Never use weights above 600 in storefront UI
- Maintain consistent weight hierarchy across all pages

### 2.4 Typography Usage Rules

**Headlines:**
- Always use serif for hero and major section headlines
- Limit serif headlines to maximum 3 per page
- Use sentence case, not ALL CAPS (except brand name)
- Maximum 2-line headlines; truncate with ellipsis if longer

**Body Text:**
- Always use sans serif for all body content
- Maintain 1.6 line height for readability
- Use maximum 65 characters per line
- Never justify text (use left-align)

**Product Names:**
- PDP: Serif, Display SM or Display MD
- Product Cards: Sans serif, Semi-bold, Body LG
- Search Results: Sans serif, Medium, Body MD

**CTAs:**
- Always sans serif, Medium weight (500)
- Body MD or Body LG size
- Never use serif for buttons

---

## 3. Spacing & Grid System

### 3.1 Base Spacing Scale

**Base Unit:** `0.25rem` (4px)

**Scale:**
- `0.25rem` (4px) - `space-1` - Micro spacing
- `0.5rem` (8px) - `space-2` - Tight spacing
- `0.75rem` (12px) - `space-3` - Compact spacing
- `1rem` (16px) - `space-4` - Base spacing unit
- `1.5rem` (24px) - `space-6` - Standard spacing
- `2rem` (32px) - `space-8` - Comfortable spacing
- `3rem` (48px) - `space-12` - Section spacing
- `4rem` (64px) - `space-16` - Large section spacing
- `4.5rem` (72px) - `space-18` - Hero spacing
- `6rem` (96px) - `space-24` - Page section spacing
- `8rem` (128px) - `space-32` - Major section breaks
- `22rem` (352px) - `space-88` - Custom large spacing
- `32rem` (512px) - `space-128` - Maximum spacing

### 3.2 Section Padding

**Page Container:**
- Desktop: `0` (full-width, no horizontal padding)
- Mobile: `1rem` (16px) horizontal padding

**Section Padding:**
- Hero Section: `6rem` (96px) top, `4rem` (64px) bottom
- Standard Section: `4rem` (64px) top and bottom
- Compact Section: `3rem` (48px) top and bottom
- Footer Section: `4rem` (64px) top, `2rem` (32px) bottom

**Content Padding:**
- Content blocks: `2rem` (32px) horizontal on desktop, `1rem` (16px) on mobile
- Card padding: `1.5rem` (24px) all sides
- Button padding: `0.75rem` (12px) vertical, `1.5rem` (24px) horizontal

### 3.3 Grid System

**Desktop Grid (≥1024px):**
- Container: Full width, max-width: `1440px`, centered
- Columns: 12-column grid
- Gutter: `2rem` (32px) between columns
- Breakpoints:
  - Large Desktop: `1440px+` (12 columns, 2rem gutters)
  - Desktop: `1024px - 1439px` (12 columns, 2rem gutters)

**Tablet Grid (768px - 1023px):**
- Columns: 8-column grid
- Gutter: `1.5rem` (24px) between columns
- Container: Full width with `2rem` (32px) horizontal padding

**Mobile Grid (<768px):**
- Columns: 4-column grid
- Gutter: `1rem` (16px) between columns
- Container: Full width with `1rem` (16px) horizontal padding

### 3.4 Layout-Specific Grid Rules

**Hero Section:**
- Desktop: Full-width background, content in 12-column grid (centered 8 columns)
- Mobile: Full-width, single column, `1rem` padding

**Product Listing Page (PLP):**
- Desktop: 12-column grid
  - Sidebar: 3 columns (filters)
  - Products: 9 columns (3-column product grid = 3 products per row)
- Tablet: 8-column grid
  - Sidebar: 2 columns (collapsible)
  - Products: 6 columns (2-column product grid = 2 products per row)
- Mobile: 4-column grid
  - Sidebar: Hidden (drawer)
  - Products: 4 columns (1-column product grid = 1 product per row)

**Product Detail Page (PDP):**
- Desktop: 12-column grid
  - Images: 6 columns
  - Product Info: 6 columns
- Tablet: 8-column grid
  - Images: 4 columns
  - Product Info: 4 columns
- Mobile: 4-column grid
  - Images: 4 columns (full width)
  - Product Info: 4 columns (full width, stacked)

**Banner Sections:**
- Desktop: Full-width, content constrained to 10 columns (centered)
- Tablet: Full-width, content constrained to 6 columns (centered)
- Mobile: Full-width, content constrained to 4 columns (centered)

**Content Blocks:**
- Desktop: 8-column centered grid (leaves 2 columns margin on each side)
- Tablet: 6-column centered grid
- Mobile: 4-column full-width grid

---

## 4. Image Style Guide

### 4.1 Gemini Generation Style Rules

**Overall Aesthetic:**
- **Luxury Feel:** Clean, minimal backgrounds with focus on product
- **Indian Festive Subtlety:** Warm undertones, soft cultural elements (not overwhelming)
- **Photography Style:** High-end fashion photography, soft natural lighting
- **Color Palette:** Muted backgrounds, product-focused, warm but not garish

**Background Guidelines:**
- **Primary:** Neutral white (`#FAFAFA`) or off-white (`#F5F5F5`)
- **Secondary:** Soft beige/cream tones (warm but minimal)
- **Festive:** Very subtle gold or vine red gradients (10-15% opacity maximum)
- **Never:** Bright colors, busy patterns, distracting elements

**Product Presentation:**
- **Hero Images:** Lifestyle shots with subtle Indian context (e.g., soft marigold petals, minimal diya in background)
- **Product Cards:** Clean white/neutral backgrounds, product centered
- **PDP Images:** Multiple angles, detail shots, lifestyle context (subtle)
- **Category Tiles:** Abstract cultural patterns at 5-10% opacity, product-focused

**Lighting:**
- Soft, natural daylight
- Avoid harsh shadows
- Warm but not yellow tones
- Luxury feel through lighting, not color saturation

**Composition:**
- Rule of thirds
- Negative space is luxury (minimum 30% negative space)
- Product always the hero
- Cultural elements as subtle supporting actors

### 4.2 Supabase Storage Naming Conventions

**Folder Structure:**
```
supabase-storage/
├── products/
│   ├── {product-id}/
│   │   ├── hero-{product-id}-{variant-id}.jpg
│   │   ├── thumbnail-{product-id}-{variant-id}.jpg
│   │   ├── detail-{product-id}-{variant-id}-{sequence}.jpg
│   │   └── lifestyle-{product-id}-{variant-id}-{sequence}.jpg
├── categories/
│   ├── {category-slug}-hero.jpg
│   ├── {category-slug}-tile.jpg
│   └── {category-slug}-banner.jpg
├── banners/
│   ├── hero-{campaign-slug}-{date}.jpg
│   ├── section-{campaign-slug}-{date}.jpg
│   └── festive-{festival-name}-{year}.jpg
├── brand/
│   ├── logo-primary.svg
│   ├── logo-secondary.svg
│   └── favicon.ico
└── content/
    ├── about-{section}.jpg
    └── blog-{post-slug}-{sequence}.jpg
```

**Naming Rules:**
- All lowercase
- Hyphens for word separation (no underscores, no spaces)
- Include relevant identifiers (product-id, variant-id, date, sequence)
- Use descriptive prefixes (hero, thumbnail, detail, lifestyle)
- File extensions: `.jpg` for photos, `.png` for transparency, `.svg` for logos
- Sequence numbers: `01`, `02`, `03` (zero-padded, 2 digits)

**Examples:**
- `products/12345/hero-12345-red-01.jpg`
- `categories/sarees-sarees-hero.jpg`
- `banners/festive-diwali-2025.jpg`
- `products/12345/detail-12345-red-01.jpg`

### 4.3 Aspect Ratios

**Hero Images:**
- **Desktop Hero:** `21:9` (2560×1080px recommended)
- **Mobile Hero:** `16:9` (1920×1080px recommended)
- **Category Hero:** `16:9` (1920×1080px recommended)

**Product Images:**
- **Product Card Thumbnail:** `4:5` (800×1000px recommended)
  - Vertical orientation for fashion items
  - Square crops allowed for accessories
- **PDP Main Image:** `4:5` (1200×1500px recommended)
- **PDP Detail Images:** `1:1` (1200×1200px recommended)
  - Square for detail shots
- **PDP Lifestyle Images:** `16:9` (1920×1080px recommended)

**Category Tiles:**
- **Desktop Category Tile:** `3:4` (600×800px recommended)
- **Mobile Category Tile:** `4:5` (400×500px recommended)

**Banner Images:**
- **Section Banner:** `16:9` (1920×1080px recommended)
- **Festive Banner:** `21:9` (2560×1080px recommended)
- **Promotional Banner:** `3:1` (1800×600px recommended)

**Content Images:**
- **Blog/Content Images:** `16:9` (1920×1080px recommended)
- **About Section Images:** `4:3` (1200×900px recommended)

### 4.4 Background Tone Guidelines

**Product Images:**
- **Primary:** Pure white (`#FFFFFF`) or off-white (`#FAFAFA`)
- **Secondary:** Soft cream (`#F8F6F0`) for warmth
- **Festive:** Very subtle gold gradient (top to bottom, 5% opacity maximum)
- **Never:** Colored backgrounds, patterns, textures that distract

**Category Tiles:**
- **Primary:** Neutral white with subtle texture overlay (2-5% opacity)
- **Festive:** Soft cultural pattern at 3-7% opacity (marigold, paisley, etc.)
- **Never:** Bold patterns, high-contrast backgrounds

**Hero Banners:**
- **Standard:** Neutral gradient (white to off-white)
- **Festive:** Subtle gold-to-cream gradient (10% opacity maximum)
- **Never:** Solid colors, busy patterns

**Rules:**
- Backgrounds should never compete with product
- Maximum 15% visual weight for background elements
- Test all backgrounds with product images to ensure readability
- Maintain consistency across product categories

---

## 5. Iconography & Visual Tone

### 5.1 Icon Style

**Library:** Lucide React (primary)

**Line Thickness:**
- **Default:** `1.5px` stroke width
- **Small Icons (<20px):** `1px` stroke width
- **Large Icons (>24px):** `2px` stroke width
- **Never:** Filled icons (always outline style for luxury feel)

**Icon Sizes:**
- **Extra Small:** `12px` - Fine print, inline text
- **Small:** `16px` - Navigation items, buttons
- **Medium:** `20px` - Default size, most UI elements
- **Large:** `24px` - Feature icons, prominent CTAs
- **Extra Large:** `32px` - Hero section icons, major features
- **Never:** Icons larger than 32px (use illustrations instead)

**Icon Colors:**
- **Default:** `#0A0A0A` (black) for primary icons
- **Secondary:** `#808080` (silver-dark) for inactive/secondary icons
- **Accent:** `#D4AF37` (gold) for highlighted icons, cart, favorites
- **Festive:** `#8B2635` (vine red) for festive season icons only
- **Never:** Multiple colors in single icon, gradients on icons

### 5.2 Shadows

**Shadow Hierarchy:**
- **Subtle:** `0 1px 3px rgba(0, 0, 0, 0.1)` - Cards, subtle elevation
- **Standard:** `0 4px 6px rgba(0, 0, 0, 0.1)` - Hover states, raised cards
- **Luxury:** `0 20px 60px -12px rgba(0, 0, 0, 0.25)` - Premium product cards, modals
- **Luxury Large:** `0 25px 80px -12px rgba(0, 0, 0, 0.3)` - Hero elements, featured products
- **Luxury Extra Large:** `0 30px 100px -12px rgba(0, 0, 0, 0.35)` - Major hero sections

**Usage Rules:**
- Use subtle shadows for most UI elements
- Reserve luxury shadows for premium products and hero sections
- Never use shadows on text (only on containers)
- Shadows should be barely perceptible (luxury = subtle)

### 5.3 Borders

**Border Styles:**
- **Default:** `1px solid #E8E8E8` (silver-light) - Cards, dividers
- **Subtle:** `1px solid #F5F5F5` (white-off) - Very light separations
- **Accent:** `1px solid #D4AF37` (gold) - Active states, selected items
- **Festive:** `1px solid #8B2635` (vine red) - Festive season accents only
- **Never:** Thick borders (>2px), multiple borders, colored borders on white backgrounds

**Border Radius:**
- **Small:** `0.25rem` (4px) - Buttons, small cards
- **Medium:** `0.5rem` (8px) - Default, most cards
- **Large:** `1rem` (16px) - Large cards, modals
- **Extra Large:** `2rem` (32px) - Hero sections, major containers
- **Never:** Fully rounded corners (maintains luxury, not playful)

### 5.4 Hover Interactions

**Product Cards:**
- **Transform:** `translateY(-4px)` (subtle lift)
- **Shadow:** Upgrade to next shadow level
- **Transition:** `0.3s ease-out`
- **Never:** Scale transforms, rotations, color changes

**Buttons:**
- **Background:** Darken by 10% (gold → gold-dark)
- **Transform:** None (maintains stability)
- **Transition:** `0.2s ease-out`
- **Never:** Bounce, shake, or dramatic movements

**Navigation Items:**
- **Color:** Change to gold (`#D4AF37`)
- **Underline:** `2px solid gold` (appears on hover)
- **Transition:** `0.2s ease-out`
- **Never:** Background color changes, bold transforms

**Icons:**
- **Color:** Change to gold (`#D4AF37`) if not already
- **Transform:** None (maintains precision)
- **Transition:** `0.2s ease-out`
- **Never:** Rotations, scales, or animations

### 5.5 Animation Timings and Curves

**Timing Functions (Luxury Style):**
- **Default:** `ease-out` - Most interactions
- **Smooth:** `cubic-bezier(0.4, 0, 0.2, 1)` - Premium interactions
- **Gentle:** `cubic-bezier(0.25, 0.1, 0.25, 1)` - Delicate animations
- **Never:** `ease-in`, `ease-in-out`, `linear` (too mechanical or bouncy)

**Duration:**
- **Micro:** `0.15s` - Icon color changes, subtle hovers
- **Standard:** `0.3s` - Card hovers, button interactions
- **Smooth:** `0.5s` - Page transitions, modal appearances
- **Deliberate:** `0.8s` - Hero animations, major transitions
- **Never:** Animations longer than 1s (feels slow), shorter than 0.1s (feels jarring)

**Animation Principles:**
- **Elegance over speed:** Slightly slower feels more luxurious
- **Consistency:** Same timing for similar interactions
- **Subtlety:** Animations should enhance, not distract
- **Purpose:** Every animation should have a reason

**Page Transitions:**
- **Fade In:** `0.5s ease-out` - Page loads
- **Slide Up:** `0.5s ease-out` - Content appears
- **Never:** Slide transitions between pages (feels cheap)

---

## 6. Brand Voice & Copywriting Tone

### 6.1 Headline Voice

**Tone:** Elegant, confident, culturally aware but not overly traditional

**Characteristics:**
- **Confident but not boastful:** "Crafted for moments that matter" not "The best products ever"
- **Culturally rich but subtle:** "Celebrate in style" not "Traditional Indian excellence"
- **Luxury without pretension:** "Thoughtfully designed" not "Exclusively curated"
- **Warm but sophisticated:** "Embrace elegance" not "Feel the luxury"

**Headline Examples:**
- ✅ "Where Tradition Meets Modern Elegance"
- ✅ "Crafted for Your Most Cherished Moments"
- ✅ "Discover Timeless Beauty, Reimagined"
- ❌ "Buy the Best Indian Clothes Online"
- ❌ "Luxury Redefined: Shop Now"
- ❌ "Traditional Excellence Since Forever"

**Rules:**
- Maximum 8 words for hero headlines
- Use present tense, active voice
- Avoid superlatives (best, finest, ultimate)
- Never use exclamation marks in headlines
- Use sentence case, not title case

### 6.2 Product Description Tone

**Structure:**
1. **Opening Line:** One sentence capturing essence (15-20 words)
2. **Key Features:** 3-5 bullet points (fabric, work, occasion)
3. **Details:** 2-3 paragraphs (craftsmanship, care, styling)
4. **Closing:** One sentence invitation to experience (10-15 words)

**Tone Guidelines:**
- **Descriptive but not flowery:** "Silk saree with intricate zari work" not "Exquisite silk masterpiece adorned with golden threads"
- **Specific:** Mention fabric type, work type, measurements
- **Benefit-focused:** "Drapes elegantly" not "Made from fabric"
- **Culturally aware:** Reference occasions subtly (wedding, festival) without over-explaining

**Example Structure:**
```
[Product Name]

A [fabric] [garment type] that [key benefit]. Perfect for [occasion/use case].

Key Features:
• [Fabric detail] - [benefit]
• [Work/embellishment] - [visual impact]
• [Fit/style] - [comfort/elegance]

[Paragraph about craftsmanship and story]

[Paragraph about care and styling]

Experience the [essence] of this [product type] in your collection.
```

**Rules:**
- Never use ALL CAPS
- Avoid excessive adjectives (maximum 2 per sentence)
- Use "you" sparingly (feels more premium)
- Include specific measurements and care instructions
- Never make false claims or unverifiable statements

### 6.3 Seasonal Messaging

**Festive Periods:**
- **Diwali:** "Illuminate your celebrations" / "Light up the festive season"
- **Holi:** "Colors of joy, elegance redefined" / "Celebrate with vibrant grace"
- **Navratri:** "Dance in style" / "Nine nights of elegance"
- **Wedding Season:** "For the moments that last forever" / "Celebrate love, celebrate style"

**Tone Rules:**
- **Subtle cultural references:** Mention festival without over-explaining
- **Elegance first:** Festive but never garish
- **Inclusive:** Celebrate without assuming everyone celebrates the same way
- **Respectful:** Never commercialize cultural significance

**Examples:**
- ✅ "As Diwali approaches, discover pieces that honor tradition with modern elegance"
- ✅ "Celebrate Holi in style with our vibrant collection"
- ❌ "Diwali Special! Buy Now! Limited Time Offer!"
- ❌ "Traditional Indian Festival Collection - Authentic and Best"

**Rules:**
- Festive messaging should feel like an invitation, not a sales pitch
- Use festival names respectfully and accurately
- Never create urgency through festival pressure
- Maintain luxury tone even during festive periods

### 6.4 CTA Style (Premium, Minimal)

**Primary CTAs:**
- "Add to Cart" (not "Buy Now" or "Purchase")
- "Explore Collection" (not "Shop Now" or "View More")
- "Discover" (not "See More" or "Learn More")
- "Continue Shopping" (not "Keep Shopping")
- "Proceed to Checkout" (not "Checkout Now")

**Secondary CTAs:**
- "Add to Wishlist" (not "Save for Later")
- "View Details" (not "See More" or "Read More")
- "Browse Similar" (not "More Like This")
- "Share" (not "Share This Product")

**Tone Rules:**
- **Action-oriented but gentle:** Verbs that invite, not command
- **Minimal:** Maximum 3 words
- **Clear:** No ambiguity about what happens next
- **Never:** Urgency language ("Hurry!", "Limited Time!", "Act Now!")
- **Never:** Exclamation marks
- **Never:** ALL CAPS

**Examples:**
- ✅ "Add to Cart"
- ✅ "Explore Collection"
- ✅ "Discover More"
- ❌ "BUY NOW!"
- ❌ "Shop the Sale!"
- ❌ "Limited Time - Get Yours Today!"

---

## 7. PDP Fabric + Work Section

### 7.1 Fabric Attributes Display

**Positioning:** Below product images, above product description, in dedicated "Details" section

**Layout:**
- **Desktop:** 2-column grid within product info section
- **Mobile:** Single column, stacked

**Information Hierarchy:**
1. **Fabric Type** (e.g., "Pure Silk", "Cotton Silk", "Georgette")
2. **Fabric Weight** (e.g., "Lightweight", "Medium Weight", "Heavy")
3. **Fabric Origin** (e.g., "Banarasi Silk", "Kanjivaram Silk", "Chanderi Cotton")
4. **Care Instructions** (e.g., "Dry Clean Only", "Hand Wash", "Machine Wash Cold")

**Visual Treatment:**
- **Label:** Sans serif, Medium weight (500), Body SM (`0.875rem`), Silver-dark (`#808080`)
- **Value:** Sans serif, Regular weight (400), Body MD (`1rem`), Black (`#0A0A0A`)
- **Separator:** `1px solid #E8E8E8` between items
- **Background:** None (transparent, inherits parent)

**Example Display:**
```
Details

Fabric Type          Pure Silk
Fabric Weight        Medium Weight
Fabric Origin        Banarasi Silk
Care Instructions    Dry Clean Only
```

### 7.2 Work/Embellishment Attributes Display

**Positioning:** Immediately after fabric attributes, same section

**Layout:** Same as fabric attributes (2-column grid desktop, stacked mobile)

**Information Hierarchy:**
1. **Work Type** (e.g., "Zari Work", "Embroidery", "Print", "Hand Painted")
2. **Work Detail** (e.g., "Intricate Zari Border", "Floral Motifs", "Geometric Patterns")
3. **Work Coverage** (e.g., "Border Only", "All Over", "Selective Placement")
4. **Technique** (e.g., "Hand Embroidered", "Machine Embroidered", "Block Printed")

**Visual Treatment:** Same as fabric attributes (consistent styling)

**Example Display:**
```
Work & Embellishment

Work Type            Zari Work
Work Detail          Intricate Border with Floral Motifs
Work Coverage        Border and Pallu
Technique            Hand Woven
```

### 7.3 Naming Conventions

**Fabric Types (Database Values):**
- Use standard names: `pure_silk`, `cotton_silk`, `georgette`, `chiffon`, `crepe`, `banarasi_silk`, `kanjivaram_silk`, `chanderi_cotton`
- Display names: Capitalize and format ("Pure Silk", "Cotton Silk", "Banarasi Silk")

**Work Types (Database Values):**
- Use standard names: `zari_work`, `embroidery`, `print`, `hand_painted`, `block_print`, `kalamkari`, `bandhani`
- Display names: Capitalize and format ("Zari Work", "Hand Painted", "Block Print")

**Work Details (Free Text):**
- Maximum 50 characters
- Use descriptive phrases: "Intricate floral border", "Geometric patterns", "Traditional motifs"
- Never use technical jargon without explanation

**Rules:**
- Database values: lowercase with underscores (`pure_silk`)
- Display values: Title Case with spaces (`Pure Silk`)
- Always provide both fabric and work information (never leave blank)
- Use consistent terminology across all products

### 7.4 Visual Integration

**Section Title:**
- Sans serif, Semi-bold (600), Body LG (`1.125rem`), Black (`#0A0A0A`)
- Margin bottom: `1.5rem` (24px)

**Attribute Grid:**
- Gap: `1rem` (16px) between rows
- Padding: `1.5rem` (24px) all sides
- Background: Transparent (no background color)
- Border: `1px solid #E8E8E8` (subtle border around entire section)

**Responsive Behavior:**
- Desktop: 2-column grid (Label | Value)
- Tablet: 2-column grid (same as desktop)
- Mobile: Single column (Label and Value stacked)

**Hover/Interaction:**
- None (static information, no interaction needed)

---

## 8. General Visual Philosophy

### 8.1 Hybrid Luxury × Festive Rulebook

**Core Principle:** Luxury elegance with subtle Indian cultural richness, never garish or overwhelming.

**Luxury Elements:**
- **Whitespace:** Generous negative space (minimum 30% of any composition)
- **Refinement:** Every element serves a purpose, nothing decorative without function
- **Quality over quantity:** Fewer, better elements rather than many competing elements
- **Subtlety:** Luxury whispers, it doesn't shout
- **Consistency:** Predictable patterns create trust and elegance

**Festive Elements (Subtle):**
- **Color accents:** Gold and vine red used sparingly (maximum 15% of page)
- **Cultural patterns:** Abstract patterns at 3-7% opacity, never dominant
- **Warmth:** Warm undertones in photography and backgrounds, not bright colors
- **Celebration:** Messaging acknowledges occasions without commercializing them
- **Respect:** Cultural elements honored, not exploited

**Balance Rules:**
- **70% Luxury, 30% Festive:** Luxury is the foundation, festive is the accent
- **Festive increases during festivals:** Up to 40% festive during Diwali/Holi (still luxury-first)
- **Never sacrifice elegance for tradition:** If it feels garish, dial back the festive elements
- **Cultural richness through subtlety:** Less is more when representing culture

### 8.2 Minimalism with Cultural Richness

**What Minimalism Means Here:**
- Clean layouts with clear hierarchy
- Generous whitespace
- Focused product presentation
- No unnecessary decorative elements
- Clear, readable typography
- Purposeful use of color

**What Cultural Richness Means Here:**
- Warm color palette (gold, bronze, vine red) used thoughtfully
- Subtle cultural patterns in backgrounds (low opacity)
- Photography that includes cultural context (soft, not dominant)
- Messaging that acknowledges occasions and traditions
- Product presentation that honors craftsmanship

**How to Balance:**
- **Start with minimalism:** Build clean, elegant layouts first
- **Add cultural accents:** Introduce warm colors and patterns sparingly
- **Test for garishness:** If it feels too busy or colorful, remove elements
- **Maintain luxury feel:** Every cultural element should enhance, not distract
- **Respect both:** Neither minimalism nor culture should be sacrificed

**Examples:**
- ✅ Clean white background with subtle gold accent border (luxury + festive)
- ✅ Minimal product card with warm-toned photography (luxury + cultural)
- ✅ Elegant serif headline with subtle cultural pattern at 5% opacity (luxury + festive)
- ❌ Bright red and gold backgrounds with busy patterns (too festive, loses luxury)
- ❌ Pure white minimalism with no cultural warmth (too cold, loses festive)
- ❌ Traditional Indian patterns covering entire background (too busy, loses luxury)

### 8.3 What Is Allowed Visually

**Allowed:**
- Generous whitespace and clean layouts
- Subtle gold and vine red accents (maximum 15% of page)
- Warm-toned photography with cultural context (soft, not dominant)
- Abstract cultural patterns at low opacity (3-7%)
- Elegant serif typography for headlines
- Clean sans serif for body text
- Subtle shadows and borders
- Smooth, gentle animations
- High-quality product photography
- Minimal, purposeful iconography

**Allowed During Festive Periods:**
- Increased use of gold and vine red (up to 25% of page)
- More prominent cultural patterns (up to 10% opacity)
- Festive messaging and seasonal collections
- Special festive banners and hero sections
- Cultural celebration imagery (still subtle and elegant)

### 8.4 What Is NOT Allowed Visually

**Not Allowed:**
- Bright, saturated colors (neon, electric colors)
- Busy patterns covering large areas
- Multiple competing fonts or font weights
- Harsh shadows or heavy borders
- Fast, bouncy animations
- Decorative elements without purpose
- Cluttered layouts with too many elements
- Low-quality or stock photography
- Garish color combinations
- Excessive use of cultural elements
- Commercial urgency language ("Sale!", "Hurry!")
- ALL CAPS text (except brand name)
- Exclamation marks in headlines or CTAs
- Hardcoded content or static product data
- External image URLs (must use Supabase Storage)
- Public CDNs for images (unless explicitly instructed later)

**Never Allowed (Even During Festive Periods):**
- Overwhelming cultural patterns
- Bright, garish color schemes
- Loss of luxury elegance
- Commercial exploitation of cultural significance
- Cluttered or busy layouts
- Sacrifice of whitespace for decorative elements

### 8.5 Quality Standards

**Photography:**
- High-resolution (minimum 1200px on longest side)
- Professional lighting (soft, natural)
- Consistent color grading (warm but not yellow)
- Product-focused composition
- Cultural context subtle and supportive

**Typography:**
- Consistent font usage (serif for headlines, sans for body)
- Proper hierarchy (clear size and weight differences)
- Readable line lengths (maximum 65 characters)
- Adequate line height (minimum 1.5)
- Proper contrast ratios (WCAG AA minimum)

**Layout:**
- Responsive across all breakpoints
- Consistent spacing (follow spacing scale)
- Clear visual hierarchy
- Accessible (keyboard navigation, screen readers)
- Performance-optimized (lazy loading, proper image sizes)

**Interactions:**
- Smooth animations (0.3s - 0.5s duration)
- Clear hover states
- Accessible focus states
- Consistent timing functions
- Purposeful motion (no animation for animation's sake)

---

## Document Control

**Version:** 1.0  
**Last Updated:** 2025  
**Next Review:** After Sub-Phase 1.2 implementation  
**Status:** Active Specification

**Notes:**
- This document serves as the foundation for all design decisions
- Any deviations must be documented and approved
- All team members must reference this document before making design choices
- Updates to this document require version control and team notification

---

**END OF BRAND FOUNDATION SPECIFICATION**

