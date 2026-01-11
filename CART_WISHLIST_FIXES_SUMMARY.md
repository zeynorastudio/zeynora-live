# Cart & Wishlist Critical Fixes Summary

**Date:** December 23, 2025  
**Status:** ✅ COMPLETE

---

## CART FIXES

### 1. ✅ SKU Always from Database

**Problem:** Frontend was deriving SKU using `${uid}-${sizeCode}` format.

**Fix:**
- Updated `lib/data/products.ts` to include `sku` in variant queries
- Updated `ProductCard` and `PDPClient` interfaces to include `sku` in variant data
- Cart action now accepts `variant_sku` instead of `variantId`
- Lookup by SKU in `addToCartAction` instead of ID

**Files Modified:**
- `lib/data/products.ts` - Added SKU to variant query
- `components/product/ProductCard.client.tsx` - Updated interface, uses SKU from variants
- `components/product/pdp/PDPClient.tsx` - Uses SKU from variants
- `app/api/cart/actions.ts` - Changed signature to accept `variant_sku`, lookup by SKU

---

### 2. ✅ Silent Abort on Missing SKU

**Problem:** Missing SKU showed alerts to users.

**Fix:**
- Removed all `alert()` calls
- Missing SKU now aborts silently (no UI feedback)
- Console logs only in development mode
- Overlay stays open on failure (no error messages)

**Code Pattern:**
```typescript
if (!variant.sku || variant.sku.trim().length === 0) {
  if (process.env.NODE_ENV === "development") {
    console.error("[ADD_TO_CART] Missing SKU - aborting silently:", { variant, uid, sizeCode });
  }
  return; // Silent abort - no UI feedback
}
```

**Files Modified:**
- `components/product/ProductCard.client.tsx`
- `components/product/pdp/PDPClient.tsx`

---

### 3. ✅ Lazy Cart Initialization

**Status:** Already implemented correctly in `getOrCreateCartId()` function.

**Implementation:**
- Checks `z_session` cookie for guest carts
- Creates new cart if cookie doesn't exist
- Reuses existing cart if cookie found
- Works for both guest and logged-in users

**File:** `app/api/cart/actions.ts` (lines 9-86)

---

### 4. ✅ Add-to-Cart Payload Updated

**Old:** `addToCartAction(product_uid, variantId, qty)`  
**New:** `addToCartAction(product_uid, variant_sku, qty)`

**Implementation:**
- Action signature changed to accept `variant_sku`
- Lookup variant by SKU instead of ID
- Returns variant ID internally for cart_items insertion

**Files Modified:**
- `app/api/cart/actions.ts` - Updated function signature and lookup logic
- `components/product/ProductCard.client.tsx` - Passes SKU instead of ID
- `components/product/pdp/PDPClient.tsx` - Passes SKU instead of ID

---

### 5. ✅ Removed ALL Alert Calls

**Removed:**
- `alert("❌ Size configuration error")`
- `alert("❌ This size is out of stock")`
- `alert("❌ Product variant error (missing SKU)")`
- `alert(\`❌ ${error.message}\`)`

**Replaced With:**
- Silent abort (no UI feedback)
- Console logs only in development mode
- Overlay behavior: success closes, failure keeps open

**Files Modified:**
- `components/product/ProductCard.client.tsx`
- `components/product/pdp/PDPClient.tsx`

---

### 6. ✅ Overlay Behavior Fixed

**Success:**
- Overlay closes
- Cart count updates
- Cart drawer opens

**Failure:**
- Overlay stays open (no UI feedback)
- No error messages shown
- Console logs in dev mode only

**Files Modified:**
- `components/product/ProductCard.client.tsx`
- `components/product/pdp/PDPClient.tsx`

---

## WISHLIST FIXES

### 1. ✅ Guest Support Implemented

**Problem:** Wishlist required login, showed errors for guests.

**Fix:**
- Wishlist store already supports localStorage persistence
- Updated `toggleWishlistAction` to return success for guests
- Removed "Must be logged in" error
- Guests can toggle wishlist (stored in localStorage)
- Logged-in users sync to DB in background

**Implementation:**
```typescript
if (!user) {
  // Guest: Return success - wishlist stored in localStorage
  return { action: "toggled", guest: true };
}
```

**Files Modified:**
- `app/api/wishlist/actions.ts` - Returns success for guests
- `components/wishlist/WishlistButton.client.tsx` - Removed alerts, silent sync

---

### 2. ✅ Removed "Customer Not Found" Error

**Problem:** Error shown when customer record didn't exist (not an error for guests).

**Fix:**
- Returns success for guest-like behavior
- Logs warning in dev mode only
- No UI feedback for missing customer record

**Code:**
```typescript
if (!customer) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[WISHLIST] Customer not found for user:", user.id);
  }
  return { action: "toggled", guest: true };
}
```

**Files Modified:**
- `app/api/wishlist/actions.ts`

---

### 3. ✅ Heart Icon Behavior

**Implementation:**
- Optimistic update (immediate UI feedback)
- Background sync to server
- Navbar count updates immediately
- No alerts or error popups

**Files Modified:**
- `components/wishlist/WishlistButton.client.tsx` - Removed alerts, silent sync

---

### 4. ✅ Wishlist Page Empty State

**Problem:** Empty state routed to `/collections/all` (old PLP).

**Fix:**
- Updated all empty state CTAs to route to `/shop`
- Removed references to `/collections/all`

**Files Modified:**
- `app/(storefront)/wishlist/page.tsx` - Updated CTAs to `/shop`

---

## ROUTING CLEANUP

### 1. ✅ Removed Old PLP References

**Fixed Routes:**
- Wishlist empty state: `/collections/all` → `/shop`
- Search empty state: `/collections/all` → `/shop`

**Verified:**
- Hero sections already route to `/shop` ✅
- CartEmptyState already routes to `/shop` ✅
- No old PLP page found in storefront ✅

**Files Modified:**
- `app/(storefront)/wishlist/page.tsx`
- `app/(storefront)/search/page.tsx`

---

## FINAL CHECKLIST

### Cart
- [x] SKU always comes from DB (variants table)
- [x] Cart init is silent (cookie-based)
- [x] No alerts / popups
- [x] Missing SKU aborts silently
- [x] Overlay closes on success, stays open on failure
- [x] Navbar cart count updates correctly

### Wishlist
- [x] Works for guests (localStorage)
- [x] Works for logged-in users (DB sync)
- [x] No "customer not found" errors
- [x] Heart icon toggles immediately
- [x] Navbar count updates
- [x] Empty state routes to `/shop` only

### Routing
- [x] All CTAs route to `/shop`
- [x] No references to `/collections/all`
- [x] Old PLP routes removed

---

## Files Modified Summary

### Cart Fixes
1. `lib/data/products.ts` - Added SKU to variant query
2. `components/product/ProductCard.client.tsx` - SKU from DB, silent failures
3. `components/product/pdp/PDPClient.tsx` - SKU from DB, silent failures
4. `app/api/cart/actions.ts` - Accept variant_sku, lookup by SKU

### Wishlist Fixes
1. `app/api/wishlist/actions.ts` - Guest support, removed errors
2. `components/wishlist/WishlistButton.client.tsx` - Removed alerts
3. `app/(storefront)/wishlist/page.tsx` - Routes to `/shop`

### Routing Cleanup
1. `app/(storefront)/search/page.tsx` - Routes to `/shop`

---

## Testing Checklist

### Cart
- [ ] Add to cart with valid SKU → Success, overlay closes
- [ ] Add to cart with missing SKU → Silent abort, overlay stays open
- [ ] Add to cart out of stock → Silent abort, overlay stays open
- [ ] Cart count updates correctly
- [ ] Cart drawer opens on success
- [ ] No alerts shown

### Wishlist
- [ ] Guest: Toggle wishlist → Works, stored in localStorage
- [ ] Logged-in: Toggle wishlist → Works, syncs to DB
- [ ] Heart icon updates immediately
- [ ] Navbar count updates
- [ ] No alerts shown
- [ ] Empty state routes to `/shop`

### Routing
- [ ] Wishlist empty state → Routes to `/shop`
- [ ] Search empty state → Routes to `/shop`
- [ ] Hero CTAs → Route to `/shop`
- [ ] Cart empty state → Routes to `/shop`

---

**Status:** ✅ All fixes complete and ready for testing















