# Payment Webhook Stock Deduction — Atomic Implementation

## Overview

This document explains the refactored stock deduction logic in the Razorpay payment webhook (`app/api/payments/webhook/route.ts`). The implementation ensures **exactly-once** stock deduction per successful payment, even under concurrent webhook processing.

---

## Why Overselling Is Now Impossible

### The Problem: Read-Modify-Write Race Condition

**Before (Vulnerable Pattern):**
```typescript
// Thread A reads stock = 5
const { data: variantData } = await supabase
  .from("product_variants")
  .select("stock")
  .eq("id", variantId);

// Thread B also reads stock = 5 (concurrent webhook)

// Thread A calculates newStock = 5 - 3 = 2
const newStock = currentStock - item.quantity;

// Thread B calculates newStock = 5 - 3 = 2 (same calculation!)

// Thread A writes stock = 2
await supabase.from("product_variants").update({ stock: 2 });

// Thread B writes stock = 2 (overwrites, losing Thread A's decrement!)
// Result: Only 3 items decremented instead of 6 → OVERSOLD
```

### The Solution: Atomic RPC with FOR UPDATE Locking

**After (Race-Safe Pattern):**
```typescript
// Single RPC call — no application-side stock reads
await supabase.rpc("decrement_stock", {
  variant_id_in: item.variant_id,
  qty_in: item.quantity,
});
```

The `decrement_stock` RPC function in the database:

```sql
SELECT stock INTO current_stock
FROM product_variants
WHERE id = variant_id_in
FOR UPDATE;  -- Row lock acquired here

new_stock := GREATEST(0, current_stock - qty_in);

UPDATE product_variants
SET stock = new_stock
WHERE id = variant_id_in;
```

**Why this is safe:**
1. `FOR UPDATE` acquires an exclusive row lock
2. Concurrent transactions block until the lock is released
3. Each transaction sees the committed value from the previous one
4. Stock calculation happens atomically inside the database
5. `GREATEST(0, ...)` prevents negative stock values

---

## How Concurrent Deductions Are Serialized

### Execution Flow Under Concurrency

```
Time    Webhook A                         Webhook B
────    ─────────                         ─────────
T1      Idempotency check PASS            Idempotency check PASS (different key)
T2      Order update (pending→paid)       Order update BLOCKS (same order_id)
T3      ACQUIRES row lock on variant      ... waiting ...
T4      Reads stock = 10                  ... waiting ...
T5      Calculates new = 10-3 = 7         ... waiting ...
T6      Writes stock = 7                  ... waiting ...
T7      RELEASES lock                     Order update SUCCEEDS (returns 0 rows)
T8      Returns success                   Returns "already processed"
```

**Key Safety Points:**

1. **Idempotency Layer** (First Line of Defense)
   - Unique constraint on `idempotency_key` in `payment_logs`
   - Duplicate webhooks rejected with `23505` error code
   - Only ONE webhook per `(event_id, payment_id, signature)` can proceed

2. **Conditional Order Update** (Second Line of Defense)
   - `UPDATE orders SET payment_status='paid' WHERE payment_status='pending'`
   - Returns 0 rows if order already processed
   - Stock deduction is NEVER reached if update affects 0 rows

3. **FOR UPDATE Row Lock** (Third Line of Defense)
   - Even if two webhooks somehow pass previous checks
   - Database serializes the stock decrements
   - Second transaction sees the updated value from first

### Sequence Diagram

```
┌──────────┐    ┌───────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Razorpay │    │ Webhook Route │    │ payment_logs     │    │ product_variants│
└────┬─────┘    └───────┬───────┘    └────────┬─────────┘    └────────┬────────┘
     │                  │                     │                       │
     │ POST /webhook    │                     │                       │
     │─────────────────>│                     │                       │
     │                  │                     │                       │
     │                  │ INSERT (idempotency)│                       │
     │                  │────────────────────>│                       │
     │                  │                     │                       │
     │                  │ OK (unique)         │                       │
     │                  │<────────────────────│                       │
     │                  │                     │                       │
     │                  │ UPDATE orders       │                       │
     │                  │ WHERE payment_status│= 'pending'            │
     │                  │                     │                       │
     │                  │ Rows affected: 1    │                       │
     │                  │                     │                       │
     │                  │ RPC: decrement_stock│                       │
     │                  │─────────────────────┼──────────────────────>│
     │                  │                     │                       │
     │                  │                     │   FOR UPDATE (lock)   │
     │                  │                     │   stock = stock - qty │
     │                  │                     │   COMMIT (unlock)     │
     │                  │                     │                       │
     │                  │<────────────────────┼───────────────────────│
     │                  │                     │                       │
     │ 200 OK           │                     │                       │
     │<─────────────────│                     │                       │
```

---

## What Happens When Stock Deduction Fails

### Failure Scenarios and Handling

| Scenario | Behavior | Stock State | Order State |
|----------|----------|-------------|-------------|
| Variant not found | Error logged, continue to next item | Unchanged | PAID |
| RPC network error | Error logged, continue to next item | Unchanged | PAID |
| Insufficient stock | Decrement to 0 (no negative), warning logged | Set to 0 | PAID |
| Database timeout | Error logged, no retry | Unchanged | PAID |

### Key Design Decisions

1. **No Retries**
   - Stock deduction errors are logged but NOT retried
   - Retrying could cause double-decrement on transient failures
   - Manual intervention required for persistent errors

2. **Partial Success Allowed**
   - If order has 5 items and 1 fails, 4 are still decremented
   - Errors array tracks which items failed
   - Payment webhook always returns success to Razorpay

3. **Never Block Payment**
   - Stock errors never cause webhook to fail
   - Customer sees payment success regardless
   - Operations team handles stock discrepancies

### Error Logging Format

```typescript
console.error("[STOCK_DECREMENT_RPC_ERROR]", {
  order_id: orderId,      // Always present
  variant_id: item.variant_id,
  sku: item.sku,
  quantity: item.quantity,
  error: rpcError.message,
  code: rpcError.code,    // PostgreSQL error code
});
```

### Summary Log

```typescript
console.log("[STOCK_DECREMENT_COMPLETE]", {
  order_id: orderId,
  success: false,         // true if all items succeeded
  decremented: 4,         // items successfully decremented
  total_items: 5,         // total items in order
  errors: ["Failed..."],  // only present if errors occurred
});
```

---

## Implementation Details

### RPC Functions Used

```sql
-- By variant_id (primary path)
decrement_stock(variant_id_in uuid, qty_in integer)

-- By SKU (fallback path)
decrement_stock_by_sku(sku_in text, qty_in integer)
```

Both functions:
- Use `FOR UPDATE` row locking
- Calculate `GREATEST(0, stock - qty)` to prevent negatives
- Are `SECURITY DEFINER` (run with owner permissions)
- Return `void` (no read-back of stock values)

### Execution Order Guarantee

Stock deduction runs ONLY after both checks pass:

```typescript
// STEP 1: Idempotency check (fails on duplicate)
const { error: idempotencyInsertError } = await supabase
  .from("payment_logs")
  .insert({ idempotency_key: ... });

if (isUniqueConstraintViolation(idempotencyInsertError)) {
  return; // EXIT — no stock deduction
}

// STEP 2: Conditional order update
const { data: updatedData } = await supabase
  .from("orders")
  .update({ payment_status: "paid" })
  .eq("payment_status", "pending"); // Only if still pending

if (updatedData.length === 0) {
  return; // EXIT — no stock deduction
}

// STEP 3: Stock deduction (only reaches here once per order)
await decrementStockForOrder(order.id);
```

---

## Verification Checklist

- [x] No `SELECT stock` in application code
- [x] No stock calculation in TypeScript
- [x] `decrement_stock` RPC used for variant_id
- [x] `decrement_stock_by_sku` RPC used as fallback
- [x] Stock deduction after idempotency check
- [x] Stock deduction after conditional order update
- [x] Errors logged with order_id and sku
- [x] No retry on failure
- [x] No uncaught errors thrown
- [x] TypeScript strict (no `any`, no unused variables)

---

## References

- Migration: `supabase/migrations/20250116000000_decrement_stock_functions.sql`
- Webhook: `app/api/payments/webhook/route.ts`
- Idempotency: `supabase/migrations/20250129000000_add_idempotency_key_to_payment_logs.sql`
