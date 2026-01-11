# ZEYNORA Implementation Plan - Three Major Systems

## Overview
Implementing three unified systems: All Products Page, Add Product Flow, and Media Manager with full integration to Importer and Homepage Builder.

## SQL Migrations Required

1. ✅ Sale fields migration (strike_price, sale_price, on_sale) - Created
2. ✅ Sort order migration - Already exists (20250120000029)
3. ✅ Variant SKU migration - Already exists (20250121000002)
4. ✅ Storage policies - Already exists (20251201000100)

## Implementation Status

### A. All Products Page - IN PROGRESS
- Inline editing for price, strike_price, sale_price, on_sale
- Drag-to-reorder with sort_order persistence
- Homepage assignment UI
- Revalidation of homepage and collections

### B. Add Product Flow - TO IMPLEMENT
- Auto UID generation (ZYN-XXXX)
- Auto slug generation
- Auto SEO fields
- Colors × Sizes variant creation
- Server-populated dropdowns

### C. Media Manager - TO ENHANCE
- Per-color image grouping
- Upload to products/{uid}/ paths
- Drag reorder
- Set main image
- Variant SKU assignment

### D. Importer Integration - TO VERIFY
- Deterministic variant generation
- Deterministic image merge
- Preview with error reporting

### E. Homepage Builder - TO VERIFY
- Product selection integration
- Order synchronization

## Files to Modify

### All Products Page
- app/(admin)/admin/super/products/page.tsx
- app/(admin)/admin/super/products/ProductsListClient.tsx → needs inline editing
- app/(admin)/admin/super/products/actions.ts → needs updatePriceAction
- lib/products/list.ts → needs sale fields

### Add Product Flow
- app/(admin)/admin/super/products/add/page.tsx
- app/(admin)/admin/super/products/add/AddProductClient.tsx
- app/(admin)/admin/super/products/add/actions.ts
- lib/products/index.ts
- lib/validators/product.ts → needs creation

### Media Manager
- app/(admin)/admin/super/media/page.tsx
- app/(admin)/admin/super/media/MediaManagerClient.tsx
- app/(admin)/admin/super/media/actions.ts
- lib/media/index.ts
- lib/utils/images.ts
- types/supabase.ts

### Importer
- lib/importer/index.ts (already has deterministic merge)
