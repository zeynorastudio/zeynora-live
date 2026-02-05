# Order Confirmation Email System Diagnostic Report

**Date:** 2026-02-04  
**Purpose:** Audit order confirmation email trigger pipeline to determine why emails are not being sent after payment capture

---

## EXECUTIVE SUMMARY

The email system has **multiple potential failure points** that could prevent confirmation emails from being sent. The most critical issue is that **`getOrdersSender()` throws an error** if `RESEND_ORDERS_FROM_EMAIL` is not configured, which would cause the email function to fail silently (caught by try-catch blocks).

---

## 1. EMAIL TRIGGER LOCATIONS

### 1.1 Payment Webhook (`app/api/payments/webhook/route.ts`)

**Location:** Lines 730-758  
**Trigger Event:** `payment.captured` or `payment.authorized`  
**Execution Order:** STEP 7 (after stock decrement and shipping cost calculation)

```typescript
// STEP 7: SEND ORDER CONFIRMATION EMAIL
try {
  const { sendOrderConfirmationEmail } = await import("@/lib/email/service");
  const emailSent = await sendOrderConfirmationEmail(order.id);
  if (!emailSent) {
    console.warn("[PAYMENT_CAPTURED] Order confirmation email not sent:", {
      order_id: order.id,
      order_number: order.order_number,
    });
  }
} catch (emailError) {
  // Don't fail payment if email fails
  console.error("[PAYMENT_CAPTURED] Failed to send order confirmation email:", {
    order_id: order.id,
    order_number: order.order_number,
    error: emailError instanceof Error ? emailError.message : "Unknown error",
  });
}
```

**Key Points:**
- ✅ Non-blocking (wrapped in try-catch)
- ✅ Only logs warning if `emailSent === false`
- ✅ Logs error if exception thrown
- ⚠️ **Silent failure** - payment webhook succeeds even if email fails

### 1.2 Payment Verify Route (`app/api/payments/verify/route.ts`)

**Location:** Lines 364-381  
**Trigger Event:** Manual payment verification via `/api/payments/verify`

```typescript
// Send order confirmation email (non-blocking)
try {
  const { sendOrderConfirmationEmail } = await import("@/lib/email/service");
  const emailSent = await sendOrderConfirmationEmail(order.id);
  if (!emailSent) {
    console.warn("[PAYMENT_VERIFY] Order confirmation email not sent:", {
      order_id: order.id,
      order_number: order.order_number,
    });
  }
} catch (emailError) {
  // Don't fail the payment if email fails
  console.error("[PAYMENT_VERIFY] Failed to send order confirmation email:", {
    order_id: order.id,
    order_number: order.order_number,
    error: emailError instanceof Error ? emailError.message : "Unknown error",
  });
}
```

**Key Points:**
- ✅ Non-blocking (wrapped in try-catch)
- ✅ Same error handling pattern as webhook
- ⚠️ **Silent failure** - verification succeeds even if email fails

### 1.3 Credits-Only Orders (`app/api/payments/verify/route.ts`)

**Location:** Lines 131-146  
**Trigger Event:** Credits-only payment completion

```typescript
// Send order confirmation email for credits-only orders (non-blocking)
try {
  const { sendOrderConfirmationEmail } = await import("@/lib/email/service");
  const emailSent = await sendOrderConfirmationEmail(typedOrder.id);
  if (!emailSent) {
    console.warn("[PAYMENT_VERIFY] Order confirmation email not sent (credits-only):", {
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
    });
  }
} catch (emailError) {
  console.error("[PAYMENT_VERIFY] Failed to send confirmation email (credits-only):", {
    order_id: typedOrder.id,
    error: emailError instanceof Error ? emailError.message : "Unknown error",
  });
}
```

---

## 2. EMAIL FUNCTION IMPLEMENTATION

### 2.1 Function Signature (`lib/email/service.ts`)

**Location:** Lines 380-613  
**Function:** `sendOrderConfirmationEmail(orderId: string): Promise<boolean>`

**Return Value:**
- `true` - Email sent successfully
- `false` - Email failed (various reasons)
- Exception thrown - Caught by caller's try-catch

### 2.2 Early Exit Conditions

#### Condition 1: Missing RESEND_API_KEY
**Location:** Lines 381-384

```typescript
if (!RESEND_API_KEY) {
  console.warn("[ORDER_CONFIRMATION_EMAIL_SENT] RESEND_API_KEY not set - skipping email");
  return false;
}
```

**Impact:** ✅ Function returns `false` immediately  
**Logging:** Warning logged with tag `[ORDER_CONFIRMATION_EMAIL_SENT]`  
**Result:** Webhook/verify route logs warning, payment succeeds

#### Condition 2: Order Not Found
**Location:** Lines 416-423

```typescript
if (orderError || !orderData) {
  console.error("[EMAIL_FAILED]", {
    type: "ORDER_CONFIRMATION_EMAIL_SENT",
    order_id: orderId,
    error: orderError?.message || "Order not found",
  });
  return false;
}
```

**Impact:** ✅ Function returns `false` immediately  
**Logging:** Error logged with tag `[EMAIL_FAILED]`  
**Result:** Webhook/verify route logs warning, payment succeeds

#### Condition 3: No Email Address Found
**Location:** Lines 480-492

```typescript
if (!recipientEmail) {
  console.error("[EMAIL_FAILED]", {
    type: "ORDER_CONFIRMATION_EMAIL_SENT",
    order_id: orderId,
    order_number: typedOrder.order_number,
    error: "No email address found for order (guest or logged-in)",
    has_user_id: !!typedOrder.user_id,
    has_guest_email: !!typedOrder.guest_email,
    has_metadata_email: !!metadata?.customer_snapshot?.email,
  });
  return false;
}
```

**Impact:** ✅ Function returns `false` immediately  
**Logging:** Error logged with diagnostic info  
**Result:** Webhook/verify route logs warning, payment succeeds

**Email Resolution Priority:**
1. `metadata.customer_snapshot.email` (highest priority)
2. `guest_email` column
3. `users.email` (via `user_id` lookup)

#### Condition 4: Missing RESEND_ORDERS_FROM_EMAIL (CRITICAL)
**Location:** Lines 53-58, called at line 559

```typescript
function getOrdersSender(): string {
  if (!RESEND_ORDERS_FROM_EMAIL) {
    throw new Error("RESEND_ORDERS_FROM_EMAIL is required but not configured");
  }
  return `${RESEND_ORDERS_FROM_NAME} <${RESEND_ORDERS_FROM_EMAIL}>`;
}
```

**Impact:** ⚠️ **THROWS EXCEPTION** - caught by caller's try-catch  
**Logging:** Exception logged as `[PAYMENT_CAPTURED] Failed to send order confirmation email`  
**Result:** Webhook/verify route logs error, payment succeeds  
**CRITICAL:** This is the most likely failure point if env var is missing

### 2.3 Resend API Call

**Location:** Lines 558-576

```typescript
const client = getResendClient();
const fromSender = getOrdersSender(); // ⚠️ Can throw if RESEND_ORDERS_FROM_EMAIL missing
const result = await client.emails.send({
  from: fromSender,
  to: [recipientEmail],
  subject,
  html,
  text,
});

if (result.error) {
  console.error("[EMAIL_FAILED]", {
    type: "ORDER_CONFIRMATION_EMAIL_SENT",
    order_id: orderId,
    order_number: typedOrder.order_number,
    error: result.error.message || "Unknown error",
  });
  return false;
}
```

**Impact:** 
- If `result.error` exists, function returns `false`
- Resend API errors are logged but don't throw exceptions

---

## 3. CONDITIONS CHECKED

### 3.1 Payment Status Requirement

**Finding:** ❌ **NO EXPLICIT CHECK**

The email function does **NOT** check if `payment_status === "paid"` before sending. It:
- Fetches `payment_status` from order (line 403)
- Uses it in email template (line 555)
- But **does not validate** it before sending

**Current Behavior:**
- Email can be sent for orders with `payment_status = "pending"` or `"failed"`
- Email template displays payment status, but function doesn't gate on it

**Code Evidence:**
```typescript
// Line 555 - payment_status used in template but not validated
paymentStatus: typedOrder.payment_status || "pending",
```

### 3.2 User ID Requirement

**Finding:** ✅ **NOT REQUIRED** - Guest orders supported

The email function supports both logged-in and guest orders:
- Priority 1: `metadata.customer_snapshot.email`
- Priority 2: `guest_email` column
- Priority 3: `users.email` (only if `user_id` exists)

**Code Evidence:**
```typescript
// Lines 445-478 - Email resolution logic
if (metadata?.customer_snapshot?.email) {
  recipientEmail = metadata.customer_snapshot.email;
} else if (typedOrder.guest_email) {
  recipientEmail = typedOrder.guest_email;
} else if (typedOrder.user_id) {
  // Lookup user email
}
```

### 3.3 Shipping Cost Requirement

**Finding:** ✅ **NOT REQUIRED** - Can be 0

The email function does **NOT** require `shipping_cost` or `shipping_fee`:
- Uses `shipping_fee` from order (line 552)
- Defaults to `0` if null (line 552: `typedOrder.shipping_fee || 0`)
- Email template handles `shippingCost = 0` by displaying "FREE" (line 260)

**Code Evidence:**
```typescript
// Line 552 - shipping_fee can be 0
shippingCost: typedOrder.shipping_fee || 0,
```

---

## 4. CALL CHAIN TRACE

### 4.1 Payment Captured Flow

```
1. Razorpay webhook → payment.captured event
   ↓
2. app/api/payments/webhook/route.ts:POST()
   - Verify signature (line 407)
   - Check idempotency (line 468)
   - Find order (line 508)
   - Update order status to "paid" (line 609-621)
   ↓
3. STEP 7: Send email (line 730-758)
   ↓
4. lib/email/service.ts:sendOrderConfirmationEmail()
   - Check RESEND_API_KEY (line 381) → return false if missing
   - Fetch order (line 392) → return false if not found
   - Resolve email address (line 445-492) → return false if not found
   - Call getOrdersSender() (line 559) → THROWS if RESEND_ORDERS_FROM_EMAIL missing
   - Call Resend API (line 560) → return false if error
   ↓
5. Return boolean to webhook
   ↓
6. Webhook logs warning/error but continues
```

### 4.2 Email Address Resolution Flow

```
sendOrderConfirmationEmail(orderId)
  ↓
Fetch order with: user_id, customer_id, guest_email, metadata
  ↓
Check metadata.customer_snapshot.email
  ├─ YES → Use it (Priority 1)
  └─ NO → Check guest_email column
      ├─ YES → Use it (Priority 2)
      └─ NO → Check user_id
          ├─ YES → Lookup users.email (Priority 3)
          └─ NO → Return false (no email found)
```

---

## 5. ENVIRONMENT VARIABLES REQUIRED

### 5.1 Required Variables

| Variable | Location | Purpose | Failure Impact |
|----------|----------|---------|----------------|
| `RESEND_API_KEY` | Line 13 | Initialize Resend client | Function returns `false` immediately |
| `RESEND_ORDERS_FROM_EMAIL` | Line 22 | Sender email address | **THROWS EXCEPTION** (caught by caller) |
| `RESEND_ORDERS_FROM_NAME` | Line 23 | Sender display name | Defaults to "Zeynora Orders" if missing |

### 5.2 Environment Check

**From `env.example`:**
```bash
RESEND_API_KEY=re_your_resend_api_key
RESEND_ORDERS_FROM_EMAIL=orders@zeynora.in
```

**Critical:** If `RESEND_ORDERS_FROM_EMAIL` is not set in production, `getOrdersSender()` will throw an error, causing the email function to fail.

---

## 6. ERROR HANDLING ANALYSIS

### 6.1 Errors That Return `false`

1. **Missing RESEND_API_KEY** (line 381-384)
   - Logs: `[ORDER_CONFIRMATION_EMAIL_SENT] RESEND_API_KEY not set`
   - Returns: `false`

2. **Order not found** (line 416-423)
   - Logs: `[EMAIL_FAILED]` with error details
   - Returns: `false`

3. **No email address found** (line 480-492)
   - Logs: `[EMAIL_FAILED]` with diagnostic info
   - Returns: `false`

4. **Resend API error** (line 568-576)
   - Logs: `[EMAIL_FAILED]` with error message
   - Returns: `false`

### 6.2 Errors That Throw Exceptions

1. **Missing RESEND_ORDERS_FROM_EMAIL** (line 54-55)
   - Throws: `Error("RESEND_ORDERS_FROM_EMAIL is required but not configured")`
   - Caught by: Webhook/verify route try-catch
   - Logs: `[PAYMENT_CAPTURED] Failed to send order confirmation email`

2. **Resend client initialization failure** (line 28-35)
   - Throws: `Error("RESEND_API_KEY is not configured")`
   - Caught by: Webhook/verify route try-catch
   - Logs: `[PAYMENT_CAPTURED] Failed to send order confirmation email`

### 6.3 Error Swallowing

**Finding:** ⚠️ **YES - Errors are swallowed**

All email failures are caught and logged, but:
- Payment webhook **succeeds** even if email fails
- Payment verification **succeeds** even if email fails
- No retry mechanism
- No alerting mechanism
- No database tracking of email failures

**Code Evidence:**
```typescript
// Webhook handler (line 745-758)
catch (emailError) {
  // Don't fail payment if email fails
  console.error("[PAYMENT_CAPTURED] Failed to send order confirmation email:", {
    error: emailError instanceof Error ? emailError.message : "Unknown error",
  });
}
```

---

## 7. GUEST EMAIL DETECTION

### 7.1 Guest Order Support

**Finding:** ✅ **FULLY SUPPORTED**

The email function explicitly supports guest orders:
- Checks `guest_email` column (line 461)
- Checks `metadata.customer_snapshot.email` (line 458)
- Falls back to `users.email` only if `user_id` exists (line 465)

### 7.2 Email Resolution Logic

```typescript
// Priority order:
1. metadata.customer_snapshot.email  // Highest priority
2. guest_email                       // Guest checkout
3. users.email (via user_id)        // Logged-in users
```

**Diagnostic Logging:**
If no email is found, the function logs:
```typescript
{
  has_user_id: !!typedOrder.user_id,
  has_guest_email: !!typedOrder.guest_email,
  has_metadata_email: !!metadata?.customer_snapshot?.email,
}
```

---

## 8. FUNCTION EXIT POINTS

### 8.1 Early Exits (Return `false`)

1. **Line 383:** Missing `RESEND_API_KEY`
2. **Line 422:** Order not found
3. **Line 491:** No email address found
4. **Line 575:** Resend API error

### 8.2 Successful Exit (Return `true`)

**Line 603:** Email sent successfully
- Logs: `[ORDER_CONFIRMATION_EMAIL_SENT]`
- Writes audit log (line 588-601)
- Returns: `true`

### 8.3 Exception Exits (Thrown, Caught by Caller)

1. **Line 55:** Missing `RESEND_ORDERS_FROM_EMAIL` (via `getOrdersSender()`)
2. **Line 31:** Missing `RESEND_API_KEY` (via `getResendClient()`)
3. **Line 604-612:** Any unexpected error in try-catch

---

## 9. ROOT CAUSE ANALYSIS

### 9.1 Most Likely Failure Points

#### **CRITICAL: Missing RESEND_ORDERS_FROM_EMAIL**
**Probability:** HIGH  
**Impact:** Function throws exception, caught by caller  
**Detection:** Check logs for `[PAYMENT_CAPTURED] Failed to send order confirmation email` with message "RESEND_ORDERS_FROM_EMAIL is required but not configured"

#### **HIGH: Missing RESEND_API_KEY**
**Probability:** MEDIUM  
**Impact:** Function returns `false` immediately  
**Detection:** Check logs for `[ORDER_CONFIRMATION_EMAIL_SENT] RESEND_API_KEY not set`

#### **MEDIUM: No Email Address Found**
**Probability:** MEDIUM  
**Impact:** Function returns `false`  
**Detection:** Check logs for `[EMAIL_FAILED]` with error "No email address found for order (guest or logged-in)"

#### **LOW: Resend API Error**
**Probability:** LOW  
**Impact:** Function returns `false`  
**Detection:** Check logs for `[EMAIL_FAILED]` with Resend error message

### 9.2 Silent Failure Pattern

**Problem:** All failures are logged but **not surfaced** to monitoring/alerting systems.

**Evidence:**
- Webhook returns `200 OK` even if email fails
- Verify route returns `200 OK` even if email fails
- No database tracking of email failures
- No retry mechanism
- No alerting integration

---

## 10. DIAGNOSTIC CHECKLIST

### 10.1 Environment Variables

- [ ] `RESEND_API_KEY` is set and valid
- [ ] `RESEND_ORDERS_FROM_EMAIL` is set and valid
- [ ] `RESEND_ORDERS_FROM_NAME` is set (optional, defaults to "Zeynora Orders")

### 10.2 Order Data

- [ ] Order exists in database
- [ ] Order has `payment_status = "paid"` (not checked by function, but should be)
- [ ] Order has email address:
  - [ ] `metadata.customer_snapshot.email` OR
  - [ ] `guest_email` OR
  - [ ] `user_id` with valid `users.email`

### 10.3 Log Analysis

Check logs for these patterns:

1. **Missing API Key:**
   ```
   [ORDER_CONFIRMATION_EMAIL_SENT] RESEND_API_KEY not set
   ```

2. **Missing Sender Email:**
   ```
   [PAYMENT_CAPTURED] Failed to send order confirmation email
   Error: RESEND_ORDERS_FROM_EMAIL is required but not configured
   ```

3. **No Email Address:**
   ```
   [EMAIL_FAILED] No email address found for order (guest or logged-in)
   has_user_id: false
   has_guest_email: false
   has_metadata_email: false
   ```

4. **Resend API Error:**
   ```
   [EMAIL_FAILED] type: ORDER_CONFIRMATION_EMAIL_SENT
   error: <Resend error message>
   ```

5. **Success:**
   ```
   [ORDER_CONFIRMATION_EMAIL_SENT]
   order_id: <id>
   order_number: <number>
   email: <masked>
   ```

---

## 11. RECOMMENDATIONS

### 11.1 Immediate Actions

1. **Verify Environment Variables:**
   - Check production environment has `RESEND_ORDERS_FROM_EMAIL` set
   - Verify `RESEND_API_KEY` is valid and not expired

2. **Check Logs:**
   - Search for `[PAYMENT_CAPTURED] Failed to send order confirmation email`
   - Search for `[ORDER_CONFIRMATION_EMAIL_SENT] RESEND_API_KEY not set`
   - Search for `[EMAIL_FAILED]` with order IDs

3. **Verify Order Data:**
   - Check if orders have `guest_email` populated
   - Check if orders have `metadata.customer_snapshot.email` populated
   - Verify `payment_status = "paid"` for orders that should have received emails

### 11.2 Code Improvements (Future)

1. **Add Payment Status Check:**
   ```typescript
   if (typedOrder.payment_status !== "paid") {
     console.warn("[EMAIL_SKIP] Order not paid:", {
       order_id: orderId,
       payment_status: typedOrder.payment_status,
     });
     return false;
   }
   ```

2. **Improve Error Handling:**
   - Don't throw in `getOrdersSender()` - return error object instead
   - Add database tracking for email failures
   - Add retry mechanism for transient failures

3. **Add Monitoring:**
   - Track email success/failure rates
   - Alert on email failure spikes
   - Dashboard for email delivery status

---

## 12. CONCLUSION

The email system has **multiple failure points** that could prevent confirmation emails from being sent:

1. **CRITICAL:** Missing `RESEND_ORDERS_FROM_EMAIL` causes exception (most likely root cause)
2. **HIGH:** Missing `RESEND_API_KEY` causes early return
3. **MEDIUM:** Missing email address causes early return
4. **LOW:** Resend API errors cause early return

**All failures are silently swallowed** - payment webhook/verify routes succeed even if email fails, making it difficult to detect the issue without log analysis.

**Next Steps:**
1. Check production environment variables
2. Analyze logs for email failure patterns
3. Verify order data has email addresses
4. Test email sending with a known-good order

---

**Report Generated:** 2026-02-04  
**Analysis Type:** Static Code Analysis  
**Files Analyzed:**
- `app/api/payments/webhook/route.ts`
- `app/api/payments/verify/route.ts`
- `lib/email/service.ts`
- `env.example`
