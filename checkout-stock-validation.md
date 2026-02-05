# Checkout Stock Validation

## Overview

This document describes the read-only stock validation implemented in the checkout initiation flow. The validation prevents users from entering payment with an invalid cart by checking stock availability before order creation.

## Implementation Location

**Route:** `app/api/checkout/create-order/route.ts`

The stock validation runs in the `POST` handler, immediately after request validation and before any order creation logic.

## Flow Diagram

```
1. Request received → Validate request schema
2. Stock validation phase (READ-ONLY)
   ├─ Fetch all variants by SKU (single query)
   ├─ For each cart item:
   │  ├─ Check if variant exists
   │  ├─ Check if stock > 0
   │  └─ Check if stock >= requested quantity
   └─ Collect all invalid items (no fail-fast)
3. If any invalid items → Return HTTP 409 with all errors
4. If all valid → Proceed with order creation (unchanged)
```

## Stock Validation Logic

### Validation Rules

For each cart item, the following checks are performed:

1. **Variant Existence**
   - Check if variant exists in `product_variants` table by SKU
   - If not found: `reason = "VARIANT_NOT_FOUND"`

2. **Stock Availability**
   - Read `stock` field from variant (nullable, defaults to 0)
   - If `stock === 0`: `reason = "OUT_OF_STOCK"`
   - If `stock < requested_quantity`: `reason = "INSUFFICIENT_STOCK"`

### Read-Only Design

The validation is **strictly read-only**:

- ✅ Uses `SELECT` queries only
- ✅ No `UPDATE` or `INSERT` operations
- ✅ No `FOR UPDATE` locks
- ✅ No stock deduction or reservation
- ✅ No database functions called

This ensures:
- **No race conditions**: Multiple concurrent checkouts can read stock simultaneously without blocking
- **No side effects**: Stock remains unchanged during validation
- **Fast performance**: Read queries are fast and don't require locks

### Why No Race Condition Exists

**Race conditions occur when:**
- Multiple processes modify shared state concurrently
- Locks are used to serialize access

**Our implementation avoids race conditions because:**
1. **Read-only operations**: We only read stock values, never modify them
2. **No locks**: No `FOR UPDATE` or transaction-level locks are used
3. **Stock mutation happens elsewhere**: Actual stock deduction occurs in the payment webhook after successful payment, which uses proper locking mechanisms

**Note:** There is a small window between validation and payment where stock could change. This is acceptable because:
- Final stock validation happens in the payment webhook (with proper locking)
- This checkout validation is a UX improvement to catch obvious issues early
- Users are informed immediately if their cart is invalid

## Error Response Format

### HTTP Status Code

- **409 Conflict**: Used when stock validation fails (indicates a conflict between requested and available stock)

### Response Structure

```typescript
{
  success: false,
  error: "Stock validation failed",
  invalid_items: [
    {
      sku: string,
      variant_id?: string,        // Present if variant exists but stock insufficient
      requested_quantity: number,
      available_quantity: number,
      reason: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "VARIANT_NOT_FOUND"
    }
  ]
}
```

### Example Response

```json
{
  "success": false,
  "error": "Stock validation failed",
  "invalid_items": [
    {
      "sku": "PROD-001-S-M",
      "variant_id": "550e8400-e29b-41d4-a716-446655440000",
      "requested_quantity": 5,
      "available_quantity": 2,
      "reason": "INSUFFICIENT_STOCK"
    },
    {
      "sku": "PROD-002-L",
      "requested_quantity": 1,
      "available_quantity": 0,
      "reason": "OUT_OF_STOCK"
    },
    {
      "sku": "INVALID-SKU-123",
      "requested_quantity": 1,
      "available_quantity": 0,
      "reason": "VARIANT_NOT_FOUND"
    }
  ]
}
```

## Frontend Integration

### Error Handling

The frontend should handle the `409` response and display user-friendly messages:

```typescript
try {
  const response = await fetch("/api/checkout/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  const result = await response.json();

  if (response.status === 409 && result.invalid_items) {
    // Handle stock validation errors
    const errorMessages = result.invalid_items.map((item: StockValidationError) => {
      switch (item.reason) {
        case "OUT_OF_STOCK":
          return `${item.sku} is out of stock`;
        case "INSUFFICIENT_STOCK":
          return `${item.sku}: Only ${item.available_quantity} available (requested ${item.requested_quantity})`;
        case "VARIANT_NOT_FOUND":
          return `${item.sku} is no longer available`;
        default:
          return `${item.sku} is invalid`;
      }
    });
    
    // Display errors to user
    setError(errorMessages.join(", "));
    // Optionally: Update cart, remove invalid items, or redirect to cart page
    return;
  }

  // Handle other errors...
} catch (error) {
  // Handle network errors...
}
```

### Recommended UX Flow

1. **Display all errors**: Show all invalid items at once (not just the first)
2. **Update cart**: Optionally remove invalid items or update quantities
3. **Redirect option**: Offer to return to cart page to fix issues
4. **Clear messaging**: Use the `reason` field to provide specific error messages

## Edge Cases Handled

### 1. Multiple Invalid Items

- **Behavior**: All invalid items are collected and returned in a single response
- **Implementation**: Loop through all items, collect errors, return all at once
- **UX Benefit**: User sees all issues at once, not one-by-one

### 2. Null Stock Values

- **Behavior**: `null` or `undefined` stock is treated as `0`
- **Implementation**: `const availableStock = variant.stock ?? 0;`
- **Result**: Variant with null stock triggers `OUT_OF_STOCK` error

### 3. Variant Not Found

- **Behavior**: SKU doesn't exist in database
- **Implementation**: Check if variant exists in map after query
- **Result**: `VARIANT_NOT_FOUND` error with `available_quantity: 0`

### 4. Partial Cart Invalid

- **Behavior**: Some items valid, some invalid
- **Implementation**: Validation fails if ANY item is invalid
- **Result**: Entire checkout aborted, all invalid items returned

### 5. Empty Cart

- **Behavior**: Handled by Zod schema validation (min 1 item)
- **Implementation**: Schema validation runs before stock validation
- **Result**: Returns `400 Bad Request` before stock check

### 6. Concurrent Checkouts

- **Behavior**: Multiple users can validate simultaneously
- **Implementation**: Read-only queries, no locks
- **Result**: No blocking, fast responses, final validation in webhook

## Performance Considerations

### Optimization

- **Single Query**: All variants fetched in one `IN` query instead of N queries
- **Map Lookup**: O(1) variant lookup using Map data structure
- **Early Exit**: Validation happens before any order creation logic

### Query Pattern

```sql
SELECT id, sku, price, cost, stock, product_uid
FROM product_variants
WHERE sku IN ('SKU1', 'SKU2', 'SKU3', ...)
```

This is more efficient than:
```sql
-- BAD: N queries
SELECT ... WHERE sku = 'SKU1';
SELECT ... WHERE sku = 'SKU2';
SELECT ... WHERE sku = 'SKU3';
```

## Constraints Compliance

✅ **No new routes created** - Modified existing route only  
✅ **No stock mutation** - Read-only SELECT queries  
✅ **No locks** - No FOR UPDATE or transaction locks  
✅ **No payment logic touched** - Validation happens before payment  
✅ **No webhook logic touched** - Webhook remains unchanged  
✅ **No admin logic touched** - Admin routes untouched  
✅ **No authentication required** - Works for guest checkout  
✅ **TypeScript clean** - Proper types, no `any`  
✅ **Lint clean** - Follows project linting rules  

## Related Files

- **Route**: `app/api/checkout/create-order/route.ts`
- **Frontend**: `components/checkout/GuestCheckoutForm.tsx`
- **Schema**: `types/supabase.ts` (product_variants table definition)
- **Stock Deduction**: `app/api/payments/webhook/route.ts` (handles actual stock updates)

## Future Considerations

### Potential Enhancements

1. **Caching**: Cache stock values for frequently accessed variants (with TTL)
2. **Real-time Updates**: Use Supabase real-time subscriptions to update cart when stock changes
3. **Reservation System**: Add temporary stock reservation (requires new routes/functions - out of scope)
4. **Batch Validation**: Validate stock for multiple carts simultaneously (admin use case)

### Not in Scope

- Stock reservation/deduction (handled in webhook)
- Lock-based validation (defeats purpose of read-only check)
- New API routes (strictly prohibited)
- Database functions (strictly prohibited)
