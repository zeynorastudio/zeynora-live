# Razorpay Backend Hardening

## Problem: Silent Failures and Inconsistent State

### The Issue

Previously, the `/api/checkout/create-order` endpoint had a critical flaw in its Razorpay order creation logic:

1. **Silent Failures**: If Razorpay order creation failed, the error was caught but the API still returned success (with `razorpay_order_id: undefined`). This created inconsistent state where:
   - An order existed in the database without a valid `razorpay_order_id`
   - The frontend received a "success" response but couldn't proceed with payment
   - Stock validation had already passed, but payment couldn't be initiated

2. **Partial State**: Orders could exist in the database with:
   - `order_status: 'created'`
   - `payment_status: 'pending'`
   - `razorpay_order_id: null` (missing)
   
   This broke the invariant: **Every order must have a valid Razorpay order ID before stock deduction or shipping can proceed.**

3. **No Rollback**: When Razorpay failed, the database order remained, creating orphaned records that couldn't be paid for.

### Why This Was Dangerous

- **Stock Management**: If an order exists without a Razorpay order ID, the webhook can't process payment. Stock remains reserved but payment never completes.
- **Shipping**: Orders without valid payment gateway orders can't be fulfilled, leading to customer confusion.
- **Data Integrity**: Partial orders pollute the database and make reconciliation difficult.
- **Customer Experience**: Users see "Order created" but can't actually pay, leading to frustration and support tickets.

## Solution: Fail-Fast with Rollback

### Changes Implemented

#### 1. **Strict Error Handling**

```typescript
try {
  // Create Razorpay order
  razorpayOrder = await razorpay.orders.create({...});
  
  if (!razorpayOrder || !razorpayOrder.id) {
    throw new Error("Invalid Razorpay response");
  }
} catch (err) {
  // CRITICAL: Rollback DB order
  await supabase.from("orders").delete().eq("id", typedOrder.id);
  
  return NextResponse.json({
    success: false,
    error: "Payment gateway initialization failed"
  }, { status: 500 });
}
```

**Key Points:**
- Razorpay creation is wrapped in try/catch
- Invalid responses (missing order ID) are treated as errors
- On any failure, the database order is immediately deleted
- API returns error status (500) instead of success

#### 2. **Environment Variable Verification**

```typescript
console.log("[RAZORPAY] KEY ID exists:", !!process.env.RAZORPAY_KEY_ID);
console.log("[RAZORPAY] KEY SECRET exists:", !!process.env.RAZORPAY_KEY_SECRET);
```

**Purpose:**
- Early detection of configuration issues
- Better debugging when Razorpay fails
- Prevents silent failures due to missing credentials

#### 3. **Amount Validation**

```typescript
if (amountInPaise < 100) {
  // Rollback and return error
  await supabase.from("orders").delete().eq("id", typedOrder.id);
  return NextResponse.json({...}, { status: 400 });
}
```

**Purpose:**
- Razorpay requires minimum 1 INR (100 paise)
- Prevents creating orders that can't be paid
- Fails fast before attempting Razorpay API call

#### 4. **Guaranteed Razorpay Order ID**

```typescript
// Response always includes razorpay_order_id
return NextResponse.json({
  success: true,
  razorpay_order_id: razorpayOrderId, // Always present
  next_step: "proceed_to_payment",    // Always proceed
});
```

**Key Points:**
- `razorpay_order_id` is guaranteed to exist in successful responses
- No more `undefined` or conditional inclusion
- Frontend can always proceed to payment popup

#### 5. **Database Update Failure Handling**

```typescript
const { error: razorpayUpdateError } = await supabase
  .from("orders")
  .update({ razorpay_order_id: razorpayOrderId })
  .eq("id", typedOrder.id);

if (razorpayUpdateError) {
  // Rollback if update fails
  await supabase.from("orders").delete().eq("id", typedOrder.id);
  return NextResponse.json({...}, { status: 500 });
}
```

**Purpose:**
- If Razorpay succeeds but DB update fails, rollback prevents orphaned Razorpay orders
- Ensures atomicity: either both succeed or both fail

## Why Rollback Prevents Broken Checkout

### Before (Broken Flow)

```
1. Stock validation passes ✓
2. Order created in DB ✓
3. Razorpay creation fails ✗
4. API returns success (with razorpay_order_id: undefined) ✗
5. Frontend tries to open payment popup ✗
6. Payment fails silently ✗
7. Order stuck in DB without payment gateway ✗
```

**Result**: Order exists but can't be paid. Stock may be reserved. Customer confused.

### After (Hardened Flow)

```
1. Stock validation passes ✓
2. Order created in DB ✓
3. Razorpay creation fails ✗
4. Order deleted from DB (rollback) ✓
5. API returns error (500) ✓
6. Frontend shows error message ✓
7. Customer can retry checkout ✓
```

**Result**: Clean failure. No partial state. Customer can retry.

## Why This Ensures Stock & Shipping Won't Break

### Stock Deduction Safety

**Phase 3B Flow:**
1. Order created with `razorpay_order_id` ✓
2. Customer pays via Razorpay popup
3. Webhook receives payment confirmation
4. Webhook deducts stock **only if** `razorpay_order_id` exists

**With Hardening:**
- If Razorpay fails, order is deleted → no `razorpay_order_id` → webhook never processes → stock never deducted
- If Razorpay succeeds, `razorpay_order_id` exists → webhook can process → stock deducted correctly

**Invariant Maintained**: Stock is only deducted for orders with valid `razorpay_order_id`.

### Shipping Safety

**Shipping Flow:**
1. Order must have `razorpay_order_id` to be eligible for shipping
2. Shipping is triggered after payment confirmation (webhook)
3. Webhook checks for `razorpay_order_id` before creating shipment

**With Hardening:**
- Failed Razorpay → no order in DB → no shipping attempted
- Successful Razorpay → `razorpay_order_id` exists → shipping can proceed

**Invariant Maintained**: Shipping only happens for orders with valid payment gateway orders.

## Why This Is Safe for Phase 3B

### No Breaking Changes

1. **Webhook Unchanged**: Webhook logic remains the same. It still checks for `razorpay_order_id` before processing.
2. **Stock Validator Unchanged**: Pre-order stock validation remains unchanged.
3. **Frontend Flow Unchanged**: Frontend still receives `razorpay_order_id` and opens popup. The only difference is it now always receives a valid ID (or an error).
4. **Schema Unchanged**: No database schema changes required.

### Improved Reliability

1. **Fail-Fast**: Errors are caught immediately, not silently ignored.
2. **Data Integrity**: No orphaned orders without payment gateway IDs.
3. **Better Debugging**: Enhanced logging helps identify Razorpay issues quickly.
4. **Customer Experience**: Clear error messages instead of silent failures.

### Phase 3B Compatibility

- **Stock Deduction**: Only happens in webhook, which requires `razorpay_order_id`. Hardening ensures this ID always exists for successful orders.
- **Shipping**: Only happens after payment confirmation. Hardening ensures payment can proceed.
- **Order Lifecycle**: Order creation → Payment → Webhook → Stock Deduction → Shipping. Hardening ensures each step has required data.

## Testing Checklist

### ✅ Success Case
- [ ] Place order with valid cart
- [ ] Console shows: `[RAZORPAY] Creating order with amount: X`
- [ ] Console shows: `[RAZORPAY] Order created: order_xxx`
- [ ] Response includes `razorpay_order_id: "order_xxx"`
- [ ] Payment popup opens successfully
- [ ] Order exists in DB with `razorpay_order_id` populated

### ✅ Failure Case (Razorpay API Error)
- [ ] Simulate Razorpay failure (invalid credentials, network error, etc.)
- [ ] Console shows: `[RAZORPAY ERROR] ...`
- [ ] Order is deleted from DB (rollback)
- [ ] API returns `{ success: false, error: "Payment gateway initialization failed" }`
- [ ] Status code is 500
- [ ] No orphaned order in database

### ✅ Failure Case (Amount Too Small)
- [ ] Place order with amount < 1 INR
- [ ] Console shows: `[RAZORPAY] Amount too small`
- [ ] Order is deleted from DB
- [ ] API returns 400 error
- [ ] No order created

### ✅ Failure Case (Invalid Response)
- [ ] Simulate Razorpay returning order without ID
- [ ] Console shows: `[RAZORPAY] Invalid response`
- [ ] Order is deleted from DB
- [ ] API returns 500 error

### ✅ Environment Variables
- [ ] Console shows: `[RAZORPAY] KEY ID exists: true`
- [ ] Console shows: `[RAZORPAY] KEY SECRET exists: true`
- [ ] Missing credentials cause immediate failure (not silent)

## Summary

**Before**: Silent failures → Partial state → Broken checkout → Customer confusion

**After**: Fail-fast → Rollback → Clean errors → Customer can retry

**Key Invariant**: Every order in the database must have a valid `razorpay_order_id`. If Razorpay fails, the order is deleted. This ensures stock deduction and shipping only proceed for orders that can actually be paid.
