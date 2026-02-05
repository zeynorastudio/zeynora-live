# Pre-Auth Stock Validation Refactor

## Overview

This document explains the refactoring of the checkout flow to validate stock **BEFORE** authentication and **BEFORE** Razorpay payment gateway. Stock validation now happens immediately when the user clicks "Checkout", providing instant feedback and preventing unnecessary authentication steps for invalid carts.

## Why Stock Must Validate Before Auth

### Previous Flow Problems

**Old Flow:**
```
1. User clicks "Checkout"
   ↓
2. Auth modal opens (OTP/Guest)
   ↓
3. User completes authentication
   ↓
4. Order creation API called
   ↓
5. Stock validation happens
   ↓
6. If invalid → error shown, auth wasted
```

**Issues:**
- **Wasted User Effort**: Users complete authentication only to discover stock issues
- **Poor UX**: Authentication feels like a barrier, then fails at the last step
- **Unnecessary API Calls**: Auth APIs called even when checkout will fail
- **Frustration**: User has to re-authenticate after fixing cart

### New Flow Benefits

**New Flow:**
```
1. User clicks "Checkout"
   ↓
2. Stock validation (validate_only mode)
   ↓
3a. If invalid → Show stock error modal, STOP
   ↓
3b. If valid → Open auth modal
   ↓
4. User completes authentication
   ↓
5. Order creation API called (normal mode)
   ↓
6. Final stock check (safety net)
   ↓
7. Razorpay opens
```

**Benefits:**
- ✅ **Instant Feedback**: Stock issues detected immediately
- ✅ **Better UX**: No wasted authentication steps
- ✅ **Efficient**: Auth only happens when checkout can proceed
- ✅ **Clear Errors**: User sees exactly what's wrong before committing

## How validate_only Mode Works

### Backend Implementation

The `/api/checkout/create-order` route now accepts an optional `validate_only` boolean flag:

```typescript
{
  items: CartItem[],
  validate_only?: boolean,  // NEW: Skip order creation
  customer?: CustomerData,   // Optional when validate_only is true
  address?: AddressData,    // Optional when validate_only is true
}
```

### Validation Flow

1. **Stock Validation Always First**
   - Stock validation happens at the very top of the route handler
   - No customer/address validation required when `validate_only` is true
   - Uses the same strict deterministic validation as before

2. **Early Return on Validation Failure**
   ```typescript
   if (errors.length > 0) {
     return NextResponse.json(
       {
         success: false,
         error: "Stock validation failed",
         invalid_items: errors
       },
       { status: 409 }
     );
   }
   ```

3. **Early Return on validate_only Success**
   ```typescript
   if (validate_only === true) {
     return NextResponse.json(
       {
         success: true,
         validation_passed: true
       },
       { status: 200 }
     );
   }
   ```

4. **Normal Order Creation**
   - If `validate_only` is not true, continue with customer/address validation
   - Proceed with order creation and Razorpay setup

### Frontend Implementation

**CartDrawer Component:**

```typescript
const handleCheckoutClick = async () => {
  // Step 1: Validate stock first
  const stockValid = await validateStock();
  
  // Step 2: Only proceed to auth if stock is valid
  if (stockValid) {
    setShowAuthModal(true);
  }
  // Otherwise, stock error modal is shown
};
```

**Stock Validation Function:**

```typescript
const validateStock = async (): Promise<boolean> => {
  const validationData = {
    items: cartItems,
    validate_only: true,  // Key flag
  };
  
  const response = await fetch("/api/checkout/create-order", {
    method: "POST",
    body: JSON.stringify(validationData),
  });
  
  if (response.status === 409) {
    // Stock validation failed
    setStockErrors(data.invalid_items);
    setShowStockModal(true);
    return false;
  }
  
  return true; // Validation passed
};
```

## Race Condition Safety

### Why Race Conditions Remain Safe

Despite validating stock before authentication, race conditions are still safe due to the **two-layer protection**:

#### Layer 1: Pre-Auth Validation (This Refactor)
- **Purpose**: UX optimization - catch invalid carts early
- **When**: Before authentication
- **What**: Validates stock at checkout button click
- **Result**: Blocks invalid carts from proceeding to auth

#### Layer 2: Final Atomic Deduction (Webhook)
- **Purpose**: Data integrity - prevent overselling
- **When**: After successful payment
- **What**: Atomic stock check + deduction in single transaction
- **Result**: Guarantees stock is actually available at payment time

### Race Condition Flow

```
Time T0: User clicks "Checkout"
  ↓
Time T1: Pre-auth validation checks stock = 5
  ↓ Validation passes (requested = 3)
  ↓
Time T2: User completes authentication (takes 30 seconds)
  ↓
Time T3: Order created, Razorpay opens
  ↓
Time T4: User completes payment (takes 60 seconds)
  ↓
Time T5: Webhook receives payment confirmation
  ↓
Time T6: Webhook performs FINAL atomic check:
         - Lock row
         - Check stock (now = 2, was 5 at T1)
         - If insufficient → refund payment, cancel order
         - If sufficient → deduct stock atomically
```

### Why This Is Safe

1. **Pre-Auth Validation**: Catches obviously invalid carts (better UX)
2. **Webhook Atomic Check**: Guarantees stock is available at payment time (data integrity)
3. **No Stock Deduction at Order Creation**: Stock is only deducted in webhook after payment
4. **Idempotent Webhook**: Multiple webhook calls are safely deduplicated

### Edge Cases Handled

**Case 1: Stock Changes Between Validation and Payment**
- Pre-auth validation passes (stock = 5, requested = 3)
- Another user buys 4 units
- Stock now = 1
- Webhook checks: 1 < 3 → Payment fails, order cancelled, refund issued
- ✅ **Safe**: User gets refund, no overselling

**Case 2: Stock Changes During Auth**
- Pre-auth validation passes (stock = 5, requested = 3)
- User takes 2 minutes to complete OTP
- During this time, stock drops to 2
- Order creation succeeds (no stock check at order creation)
- Webhook checks: 2 < 3 → Payment fails
- ✅ **Safe**: Final check prevents overselling

**Case 3: Concurrent Checkouts**
- User A validates: stock = 5, requested = 3
- User B validates: stock = 5, requested = 3
- Both pass pre-auth validation
- User A pays first → Webhook deducts 3, stock = 2
- User B pays second → Webhook checks: 2 < 3 → Payment fails
- ✅ **Safe**: Atomic webhook prevents double-selling

## UX Improvements: Blocking Invalid Carts Cleanly

### Stock Validation Modal

When stock validation fails, users see a clear modal with:

1. **Error Summary**
   - "Stock Validation Failed" header
   - Clear explanation of the issue

2. **Detailed Item List**
   - Each invalid item shown separately
   - SKU displayed for reference
   - Requested quantity vs Available quantity
   - Reason (INSUFFICIENT_STOCK or VARIANT_NOT_FOUND)

3. **Action Buttons**
   - **Cancel**: Close modal, return to cart
   - **Update Cart**: Auto-correct quantities and re-validate

### Auto-Correct Cart Functionality

When user clicks "Update Cart":

1. **For INSUFFICIENT_STOCK**:
   - Quantity updated to `available_quantity`
   - If `available_quantity = 0`, item removed

2. **For VARIANT_NOT_FOUND**:
   - Item removed from cart entirely

3. **Re-Validation**:
   - After auto-correction, validation runs again
   - If passes → Auth modal opens automatically
   - If still fails → Modal shows remaining issues

### Example User Flow

```
User clicks "Checkout"
  ↓
Stock validation runs
  ↓
Error detected:
  - SKU "ABC-123": Requested 5, Available 3
  - SKU "XYZ-789": Requested 2, Available 0
  ↓
Stock error modal appears
  ↓
User clicks "Update Cart"
  ↓
Cart auto-corrected:
  - ABC-123: quantity 5 → 3
  - XYZ-789: removed (out of stock)
  ↓
Re-validation runs automatically
  ↓
Validation passes
  ↓
Auth modal opens
```

### Benefits

- ✅ **No Manual Correction**: User doesn't need to guess correct quantities
- ✅ **Instant Feedback**: Issues shown immediately, not after auth
- ✅ **Clear Information**: Exact quantities displayed, not just "out of stock"
- ✅ **Smooth Flow**: Auto-correction + re-validation happens seamlessly

## Implementation Details

### Backend Changes

**File**: `app/api/checkout/create-order/route.ts`

1. **Schema Update**:
   - Added `validate_only?: boolean` to request schema
   - Made `customer` and `address` optional (not required when `validate_only` is true)

2. **Validation Order**:
   - Stock validation moved to top (before customer/address validation)
   - Early return if `validate_only` is true and validation passes
   - Customer/address validation only runs when creating order

3. **No Order Creation in validate_only Mode**:
   - No database writes
   - No Razorpay order creation
   - Pure validation only

### Frontend Changes

**File**: `components/cart/CartDrawer.tsx`

1. **New State**:
   - `showStockModal`: Controls stock error modal visibility
   - `stockErrors`: Stores validation errors
   - `validatingStock`: Loading state during validation

2. **Modified handleCheckoutClick**:
   - Calls `validateStock()` first
   - Only opens auth modal if validation passes

3. **New Functions**:
   - `validateStock()`: Calls API with `validate_only: true`
   - `handleUpdateCart()`: Auto-corrects cart and re-validates

**File**: `components/checkout/StockValidationModal.tsx` (NEW)

- Modal component for displaying stock errors
- Shows SKU, requested quantity, available quantity
- Provides "Update Cart" and "Cancel" actions

## Testing Scenarios

### Scenario 1: Valid Cart
- **Input**: Cart with valid SKUs and sufficient stock
- **Expected**: Stock validation passes → Auth modal opens
- **Result**: ✅ Checkout proceeds normally

### Scenario 2: Insufficient Stock
- **Input**: Cart with SKU requesting 5 units, stock = 3
- **Expected**: Stock error modal shows, auth blocked
- **Result**: ✅ User sees error, can update cart

### Scenario 3: Out of Stock
- **Input**: Cart with SKU requesting 2 units, stock = 0
- **Expected**: Stock error modal shows, item can be removed
- **Result**: ✅ User can remove item or update cart

### Scenario 4: Missing SKU
- **Input**: Cart with SKU that doesn't exist in database
- **Expected**: Stock error modal shows VARIANT_NOT_FOUND
- **Result**: ✅ Item removed on "Update Cart"

### Scenario 5: Auto-Correct and Re-Validate
- **Input**: Cart with multiple invalid items
- **Expected**: After "Update Cart", quantities adjusted, re-validation runs
- **Result**: ✅ If passes, auth opens automatically

### Scenario 6: Duplicate SKUs
- **Input**: Cart with same SKU twice: `[{sku: "ABC", qty: 3}, {sku: "ABC", qty: 2}]`, stock = 4
- **Expected**: Validation aggregates to 5, detects insufficient stock
- **Result**: ✅ Correctly detects total requested quantity exceeds stock

## Conclusion

The pre-auth stock validation refactor provides:

1. **Better UX**: Users get instant feedback on stock issues
2. **Efficient Flow**: No wasted authentication steps
3. **Clear Errors**: Detailed information about what's wrong
4. **Auto-Correction**: Cart can be fixed automatically
5. **Race Condition Safe**: Final atomic check in webhook prevents overselling
6. **No Schema Changes**: Reuses existing route with optional flag
7. **Backward Compatible**: Normal order creation flow unchanged

The two-layer protection (pre-auth validation + webhook atomic check) ensures both good UX and data integrity.
