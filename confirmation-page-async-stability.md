# Confirmation Page Async Stability

**Date:** 2026-02-01  
**Scope:** Stabilize confirmation page against asynchronous webhook timing

---

## Overview

This document explains the architectural changes made to stabilize the order confirmation page against asynchronous webhook timing, ensuring users never see unexpected redirects and the page automatically updates when payment status changes.

---

## PART 1 — PROBLEM ANALYSIS

### Why Webhook Timing Causes Perceived Redirect Issues

**The Race Condition:**

1. User completes payment in Razorpay popup
2. Razorpay confirms payment on frontend → handler fires
3. User redirected to `/checkout/success?order=...`
4. Confirmation page loads and fetches order
5. **Webhook hasn't fired yet** → `payment_status = "pending"`
6. Page shows "Order Received" with pending status
7. Webhook fires asynchronously (seconds later)
8. `payment_status` updates to `"paid"`
9. **But user already saw pending state**

**Original Issue:**
- Confirmation page was a server component
- Fetched order once on initial load
- If webhook hadn't fired, showed pending state
- No mechanism to update when webhook completes
- User might refresh page to see updated status

**Perceived Redirect Problem:**
- If order not found → redirect to homepage
- If payment_status check failed → potential redirect
- User loses context if redirected

---

## PART 2 — WHY CONFIRMATION MUST SUPPORT PENDING STATE

### Architectural Reality

**Payment Flow Timeline:**

```
T=0s:   User completes payment in Razorpay
T=0s:   Razorpay handler fires → redirect to confirmation page
T=1s:   Confirmation page loads → fetches order
T=1s:   payment_status = "pending" (webhook hasn't fired yet)
T=2-5s: Razorpay webhook fires → updates payment_status = "paid"
T=5s:   Confirmation page should show updated status
```

**Key Insight:**
- Webhook is **asynchronous** and **eventual**
- There's a **time window** where payment is confirmed but webhook hasn't processed
- Confirmation page **must** handle this gracefully
- User should see **immediate feedback** (order received)
- Page should **auto-update** when webhook completes

### Why Redirecting on Pending is Wrong

**Problems with redirecting:**
1. **User loses context** - They just completed payment
2. **No order visibility** - Can't see order details
3. **Poor UX** - Feels like payment failed
4. **Breaks guest flow** - Guest users can't track order

**Correct Behavior:**
- Show order immediately (even if pending)
- Display "Payment Processing" state
- Auto-update when webhook completes
- Never redirect based on payment_status

---

## PART 3 — WHY POLLING SOLVES ASYNC RACE

### The Solution: Lightweight Polling

**Implementation:**
```typescript
// Poll every 3 seconds if payment is pending
useEffect(() => {
  if (!order || order.payment_status === "paid") {
    return; // Stop polling if paid
  }

  const intervalId = setInterval(() => {
    fetchOrder(); // Refetch order status
  }, 3000);

  return () => clearInterval(intervalId);
}, [order?.payment_status]);
```

### Why This Works

**1. Non-Blocking:**
- Page renders immediately with current order state
- Polling happens in background
- User sees order details right away

**2. Efficient:**
- Only polls when `payment_status === "pending"`
- Stops automatically when status becomes `"paid"`
- 3-second interval is reasonable (not too aggressive)

**3. Resilient:**
- Handles webhook delays gracefully
- Works even if webhook is slow (network issues)
- User eventually sees correct status

**4. User-Friendly:**
- Shows "Payment Processing" state
- Auto-updates to "Order Confirmed"
- No manual refresh needed

### Why Not Server-Side Rendering?

**Server Component Limitations:**
- Fetches order once on initial load
- No mechanism to update after webhook fires
- Would require page refresh to see updated status

**Client Component Benefits:**
- Can poll for updates
- Can update UI reactively
- Better user experience

---

## PART 4 — ARCHITECTURAL CORRECTNESS

### Why This Is Architecturally Sound

**1. Separation of Concerns:**
- Confirmation page: Display order state
- Webhook: Update payment status
- Polling: Bridge the async gap

**2. No Breaking Changes:**
- Webhook logic unchanged
- Order creation unchanged
- Payment flow unchanged
- Only confirmation page modified

**3. Guest Support:**
- Uses public API route (`/api/orders/by-number`)
- Service role client bypasses RLS
- Works for both guest and logged-in orders

**4. Data Integrity:**
- Uses metadata snapshots (immutable)
- No price recalculation
- Race-condition immune

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User completes payment → Redirected to confirmation page   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Confirmation page loads (client component)                  │
│ - Fetches order via /api/orders/by-number                   │
│ - Shows order details immediately                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ payment_status = "pending" (webhook not fired yet)         │
│ - Shows "Payment Processing" state                          │
│ - Displays order details                                    │
│ - Starts polling (every 3 seconds)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Polling: Refetch order status every 3 seconds              │
│ - Checks payment_status                                     │
│ - Updates UI if status changed                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Webhook fires (async, 2-5 seconds later)                    │
│ - Updates payment_status = "paid"                           │
│ - Sends confirmation email                                  │
│ - Decrements stock                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Next poll cycle detects payment_status = "paid"              │
│ - Updates UI to "Order Confirmed"                           │
│ - Stops polling (status is paid)                            │
│ - User sees final confirmed state                           │
└─────────────────────────────────────────────────────────────┘
```

---

## PART 5 — IMPLEMENTATION DETAILS

### Changes Made

**1. Converted to Client Component:**
- Changed from server component to `"use client"`
- Enables React hooks (useState, useEffect)
- Allows polling and reactive updates

**2. Removed Redirect Logic:**
```typescript
// BEFORE: Redirected if no order number
if (!orderNumber) {
  redirect("/");
}

// AFTER: Shows OrderNotFound component
if (error || !order) {
  return <OrderNotFound />;
}
```

**3. Added Polling:**
```typescript
// Poll every 3 seconds if payment is pending
useEffect(() => {
  if (!order || order.payment_status === "paid") {
    return; // Stop polling if paid
  }

  const intervalId = setInterval(() => {
    fetchOrder();
  }, 3000);

  return () => clearInterval(intervalId);
}, [order?.payment_status]);
```

**4. Updated UI States:**
```typescript
// Shows appropriate state based on payment_status
{isPaid ? "Order Confirmed" : "Payment Processing"}

// Status message
{isPending
  ? "We're confirming your payment. This may take a few seconds."
  : "Thank you! Your order has been confirmed..."}
```

**5. Created Public API Route:**
- `/api/orders/by-number` - Fetches order by order_number
- Uses service role client (bypasses RLS)
- Works for guest and logged-in orders

### Files Modified

1. **app/(storefront)/checkout/success/page.tsx**
   - Converted to client component
   - Added polling logic
   - Removed redirect logic
   - Updated UI states

2. **app/api/orders/by-number/route.ts** (NEW)
   - Public API route for fetching orders
   - Uses service role client
   - Supports guest orders

### Files NOT Modified (Preserved)

- ✅ `app/api/payments/webhook/route.ts` - Webhook unchanged
- ✅ `app/api/checkout/create-order/route.ts` - Order creation unchanged
- ✅ Stock decrement logic - Unchanged
- ✅ Shiprocket integration - Unchanged

---

## PART 6 — TEST SCENARIOS

### Scenario 1: Fast Webhook (< 1 second)

1. ✅ User completes payment
2. ✅ Redirected to confirmation page
3. ✅ Page loads, shows "Payment Processing"
4. ✅ Webhook fires quickly
5. ✅ Next poll cycle detects `payment_status = "paid"`
6. ✅ UI updates to "Order Confirmed"
7. ✅ Polling stops

### Scenario 2: Slow Webhook (3-5 seconds)

1. ✅ User completes payment
2. ✅ Redirected to confirmation page
3. ✅ Page loads, shows "Payment Processing"
4. ✅ Polling continues (every 3 seconds)
5. ✅ Webhook fires after 4 seconds
6. ✅ Next poll cycle detects `payment_status = "paid"`
7. ✅ UI updates to "Order Confirmed"
8. ✅ Polling stops

### Scenario 3: Guest Order

1. ✅ Guest completes payment
2. ✅ Redirected to confirmation page
3. ✅ Page fetches order via public API route
4. ✅ Shows order details (no auth required)
5. ✅ Polling works for guest orders
6. ✅ Updates when webhook fires

### Scenario 4: Direct URL Access

1. ✅ User navigates to `/checkout/success?order=ZYN-...`
2. ✅ Page loads order details
3. ✅ If `payment_status = "paid"` → Shows confirmed state
4. ✅ If `payment_status = "pending"` → Shows processing state, polls
5. ✅ No redirect to homepage

---

## PART 7 — ARCHITECTURAL BENEFITS

### Why This Is Correct

**1. Handles Async Reality:**
- Acknowledges webhook is asynchronous
- Provides immediate feedback
- Auto-updates when webhook completes

**2. Never Loses Context:**
- Order always visible
- No unexpected redirects
- User can track order status

**3. Works for All Users:**
- Guest orders supported
- Logged-in orders supported
- Direct URL access supported

**4. Efficient:**
- Polls only when needed (pending status)
- Stops automatically when paid
- 3-second interval is reasonable

**5. Resilient:**
- Handles webhook delays
- Works even if webhook is slow
- Graceful degradation

---

## SUMMARY

### Problem Solved

**Before:**
- Confirmation page showed pending state
- No mechanism to update when webhook fires
- Potential redirects lost user context

**After:**
- Confirmation page shows order immediately
- Polling auto-updates when webhook completes
- Never redirects (shows appropriate state)

### Key Architectural Decisions

1. **Client Component** - Enables polling and reactive updates
2. **Polling** - Bridges async webhook gap
3. **No Redirects** - Always shows order state
4. **Public API Route** - Supports guest orders

### Stability Guarantees

- ✅ Never redirects to homepage
- ✅ Works when payment_status is "pending"
- ✅ Auto-updates when webhook sets status to "paid"
- ✅ No auth dependency
- ✅ Guest flow supported
- ✅ Webhook, stock, shipping logic preserved

---

## END OF DOCUMENT
