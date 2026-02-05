# Payment Webhook Idempotency Implementation

**Date:** 2026-01-29  
**Status:** Implemented  
**File Modified:** `app/api/payments/webhook/route.ts`  
**Migration Added:** `supabase/migrations/20250129000000_add_idempotency_key_to_payment_logs.sql`

---

## What Was Changed

### 1. Database-Level Idempotency

**Before:** The webhook handler checked idempotency by querying the last 100 payment_logs and searching for a matching idempotency_key in the JSONB `provider_response` column. This approach had a race condition window where two concurrent webhooks could both pass the check.

**After:** Idempotency is now enforced at the database level using a unique constraint on a dedicated `idempotency_key` column. The webhook handler inserts a payment_log record with the idempotency_key FIRST, before any other processing. If the insert fails with error code `23505` (unique constraint violation), the webhook has already been processed and we exit immediately.

```sql
-- New unique constraint on idempotency_key
CREATE UNIQUE INDEX idx_payment_logs_idempotency_key_unique
ON payment_logs(idempotency_key) 
WHERE idempotency_key IS NOT NULL;
```

### 2. Conditional Order Status Update

**Before:** The order update had no condition — it would update the order regardless of its current state, allowing the same payment to transition an order to "paid" multiple times.

**After:** The order update now includes a WHERE clause that requires `payment_status = 'pending'`:

```typescript
const { data: updatedData, error: updateError } = await supabase
  .from("orders")
  .update({
    order_status: "paid",
    payment_status: "paid",
    // ...
  })
  .eq("id", order.id)
  .eq("payment_status", "pending") // CRITICAL: Only if still pending
  .select();

// Check if update actually happened
const updateSucceeded = Array.isArray(updatedData) && updatedData.length > 0;
if (!updateSucceeded) {
  // Order was already processed, exit early
  return NextResponse.json({
    success: true,
    message: "Order already processed - duplicate webhook ignored",
  });
}
```

### 3. No User ID Assumptions

The webhook handler does not require `user_id` for any core processing. Guest orders (where `user_id` is null) work correctly. The order lookup uses `razorpay_order_id`, and post-payment processing (stock, shipping, email) uses `order_id` only.

---

## Why Idempotency Is Now Guaranteed

### Database-Level Enforcement

The unique constraint on `idempotency_key` is enforced by PostgreSQL at the database level. This means:

1. **No race condition window:** Unlike application-level checks (query then insert), the database handles uniqueness atomically.

2. **Concurrent safety:** If two webhooks with the same idempotency_key arrive simultaneously, exactly one will succeed and one will fail with error `23505`.

3. **Crash safety:** Even if the application crashes mid-processing, the idempotency_key is already in the database. A retry will fail with unique violation.

### Idempotency Key Generation

The idempotency key is generated from the webhook payload:

```typescript
function buildIdempotencyKey(payload, signature) {
  // Prefer razorpay_event_id if available (deterministic)
  if (payload.event_id) {
    return `razorpay_webhook_${payload.event_id}`;
  }
  // Fallback to signature hash
  return `razorpay_webhook_${sha256(signature).substring(0, 32)}`;
}
```

This ensures:
- Same webhook payload → same idempotency_key
- Different webhooks → different idempotency_keys
- Razorpay retries → same idempotency_key (rejected as duplicate)

---

## How Race Conditions Are Prevented

### Scenario: Two Concurrent Webhook Requests

```
Timeline:
  T0: Webhook A arrives, Webhook B arrives (simultaneously)
  T1: Webhook A attempts INSERT with idempotency_key='xyz'
  T2: Webhook B attempts INSERT with idempotency_key='xyz'
  T3: Database grants INSERT to A (first), rejects B (unique violation)
  T4: Webhook A proceeds to update order
  T5: Webhook B returns early with "already processed"
```

### Scenario: Order Status Update Race

Even if the idempotency insert somehow both succeeded (e.g., column not yet migrated), the conditional order update provides a second layer of protection:

```
Timeline:
  T0: Webhook A reads order (payment_status='pending')
  T1: Webhook B reads order (payment_status='pending')
  T2: Webhook A updates order WHERE payment_status='pending' → 1 row affected
  T3: Webhook B updates order WHERE payment_status='pending' → 0 rows affected
  T4: Webhook B detects 0 rows, returns "already processed"
```

### Scenario: Stock Decrement Safety

Stock decrement only runs AFTER the conditional order update succeeds. If the order update affected 0 rows, the webhook exits before reaching stock decrement. This prevents:
- Duplicate stock decrements
- Stock decrements for orders that are already paid

---

## What Happens on Duplicate Webhook Delivery

### Case 1: Exact Duplicate (Same Webhook Replayed)

1. First webhook: Inserts payment_log with idempotency_key, updates order to PAID, runs post-payment logic
2. Second webhook: INSERT fails with unique violation (23505), returns immediately:
   ```json
   {
     "success": true,
     "message": "Webhook already processed",
     "idempotency_key": "razorpay_webhook_evt_abc123"
   }
   ```

### Case 2: Near-Simultaneous Duplicates

1. Both webhooks attempt INSERT concurrently
2. Database serializes: one succeeds, one gets 23505
3. Winner proceeds normally, loser returns "already processed"

### Case 3: Order Already Paid (Different Webhook Event)

1. Webhook arrives for order that is already PAID (e.g., payment.captured after payment.authorized)
2. Idempotency insert succeeds (different event_id = different key)
3. Conditional order update fails (0 rows affected because payment_status ≠ 'pending')
4. Webhook logs as "duplicate" and returns:
   ```json
   {
     "success": true,
     "message": "Order already processed - duplicate webhook ignored"
   }
   ```

### Case 4: Idempotency Column Missing (Migration Not Yet Applied)

The code handles this gracefully:
1. INSERT with idempotency_key fails (column doesn't exist)
2. Error is logged: `[IDEMPOTENCY] Insert error (non-duplicate)`
3. Processing continues with conditional order update as backup
4. Order update still protected by `WHERE payment_status='pending'`

---

## Summary of Safety Guarantees

| Threat | Mitigation |
|--------|------------|
| Duplicate webhook delivery | Unique constraint on idempotency_key |
| Concurrent webhook processing | Database-level INSERT serialization |
| Double order status update | Conditional UPDATE WHERE payment_status='pending' |
| Double stock decrement | Stock decrement only runs after successful order update |
| Double email send | Email service has its own idempotency (logs sent emails) |
| Guest order failure | No user_id dependency in core processing |

---

## Files Changed

1. **`app/api/payments/webhook/route.ts`**
   - Added database-level idempotency check (INSERT before processing)
   - Added conditional order update (WHERE payment_status='pending')
   - Added type definitions for TypeScript strictness
   - Removed legacy idempotency check (query last 100 logs)

2. **`supabase/migrations/20250129000000_add_idempotency_key_to_payment_logs.sql`**
   - Adds `idempotency_key` column to `payment_logs` table
   - Creates unique partial index for idempotency enforcement
   - Creates lookup index for performance

---

## Testing Recommendations

1. **Duplicate webhook test:** Send same webhook twice, verify only one order update
2. **Concurrent webhook test:** Send two webhooks simultaneously, verify no race condition
3. **Guest order test:** Process payment for guest order (user_id=null), verify success
4. **Migration rollback test:** Verify webhook works if idempotency_key column is missing

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29
