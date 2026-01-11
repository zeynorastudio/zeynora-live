# Phase 1.1 Quick Reference Guide

## 🎯 What Changed?

### Category System
**OLD:** Dropdown selection from categories table  
**NEW:** Text input with format `"Subcategory Name (Category Name)"`

**Examples:**
- `Anarkali (Wedding & Bridal)`
- `Lehenga (Festive)`
- `Sarees` (category derived from super_category if no parentheses)

### Tag System
**OLD:** Manual comma-separated input  
**NEW:** Automatically generated from:
- Category
- Subcategory
- Occasion
- Style
- Season
- Visibility flags (featured, best_selling, new_launch)

### Database Schema
**New Fields:**
- `category_override` (string, nullable) - Manual category override
- `description` (text, nullable) - Product description
- `season` (enum, nullable) - Product season
- `new_launch` (boolean) - New launch flag

**Modified Fields:**
- `tags` (string[]) - Now auto-generated (was manual)
- `sort_order` (number) - Now mandatory (was optional)

---

## 📝 Admin Usage

### Creating a Product

1. Enter product name
2. Enter subcategory: `"Name (Category)"` or just `"Name"`
3. Enter price
4. Set sort order (lower = higher priority)
5. Optional: Override category manually
6. Optional: Add style, occasion, season
7. Optional: Check visibility flags (featured, best selling, new launch)
8. Save → Tags auto-generate

### Editing a Product

1. Modify any field
2. Tags **automatically regenerate** on save
3. Category **automatically re-derives** from subcategory
4. Use "Category Override" to manually set category

---

## 🔧 Developer Usage

### Process Product Input
```typescript
import { processProductInput } from "@/lib/products/helpers";

const processed = processProductInput({
  subcategoryInput: "Anarkali (Wedding & Bridal)",
  categoryOverride: null,
  occasion: "Party Night",
  style: "Semi-Formal",
  season: "Winter",
  is_featured: true,
  is_best_selling: false,
  is_new_launch: true,
});

// Result:
// {
//   subcategory: "Anarkali",
//   derivedCategory: "Wedding & Bridal",
//   effectiveCategory: "Wedding & Bridal",
//   categoryOverride: null,
//   tags: ["anarkali", "featured", "new-launch", "party-night", "semi-formal", "wedding-bridal", "winter"]
// }
```

### Query by Tags
```typescript
// Featured products
supabase.from("products").select("*").eq("is_featured", true)

// Category products
supabase.from("products").select("*").contains("tags", ["wedding-bridal"])

// Seasonal products
supabase.from("products").select("*").contains("tags", ["winter"])

// New arrivals
supabase.from("products").select("*").eq("is_new_launch", true)
```

---

## 🔍 Troubleshooting

### "Tags not showing"
→ Tags are auto-generated on save. Re-save the product to regenerate.

### "Category not updating"
→ Check if `category_override` is set. It takes precedence over derived category.

### "Products not appearing in navbar"
→ Verify visibility flags (`is_featured`, `is_best_selling`, `is_new_launch`) are set correctly.

### "Sort order not working"
→ Ensure `sort_order` is set. Lower numbers appear first.

---

## 📊 Tag Examples

| Input | Generated Tags |
|-------|---------------|
| Category: "Wedding & Bridal"<br>Subcategory: "Anarkali"<br>Featured: Yes | `["anarkali", "featured", "wedding-bridal"]` |
| Category: "Festive"<br>Subcategory: "Lehenga"<br>Occasion: "Party Night"<br>Season: "Winter" | `["festive", "lehenga", "party-night", "winter"]` |
| Category Override: "Sale"<br>Best Selling: Yes<br>New Launch: Yes | `["best-selling", "new-launch", "sale"]` |

---

## 🚀 Migration Checklist

- [ ] Run database migration: `20251222000000_add_category_override_and_season.sql`
- [ ] Test creating a new product
- [ ] Test editing an existing product
- [ ] Verify tags auto-generate correctly
- [ ] Verify navbar filters work
- [ ] Check sort order is respected
- [ ] Confirm no breaking changes to existing products

---

## 📞 Support

If you encounter issues:
1. Check `PHASE_1_1_IMPLEMENTATION_SUMMARY.md` for detailed docs
2. Review unit tests in `lib/products/__tests__/helpers.test.ts`
3. Check console logs for `[PRODUCT_UPDATE]` messages

---

**Version:** 1.1.0  
**Last Updated:** December 22, 2025
















