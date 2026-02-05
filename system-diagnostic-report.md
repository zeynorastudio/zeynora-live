# System Diagnostic Report

**Generated:** 2026-02-01  
**Scope:** Order Confirmation Page, Email Service, Post-Payment Redirect Flow, Schema Mismatch

---

## PART A — CONFIRMATION PAGE ANALYSIS

### 1. Route Identification

**Route:** `/checkout/success`  
**File:** `app/(storefront)/checkout/success/page.tsx`  
**Type:** Server Component (async)

### 2. Middleware Protection

**Status:** ✅ **NOT PROTECTED**

**Evidence:**
- `middleware.ts` only protects `/admin/*` routes
- Config matcher: `matcher: ["/admin/:path*"]`
- `/checkout/success` is NOT in protected routes

**Conclusion:** Confirmation page is publicly accessible (by design for guest checkout support).

### 3. Authentication Dependency

**Status:** ✅ **NO AUTH DEPENDENCY**

**Evidence:**
```typescript
// Line 266: Uses service role client (bypasses RLS)
const supabase = createServiceRoleClient();

// Line 270-285: Fetches order by order_number (no user_id required)
const { data: order, error } = await supabase
  .from("orders")
  .select(`...`)
  .eq("order_number", orderNumber)
  .single();
```

**Conclusion:** Page correctly supports both guest and logged-in users.

### 4. Order Identification Method

**Method:** Query Parameter (`order`)

**Evidence:**
```typescript
// Line 254-257: Reads from searchParams
searchParams: Promise<{ order?: string }>;
const resolvedSearchParams = await searchParams;
const orderNumber = resolvedSearchParams.order;
```

**Flow:**
- URL format: `/checkout/success?order=ZYN-20260201-1234`
- If `order` is missing → redirects to `/` (line 260-262)

### 5. Redirect Flow Analysis

#### 5.1 After Razorpay Success Handler

**Location:** `components/checkout/GuestCheckoutForm.tsx` (lines 386-410)

**Current Behavior:**
```typescript
handler: async (response: RazorpayResponse) => {
  // Stores order info in localStorage
  localStorage.setItem("zeynora_pending_order", JSON.stringify({...}));
  
  // Calls onOrderCreated callback
  if (onOrderCreated) {
    onOrderCreated(result.order_id, result.order_number);
  }
}
```

**Issue:** ⚠️ **REDIRECT HAPPENS IMMEDIATELY AFTER POPUP OPENS**

The `onOrderCreated` callback is called **immediately** when Razorpay popup opens, NOT after payment is confirmed. This is a **timing issue**.

#### 5.2 CartDrawer Redirect Logic

**Location:** `components/cart/CartDrawer.tsx` (lines 282-288)

**Current Behavior:**
```typescript
const handleOrderCreated = useCallback((orderId: string, orderNumber: string) => {
  clearCart();
  handleClose();
  router.push(`/checkout/success?order=${orderNumber}`);
}, [clearCart, handleClose, router]);
```

**Flow:**
1. User clicks "Proceed to Payment"
2. Razorpay popup opens
3. `onOrderCreated` callback fires **immediately**
4. Cart cleared, drawer closed
5. Redirect to `/checkout/success?order=...` happens **BEFORE payment completes**

**Root Cause:** The redirect is triggered by the Razorpay popup opening, not by payment success.

#### 5.3 When Redirect Goes to Homepage

**Condition:** Missing `order` query parameter

**Evidence:**
```typescript
// Line 259-262: CheckoutSuccessPage
if (!orderNumber) {
  redirect("/");
}
```

**Scenarios:**
1. User navigates to `/checkout/success` without query param
2. Query param is lost during navigation
3. Order number is not passed correctly from CartDrawer

### 5.4 Redirect Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS "PROCEED TO PAYMENT"                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ GuestCheckoutForm.handleSubmit()                            │
│ - Calls /api/checkout/create-order                         │
│ - Receives order_id, order_number, razorpay_order_id       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Razorpay popup opens                                        │
│ razorpay.open()                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ handler() callback fires IMMEDIATELY                      │
│ ⚠️ THIS IS THE PROBLEM                                     │
│ - Stores in localStorage                                    │
│ - Calls onOrderCreated(result.order_id, order_number)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ CartDrawer.handleOrderCreated()                            │
│ - clearCart()                                               │
│ - handleClose()                                             │
│ - router.push(/checkout/success?order=...)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ User redirected to /checkout/success                        │
│ ⚠️ PAYMENT NOT YET CONFIRMED                                │
│ ⚠️ payment_status = "pending"                              │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ User completes payment in Razorpay popup                    │
│ (popup may still be open or closed)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Razorpay webhook fires (async)                             │
│ - Updates payment_status = "paid"                          │
│ - Sends confirmation email                                  │
└─────────────────────────────────────────────────────────────┘
```

**Problem:** User sees confirmation page with `payment_status = "pending"` before payment is actually confirmed.

---

## PART B — BACKEND EMAIL FAILURE ANALYSIS

### 1. Orders Table Schema Inspection

**Source:** `types/supabase.ts` (lines 491-531)

**Actual Columns:**
```typescript
orders: {
  Row: {
    id: string
    order_number: string
    subtotal: number | null
    shipping_fee: number | null          // ✅ EXISTS
    internal_shipping_cost: number | null
    total_amount: number | null          // ✅ EXISTS
    // ... other fields
  }
}
```

**Key Finding:**
- ✅ `shipping_fee` exists (line 506)
- ✅ `total_amount` exists (line 511)
- ❌ `shipping_cost` does NOT exist
- ❌ `total` does NOT exist

### 2. Email Service Query Analysis

**Location:** `lib/email/service.ts` (lines 390-404)

**Current Query:**
```typescript
const { data: orderData, error: orderError } = await supabase
  .from("orders")
  .select(`
    id,
    order_number,
    user_id,
    subtotal,
    shipping_cost,        // ❌ COLUMN DOES NOT EXIST
    total,                 // ❌ COLUMN DOES NOT EXIST
    payment_status,
    metadata,
    shipping_address_id
  `)
  .eq("id", orderId)
  .single();
```

**Root Cause:** ⚠️ **SCHEMA MISMATCH**

The query selects `shipping_cost` and `total`, but the actual columns are:
- `shipping_fee` (not `shipping_cost`)
- `total_amount` (not `total`)

### 3. Error Location

**Exact Error:** `column orders.shipping_cost does not exist`

**Triggered At:**
- Line 397: `shipping_cost,` in SELECT statement
- Line 420: TypeScript type expects `shipping_cost: number | null`
- Line 506: Usage: `shippingCost: typedOrder.shipping_cost || 0`

**Impact:** Email service fails completely when called from webhook.

### 4. Order Creation Verification

**Location:** `app/api/checkout/create-order/route.ts` (lines 484-515)

**Columns Set During Creation:**
```typescript
.insert({
  subtotal: subtotal,                    // ✅ Correct
  shipping_fee: 0,                       // ✅ Correct (not shipping_cost)
  total_amount: totalPayable,            // ✅ Correct (not total)
  // ...
})
```

**Conclusion:** Order creation uses correct column names. Email service uses incorrect column names.

---

## PART C — ORDER CREATION STRUCTURE

### 1. Order Row Contents

**Verified Columns:**
- ✅ `subtotal` (numeric)
- ✅ `shipping_fee` (numeric, default 0)
- ✅ `internal_shipping_cost` (numeric)
- ✅ `total_amount` (numeric)
- ✅ `razorpay_order_id` (text, set during creation)
- ✅ `metadata.shipping` (jsonb, contains shipping metadata)

**Evidence from create-order route:**
```typescript
// Line 495-501
subtotal: subtotal,
shipping_fee: 0,
internal_shipping_cost: internalShippingCost,
total_amount: totalPayable,
razorpay_order_id: razorpayOrderId,  // Set in initial insert
```

### 2. Razorpay Order ID Storage

**Status:** ✅ **GUARANTEED**

**Evidence:**
- Line 486: `razorpay_order_id: razorpayOrderId` set in initial INSERT
- Architectural invariant: No order exists without `razorpay_order_id`
- Created BEFORE database order (architectural reset)

### 3. Webhook Trigger Confirmation

**Location:** `app/api/payments/webhook/route.ts` (lines 730-758)

**Email Trigger:**
```typescript
// STEP 7: SEND ORDER CONFIRMATION EMAIL
try {
  const { sendOrderConfirmationEmail } = await import("@/lib/email/service");
  const emailSent = await sendOrderConfirmationEmail(order.id);
  // ...
} catch (emailError) {
  // Don't fail payment if email fails
  console.error("[PAYMENT_CAPTURED] Failed to send order confirmation email:", {...});
}
```

**Status:** ✅ Webhook calls email service after payment captured  
**Issue:** ⚠️ Email service fails due to schema mismatch

---

## PART D — ARCHITECTURAL INCONSISTENCIES

### 1. Redirect Timing Issue

**Severity:** 🔴 **HIGH**

**Problem:**
- User redirected to confirmation page BEFORE payment completes
- Confirmation page shows `payment_status = "pending"`
- User may see "Order Received" instead of "Order Confirmed"

**Root Cause:**
- `onOrderCreated` callback fires when Razorpay popup opens
- Should fire AFTER payment success (webhook or frontend verification)

**Impact:**
- Poor UX (user sees pending status)
- Potential confusion about payment status
- May cause users to retry payment unnecessarily

### 2. Email Service Schema Mismatch

**Severity:** 🔴 **CRITICAL**

**Problem:**
- Email service queries non-existent columns
- All confirmation emails fail silently
- No error notification to users

**Root Cause:**
- Column names changed from `shipping_cost` → `shipping_fee`
- Column names changed from `total` → `total_amount`
- Email service not updated to match schema

**Impact:**
- Zero confirmation emails sent
- Users don't receive order confirmation
- No email trail for order tracking

### 3. Guest Order Email Support

**Severity:** 🟡 **MEDIUM**

**Problem:**
- Email service requires `user_id` (line 428-434)
- Guest orders have `user_id = null`
- Email service fails for guest orders

**Evidence:**
```typescript
// Line 428-434
if (!typedOrder.user_id) {
  console.error("[EMAIL_FAILED]", {
    error: "Order has no user_id",
  });
  return false;
}
```

**Impact:**
- Guest orders never receive confirmation emails
- Only logged-in users would receive emails (if schema was fixed)

### 4. Missing Email Tracking Columns

**Severity:** 🟡 **MEDIUM**

**Problem:**
- Email service doesn't track `confirmation_email_sent_at`
- No idempotency check
- No retry mechanism

**Expected (from order-confirmation.md):**
- `confirmation_email_sent_at` column
- `confirmation_email_attempts` column
- `confirmation_email_last_error` column

**Current:** These columns are not used in `lib/email/service.ts`

---

## PART E — FLOW DIAGRAMS

### Current Post-Payment Flow (BROKEN)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Proceed to Payment"                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. /api/checkout/create-order                               │
│    - Stock validated                                         │
│    - Razorpay order created                                 │
│    - DB order created with razorpay_order_id               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Razorpay popup opens                                    │
│    - handler() fires IMMEDIATELY                            │
│    - onOrderCreated() called                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CartDrawer.handleOrderCreated()                         │
│    - clearCart()                                             │
│    - router.push(/checkout/success?order=...)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. User sees /checkout/success                             │
│    ⚠️ payment_status = "pending"                            │
│    ⚠️ Shows "Order Received" (not "Order Confirmed")        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. User completes payment in Razorpay popup                  │
│    (popup may still be open)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Razorpay webhook fires                                   │
│    - Updates payment_status = "paid"                        │
│    - Calls sendOrderConfirmationEmail()                      │
│      ⚠️ FAILS: column orders.shipping_cost does not exist  │
└──────────────────────────────────────────────────────────────┘
```

### Expected Post-Payment Flow (CORRECT)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Proceed to Payment"                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. /api/checkout/create-order                               │
│    - Stock validated                                         │
│    - Razorpay order created                                 │
│    - DB order created with razorpay_order_id               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Razorpay popup opens                                    │
│    - User completes payment                                 │
│    - handler() fires AFTER payment success                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Frontend verifies payment OR waits for webhook          │
│    - onOrderCreated() called AFTER payment confirmed        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. CartDrawer.handleOrderCreated()                         │
│    - clearCart()                                             │
│    - router.push(/checkout/success?order=...)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. User sees /checkout/success                             │
│    ✅ payment_status = "paid"                               │
│    ✅ Shows "Order Confirmed"                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Razorpay webhook fires (async)                          │
│    - Updates payment_status = "paid" (idempotent)          │
│    - Calls sendOrderConfirmationEmail()                     │
│      ✅ Uses shipping_fee and total_amount                  │
│      ✅ Email sent successfully                             │
└──────────────────────────────────────────────────────────────┘
```

---

## PART F — ROOT CAUSE SUMMARY

### Issue 1: Redirect Timing

**Root Cause:** `onOrderCreated` callback fires when Razorpay popup opens, not after payment success.

**Symptoms:**
- User redirected before payment completes
- Confirmation page shows pending status
- Poor UX

**Risk Level:** 🔴 HIGH

### Issue 2: Email Schema Mismatch

**Root Cause:** Email service queries `shipping_cost` and `total` columns that don't exist. Actual columns are `shipping_fee` and `total_amount`.

**Symptoms:**
- All confirmation emails fail
- Error: "column orders.shipping_cost does not exist"
- No email notifications sent

**Risk Level:** 🔴 CRITICAL

### Issue 3: Guest Order Email Support

**Root Cause:** Email service requires `user_id`, but guest orders have `user_id = null`.

**Symptoms:**
- Guest orders never receive emails
- Only logged-in users would receive emails (if schema fixed)

**Risk Level:** 🟡 MEDIUM

### Issue 4: Missing Email Tracking

**Root Cause:** Email service doesn't use idempotency columns or retry logic.

**Symptoms:**
- No tracking of email send status
- Potential duplicate emails if retried
- No error persistence

**Risk Level:** 🟡 MEDIUM

---

## PART G — SCHEMA SNAPSHOT

### Orders Table Columns (Actual)

| Column | Type | Purpose | Used By |
|--------|------|---------|---------|
| `id` | uuid | Primary key | ✅ All |
| `order_number` | text | Unique order identifier | ✅ All |
| `subtotal` | numeric(12,2) | Sum of items | ✅ All |
| `shipping_fee` | numeric(12,2) | Customer shipping cost | ✅ Confirmation page |
| `internal_shipping_cost` | numeric(12,2) | Carrier cost | ✅ Internal |
| `total_amount` | numeric(12,2) | Final total | ✅ Confirmation page |
| `razorpay_order_id` | text | Razorpay order ID | ✅ Webhook |
| `payment_status` | enum | Payment state | ✅ All |
| `metadata` | jsonb | Order snapshots | ✅ All |

### Email Service Query (Current - BROKEN)

```sql
SELECT 
  id,
  order_number,
  user_id,
  subtotal,
  shipping_cost,    -- ❌ DOES NOT EXIST
  total,            -- ❌ DOES NOT EXIST
  payment_status,
  metadata,
  shipping_address_id
FROM orders
WHERE id = ?
```

### Email Service Query (Expected - CORRECT)

```sql
SELECT 
  id,
  order_number,
  customer_id,      -- ✅ For guest support
  guest_email,      -- ✅ For guest support
  subtotal,
  shipping_fee,     -- ✅ CORRECT COLUMN
  total_amount,     -- ✅ CORRECT COLUMN
  payment_status,
  metadata,
  shipping_name,   -- ✅ Direct fields
  shipping_address1,
  shipping_city,
  shipping_state,
  shipping_pincode,
  shipping_country
FROM orders
WHERE id = ?
```

---

## PART H — RISK ASSESSMENT

### Critical Issues (Must Fix)

1. **Email Service Schema Mismatch**
   - Impact: Zero emails sent
   - Users: All users affected
   - Business: No order confirmations

2. **Redirect Timing**
   - Impact: Poor UX, confusion
   - Users: All users affected
   - Business: Reduced trust

### Medium Issues (Should Fix)

3. **Guest Order Email Support**
   - Impact: Guest users don't receive emails
   - Users: Guest checkout users
   - Business: Reduced customer satisfaction

4. **Missing Email Tracking**
   - Impact: No retry mechanism, no audit trail
   - Users: All users (indirect)
   - Business: Operational visibility

---

## PART I — ARCHITECTURAL NOTES

### Confirmation Page Design

**Strengths:**
- ✅ No auth dependency (supports guests)
- ✅ Uses service role client (bypasses RLS)
- ✅ Uses metadata snapshots (immutable)
- ✅ Graceful error handling

**Weaknesses:**
- ⚠️ Redirect happens before payment confirmation
- ⚠️ Shows pending status initially

### Email Service Design

**Strengths:**
- ✅ Non-blocking (doesn't fail payment)
- ✅ Error logging

**Weaknesses:**
- ❌ Schema mismatch (critical)
- ❌ No guest support
- ❌ No idempotency
- ❌ No retry logic

### Webhook Design

**Strengths:**
- ✅ Idempotency via unique constraint
- ✅ Non-blocking email sending
- ✅ Proper error handling

**Weaknesses:**
- ⚠️ Email service fails silently
- ⚠️ No retry mechanism for failed emails

---

## END OF REPORT

**Next Steps:**
1. Fix email service schema mismatch
2. Fix redirect timing (wait for payment confirmation)
3. Add guest order email support
4. Add email tracking columns and retry logic
