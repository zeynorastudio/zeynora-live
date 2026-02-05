# Checkout Payment Architecture Reset

## Overview

This document explains the architectural reset performed on the checkout, order creation, and Razorpay initialization flow to guarantee a deterministic payment experience.

## Problem Statement

### Why `validate_only` Caused Instability

The previous architecture used a `validate_only` flag that created a **multi-step orchestration pattern**:

1. **CartDrawer** called `/api/checkout/create-order` with `validate_only: true`
2. Backend performed stock validation and returned early (no order creation)
3. If validation passed, auth modal was shown
4. **GuestCheckoutForm** then called the same endpoint WITHOUT `validate_only`
5. Backend created DB order, THEN created Razorpay order, THEN updated DB with razorpay_order_id

**Problems with this approach:**

1. **Race Conditions**: Between step 2 (validation) and step 4 (order creation), stock could change
2. **Orphan Orders**: If Razorpay creation failed after DB order was created, we had to rollback
3. **Partial State Window**: Orders existed in DB without `razorpay_order_id` temporarily
4. **Multiple API Calls**: Two separate calls for what should be atomic operation
5. **Complex Error Recovery**: Rollback logic was required for every failure point
6. **Inconsistent UX**: Users could see validation pass but then fail at order creation

### Why Order Before Razorpay Was Wrong

The previous flow created the database order FIRST, then called Razorpay:

```
OLD FLOW (PROBLEMATIC):
1. Stock validation ✓
2. Create DB order → order_id exists, razorpay_order_id = NULL  ⚠️
3. Call Razorpay API
4. If Razorpay fails → DELETE order (rollback) ⚠️
5. If Razorpay succeeds → UPDATE order with razorpay_order_id
```

**Problems:**
- Window where orders exist without payment capability (lines 2-5)
- Rollback failures could leave orphan orders
- Database transactions spanning external API calls
- Complex error handling at every step

## New Architecture

### Single Deterministic Flow

```
NEW FLOW (GUARANTEED):
1. Stock validation (read-only) → 409 if fails
2. Create Razorpay order FIRST → 500 if fails
3. Create DB order WITH razorpay_order_id in single INSERT
```

### Why Razorpay Must Precede DB Order

**Key Insight**: An order without a Razorpay order ID has no value. It cannot be paid.

By creating Razorpay order FIRST:
- If Razorpay fails → No DB operation happens, clean failure
- If Razorpay succeeds → We have a valid `razorpay_order_id` to store
- DB order is created WITH `razorpay_order_id` in the initial INSERT
- **INVARIANT: No order exists in database without razorpay_order_id**

This eliminates:
- Rollback logic
- Partial state window
- Orphan orders
- Complex error recovery

### Why This Guarantees Webhook Safety

The webhook receives `razorpay_order_id` and looks up our order:

```javascript
// Webhook flow (unchanged)
const order = await supabase
  .from("orders")
  .select("*")
  .eq("razorpay_order_id", razorpay_order_id)
  .single();
```

**Old Risk**: Webhook could fire before our DB order had `razorpay_order_id`

**New Guarantee**: If webhook fires, `razorpay_order_id` ALWAYS exists because:
1. Razorpay order was created first
2. DB order was created with `razorpay_order_id` in same INSERT
3. No update step required

### Why Stock/Shipping Logic Remains Safe

**Stock Decrement**: Handled by `decrement_stock_for_order` RPC in webhook
- Only called after payment is confirmed
- Uses atomic database operations
- Unchanged by this reset

**Shiprocket**: Triggered after stock is decremented
- Happens in webhook handler
- Depends on order status, not creation flow
- Unchanged by this reset

### Why Guest & Logged-In Paths Now Converge

Previous architecture had different code paths:
- Guest: `guest_session_id` passed, `customer_id` null
- Logged-in: `customer_id` resolved from session
- OTP-verified: `customer_id` from verification flow

**New Unified Flow**:
```javascript
// Backend doesn't care about auth type - same flow for all
const orderData = {
  customer: { name, phone, email },
  address: { ... },
  items: [ ... ],
  // Optional identifiers - backend handles uniformly
  customer_id: session?.customer_id || null,
  guest_session_id: session?.guest_session_id || null,
};

// Single POST to /api/checkout/create-order
const response = await fetch("/api/checkout/create-order", {
  method: "POST",
  body: JSON.stringify(orderData),
});

// Same response handling for all user types
if (response.status === 409) { /* stock error */ }
if (response.status === 500) { /* payment error */ }
if (response.ok) { /* open Razorpay popup */ }
```

## Implementation Details

### Backend: `/api/checkout/create-order`

```javascript
// STEP 1: Stock validation (read-only)
const stockValid = await validateStock(items);
if (!stockValid) {
  console.log("[FLOW] Stock validation FAILED - blocking checkout");
  return Response.json({ error: "Stock validation failed" }, { status: 409 });
}
console.log("[FLOW] Stock validated");

// STEP 2: Create Razorpay order FIRST
try {
  razorpayOrder = await razorpay.orders.create({ amount, currency, receipt });
  razorpayOrderId = razorpayOrder.id;
  console.log("[FLOW] Razorpay order created:", razorpayOrderId);
} catch (err) {
  // NO database rollback needed - we never created a DB order
  return Response.json({ error: "Payment gateway failed" }, { status: 500 });
}

// STEP 3: Create DB order WITH razorpay_order_id
const { data: order } = await supabase.from("orders").insert({
  order_number: orderNumber,
  razorpay_order_id: razorpayOrderId, // CRITICAL: Set in initial insert
  // ... other fields
});
console.log("[FLOW] Order persisted with Razorpay ID");
```

### Frontend: GuestCheckoutForm

```javascript
const handleSubmit = async () => {
  console.log("[FLOW] Creating order (single deterministic flow)");
  
  const response = await fetch("/api/checkout/create-order", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
  
  if (response.status === 409) {
    console.log("[FLOW] Stock validation failed (409)");
    onStockValidationError(data.invalid_items);
    return;
  }
  
  if (!response.ok) {
    setError("Payment initialization failed");
    return;
  }
  
  console.log("[FLOW] Checkout success → opening Razorpay");
  
  const razorpay = new window.Razorpay({
    key: result.razorpay_key_id,
    order_id: result.razorpay_order_id,
    // ...
  });
  razorpay.open();
};
```

### Frontend: CartDrawer

```javascript
// SIMPLIFIED: No pre-validation, direct to auth
const handleCheckoutClick = () => {
  console.log("[FLOW] Checkout clicked - opening auth modal directly");
  setShowAuthModal(true);
};
```

## Flow Logs

### Backend Logs
```
[FLOW] Order creation started - single deterministic flow
[FLOW] Stock validated
[FLOW] Razorpay order created: order_xxxxxxxxx
[FLOW] Order persisted with Razorpay ID
[FLOW] Order creation complete: { order_id, order_number, razorpay_order_id }
```

### Frontend Logs
```
[FLOW] Checkout clicked - opening auth modal directly
[FLOW] Creating order (single deterministic flow)
[FLOW] Order created: ZYN-20260201-1234
[FLOW] Razorpay order ID: order_xxxxxxxxx
[FLOW] Checkout success → opening Razorpay
```

## Test Scenarios

### 1. Stock Insufficient
- **Action**: Checkout with item that has 0 stock
- **Expected**: 409 response, stock modal shown, no order in DB
- **Razorpay**: NOT called

### 2. Stock Sufficient
- **Action**: Checkout with available items
- **Expected**: 200 response, Razorpay popup opens
- **DB State**: Order exists with `razorpay_order_id`

### 3. Payment Success
- **Action**: Complete Razorpay payment
- **Expected**: Webhook fires, `payment_status` → 'paid'
- **Stock**: Decremented via `decrement_stock_for_order`
- **Shiprocket**: Booking created

### 4. Payment Cancelled
- **Action**: Close Razorpay popup
- **Expected**: Order remains with `payment_status` = 'pending'
- **Stock**: NOT decremented
- **Recovery**: User can retry payment later

### 5. Razorpay API Failure
- **Action**: Razorpay API returns error
- **Expected**: 500 response, error shown to user
- **DB State**: No order created (clean failure)

### 6. Guest Checkout
- **Action**: Checkout without login
- **Expected**: Same flow as logged-in, `customer_id` = null

### 7. Logged-In Checkout
- **Action**: Checkout with authenticated user
- **Expected**: Same flow as guest, `customer_id` populated

## Invariants

1. **No orphan orders**: Every order in DB has `razorpay_order_id`
2. **Single API call**: Checkout triggers exactly one create-order call
3. **Atomic success**: Razorpay popup opens IFF order was created successfully
4. **Clean failures**: Failed checkouts leave no database artifacts
5. **Unified flow**: Guest and logged-in users share identical backend code path

## Files Modified

- `app/api/checkout/create-order/route.ts` - Backend flow reset
- `components/checkout/GuestCheckoutForm.tsx` - Frontend single-call flow
- `components/cart/CartDrawer.tsx` - Removed multi-step orchestration

## Files NOT Modified (Preserved)

- `app/api/payments/webhook/route.ts` - Webhook logic unchanged
- Stock decrement RPC - Unchanged
- Shiprocket integration - Unchanged
- Database schema - Unchanged
