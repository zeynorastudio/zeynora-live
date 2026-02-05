# Strict Stock Validation Fix

## Overview

This document explains the implementation of strictly deterministic, fail-fast stock validation in `/api/checkout/create-order`. The validation now guarantees that checkout is blocked before order creation if any cart item's requested quantity exceeds available stock.

## Problem: Why Previous Validation Could Silently Pass

The previous stock validation implementation had several weaknesses that could allow invalid orders to proceed:

### 1. **Missing SKU Detection Gap**
- **Issue**: The validation checked each cart item individually against a variant map, but did not verify that ALL requested SKUs existed in the database.
- **Risk**: If a SKU was missing from the database but present in the cart, the validation would mark it as "VARIANT_NOT_FOUND" but only after processing other items. More critically, if the variant query returned fewer results than requested SKUs, the mismatch wasn't caught upfront.
- **Example**: Cart has SKUs `["ABC", "XYZ", "MISSING"]` but database only returns variants for `["ABC", "XYZ"]`. The validation would process ABC and XYZ successfully, then fail on MISSING, but the count mismatch wasn't explicitly checked.

### 2. **Duplicate SKU Handling**
- **Issue**: The validation processed each cart item independently, even if the same SKU appeared multiple times in the cart.
- **Risk**: If a cart had duplicate SKU entries (e.g., `[{sku: "ABC", quantity: 3}, {sku: "ABC", quantity: 2}]`), the validation would check each entry separately against the same stock value. This could allow orders where the total requested quantity (5) exceeds stock (4), but each individual entry (3 and 2) passes validation.
- **Example**: Stock = 4, Cart = `[{sku: "ABC", qty: 3}, {sku: "ABC", qty: 2}]`. Old validation checks: `3 <= 4` ✓ and `2 <= 4` ✓, but total `5 > 4` ✗.

### 3. **Inconsistent Error Handling**
- **Issue**: The validation used separate error types (`OUT_OF_STOCK` vs `INSUFFICIENT_STOCK`) and included `variant_id` in errors, which wasn't necessary for validation.
- **Risk**: This complexity made error handling inconsistent and harder to reason about. Both zero stock and insufficient stock represent the same fundamental problem: requested quantity exceeds available stock.

## Solution: Deterministic Validation

The new validation implements strict, deterministic checks that guarantee correct blocking:

### 1. **Explicit SKU Existence Check**
```typescript
const uniqueSkus = Array.from(new Set(skus));
if (typedVariants.length !== uniqueSkus.length) {
  // Return 409 with VARIANT_NOT_FOUND for missing SKUs
}
```
- **Guarantee**: Before any stock comparison, we verify that the number of variants returned equals the number of unique SKUs requested.
- **Result**: Any missing SKU is immediately detected and checkout is blocked with a clear error.

### 2. **Aggregated Quantity Validation**
```typescript
for (const sku of uniqueSkus) {
  const requestedQuantity = items
    .filter(item => item.sku === sku)
    .reduce((sum, item) => sum + item.quantity, 0);
  
  const stock = stockMap.get(sku) ?? 0;
  
  if (requestedQuantity > stock) {
    errors.push({ sku, requested_quantity: requestedQuantity, ... });
  }
}
```
- **Guarantee**: For each unique SKU, we aggregate the total requested quantity across all cart items, then compare against available stock.
- **Result**: Duplicate SKUs in the cart are correctly handled, and the total requested quantity is validated against stock.

### 3. **Simplified Error Structure**
- **Removed**: `OUT_OF_STOCK` (redundant with `INSUFFICIENT_STOCK`)
- **Removed**: `variant_id` from errors (not needed for validation)
- **Kept**: `INSUFFICIENT_STOCK` for any case where `requested_quantity > available_quantity`
- **Kept**: `VARIANT_NOT_FOUND` for missing SKUs

### 4. **Fail-Fast Behavior**
- **Guarantee**: If ANY validation error exists, the function returns 409 immediately and stops execution.
- **Result**: No order is created, no Razorpay payment gateway is opened, and the user receives a clear error message with details about which items are invalid.

## Edge Cases Handled

### Duplicate SKUs in Cart
- **Handled**: Aggregates quantities before validation
- **Example**: `[{sku: "ABC", qty: 3}, {sku: "ABC", qty: 2}]` → validates total `5` against stock

### Null Stock
- **Handled**: Treats `null` stock as `0` using nullish coalescing (`??`)
- **Result**: Items with null stock are correctly blocked

### Zero Stock
- **Handled**: `0` stock is treated as insufficient for any positive quantity
- **Result**: Out-of-stock items are blocked with `INSUFFICIENT_STOCK` error

### Missing SKU
- **Handled**: Explicit count check (`variants.length !== uniqueSkus.length`) catches missing SKUs
- **Result**: Missing SKUs are reported with `VARIANT_NOT_FOUND` error

## Race Condition Safety

### Why Race Conditions Are Still Safe

Despite the validation happening before order creation, race conditions are safe because:

1. **Validation is Pre-Creation Only**
   - Stock validation happens BEFORE the order is created in the database
   - This prevents orders from being created if stock is insufficient at validation time
   - However, between validation and payment, stock can change

2. **Final Atomic Deduction in Webhook**
   - The actual stock deduction happens atomically in the payment webhook (`/api/payments/webhook`)
   - The webhook performs a final stock check and deduction in a single database transaction
   - If stock is insufficient at payment time, the webhook will fail the payment and refund

3. **Order State Protection**
   - Orders are created with `payment_status='pending'` and `order_status='created'`
   - Stock is NOT deducted at order creation time
   - Only after successful payment (verified in webhook) is stock deducted

4. **Webhook Idempotency**
   - The webhook uses idempotency keys to prevent duplicate processing
   - Multiple webhook calls for the same payment are safely deduplicated

### Race Condition Flow

```
1. User clicks checkout
   ↓
2. Frontend calls /api/checkout/create-order
   ↓
3. Stock validation (THIS FIX) - checks stock, blocks if insufficient
   ↓
4. Order created with payment_status='pending' (NO stock deduction)
   ↓
5. Razorpay payment gateway opens
   ↓
6. User completes payment
   ↓
7. Razorpay webhook calls /api/payments/webhook
   ↓
8. Webhook performs FINAL stock check + atomic deduction
   ↓
9. If stock insufficient → payment fails, order cancelled, refund issued
   ↓
10. If stock sufficient → stock deducted, order confirmed
```

### Why This Is Safe

- **Validation Layer**: Prevents obviously invalid orders from being created (better UX, reduces invalid orders)
- **Webhook Layer**: Final atomic check ensures stock is actually available at payment time (prevents overselling)
- **Two-Layer Protection**: Even if validation passes but stock changes before payment, the webhook will catch it

## Implementation Details

### Validation Flow

1. **Extract SKUs**: `const skus = items.map(i => i.sku);`
2. **Fetch Variants**: Single query to get all variants for requested SKUs
3. **Check Existence**: Verify `variants.length === uniqueSkus.length`
4. **Build Stock Map**: Create `Map<sku, stock>` for O(1) lookup
5. **Validate Quantities**: For each unique SKU, aggregate quantities and compare against stock
6. **Fail Fast**: Return 409 immediately if any validation fails

### Key Code Changes

- **Removed**: `OUT_OF_STOCK` error type (consolidated into `INSUFFICIENT_STOCK`)
- **Removed**: `variant_id` from error structure
- **Added**: Explicit SKU existence check (`variants.length !== uniqueSkus.length`)
- **Added**: Quantity aggregation for duplicate SKUs
- **Improved**: Single database query for variants (reused for order creation)

## Testing Scenarios

### Scenario 1: Missing SKU
- **Input**: Cart with SKU "MISSING" that doesn't exist in DB
- **Expected**: 409 response with `VARIANT_NOT_FOUND` error
- **Result**: ✓ Checkout blocked, no order created

### Scenario 2: Duplicate SKUs
- **Input**: Cart with `[{sku: "ABC", qty: 3}, {sku: "ABC", qty: 2}]`, stock = 4
- **Expected**: 409 response with `INSUFFICIENT_STOCK` (total requested: 5, available: 4)
- **Result**: ✓ Checkout blocked, no order created

### Scenario 3: Insufficient Stock
- **Input**: Cart with `[{sku: "ABC", qty: 5}]`, stock = 3
- **Expected**: 409 response with `INSUFFICIENT_STOCK`
- **Result**: ✓ Checkout blocked, no order created

### Scenario 4: Null Stock
- **Input**: Cart with SKU that has `stock = null` in DB
- **Expected**: 409 response with `INSUFFICIENT_STOCK` (treated as 0)
- **Result**: ✓ Checkout blocked, no order created

### Scenario 5: Valid Order
- **Input**: Cart with valid SKUs and sufficient stock
- **Expected**: Order created, Razorpay gateway opens
- **Result**: ✓ Order proceeds normally

## Conclusion

The new validation is strictly deterministic and fail-fast:
- ✅ All SKUs must exist in database
- ✅ Duplicate SKUs are aggregated before validation
- ✅ Stock is checked against aggregated quantities
- ✅ Null stock is treated as zero
- ✅ Any validation failure blocks checkout immediately
- ✅ No order is created if validation fails
- ✅ No Razorpay gateway opens on 409 error
- ✅ Race conditions are safe due to final atomic deduction in webhook

This ensures that invalid orders are caught early, providing better UX and reducing the load on downstream systems (payment gateway, webhook, etc.).
