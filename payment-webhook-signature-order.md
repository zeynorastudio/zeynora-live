# Payment Webhook Signature Verification Order Fix

**Date:** 2026-01-29  
**Status:** Implemented  
**File Modified:** `app/api/payments/webhook/route.ts`

---

## What Was Reordered

**No code was reordered** — the existing implementation already had signature verification before any database writes. However, explicit security comments were added to make this critical ordering requirement crystal clear and prevent future regressions.

### Current Order (Verified Correct)

1. ✅ **Read raw body** (line 365)
2. ✅ **Get signature header** (line 366)
3. ✅ **Verify signature** (lines 375-396) — **CRITICAL SECURITY CHECK**
4. ✅ **Return early if invalid** (line 391-395) — no DB writes
5. ✅ **Parse payload** (line 399-407) — only after signature verified
6. ✅ **Build idempotency key** (line 422) — uses verified payload
7. ✅ **Insert payment_log** (line 433) — first DB write, happens AFTER verification

### Changes Made

Added explicit security comments to emphasize that:
- Signature verification MUST happen before any database operations
- Invalid signatures cause immediate return (no DB writes)
- All database operations happen only after signature is verified

```typescript
// ========================================================================
// SECURITY: SIGNATURE VERIFICATION MUST HAPPEN FIRST
// ========================================================================
// No database writes or idempotency checks until signature is verified.
// This prevents malicious/unverified requests from polluting payment_logs
// or triggering idempotency checks with invalid data.
// ========================================================================
```

---

## Why This Closes a Security Risk

### Risk: Unverified Requests Polluting Database

**Without signature-first verification:**
- Malicious actor sends fake webhook with invalid signature
- Code inserts payment_log record (idempotency check)
- Even though signature fails later, database now has:
  - Invalid payment_log entry
  - Potential idempotency_key collision (if attacker guesses keys)
  - Log pollution making incident detection harder

**With signature-first verification:**
- Malicious actor sends fake webhook with invalid signature
- Signature verification fails immediately
- Code returns 400 error **before any database writes**
- Database remains clean, no invalid entries

### Risk: Idempotency Key Manipulation

**Without signature-first verification:**
- Attacker could craft payloads to generate specific idempotency keys
- Could potentially cause idempotency collisions with legitimate webhooks
- Even if signature fails later, the idempotency key was already computed

**With signature-first verification:**
- Idempotency key is only built AFTER signature is verified
- Invalid signatures never reach idempotency logic
- Legitimate webhooks are protected from collision attacks

### Risk: Resource Exhaustion

**Without signature-first verification:**
- Invalid requests consume database connections and write capacity
- Could lead to DoS if many invalid requests arrive
- Database writes are more expensive than signature verification

**With signature-first verification:**
- Invalid requests are rejected at the cheapest point (signature check)
- Database resources are preserved for legitimate requests
- Better resilience under attack

---

## Why Idempotency Guarantees Are Preserved

### Idempotency Logic Unchanged

The idempotency implementation remains exactly the same:
- Database-level unique constraint on `idempotency_key`
- Conditional order update (`WHERE payment_status = 'pending'`)
- Early return on duplicate detection

### Signature Verification Does Not Affect Idempotency

**Key insight:** Signature verification and idempotency serve different purposes:

- **Signature verification:** Ensures request authenticity (from Razorpay)
- **Idempotency:** Prevents duplicate processing of the same request

These are orthogonal concerns:
- A verified signature doesn't mean it's not a duplicate
- An unverified signature should never reach idempotency logic

### Order of Operations Preserved

The critical sequence remains intact:

```
1. Verify signature (reject invalid → no DB writes)
2. Build idempotency key (from verified payload)
3. Insert payment_log (idempotency check)
4. Update order (conditional update)
```

**Why this preserves idempotency:**
- Same webhook → same signature → same idempotency key
- Database unique constraint still prevents duplicates
- Conditional order update still prevents double-processing
- Only difference: invalid signatures never reach idempotency logic

---

## Security Benefits Summary

| Risk | Mitigation |
|------|------------|
| Invalid webhooks polluting DB | Signature verified before any DB writes |
| Idempotency key manipulation | Key only built after signature verified |
| Resource exhaustion | Invalid requests rejected early (cheap check) |
| Log pollution | No invalid entries in payment_logs |

---

## Verification

To verify the security ordering:

1. **Check signature verification happens first:**
   ```typescript
   // Line 375-396: Signature verification
   // Line 433: First database write (insert payment_log)
   ```

2. **Check early returns prevent DB writes:**
   ```typescript
   // Line 391-395: Invalid signature → return immediately
   // No database operations after this point
   ```

3. **Check idempotency key is built after verification:**
   ```typescript
   // Line 422: buildIdempotencyKey() called AFTER signature check
   ```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-29
