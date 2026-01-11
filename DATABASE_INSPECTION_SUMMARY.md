# Database Inspection Summary — Payment Status Source of Truth

## Inspection Date
Generated from schema analysis and codebase review

---

## STEP 1: Orders Table Schema

### Payment-Related Columns in `orders` Table

Based on schema files (`phase_2_1_schema.sql`, `types/supabase.ts`):

| Column Name | Type | Default | Nullable | Purpose |
|------------|------|---------|----------|---------|
| **`payment_status`** | `z_payment_status` enum | `'pending'` | NO | **PRIMARY SOURCE** - Payment status enum: `'pending'`, `'paid'`, `'failed'`, `'refunded'` |
| `payment_provider` | `text` | NULL | YES | Payment provider name (e.g., `'razorpay'`, `'stripe'`) |
| `payment_provider_response` | `jsonb` | NULL | YES | Raw payment provider webhook/response data |
| `paid_at` | `timestamptz` | NULL | YES | Timestamp when payment was captured (Phase 3.2) |
| `razorpay_order_id` | `text` | NULL | YES | Razorpay order ID (e.g., `order_xxx`) (Phase 3.2) |
| `payment_method` | `text` | NULL | YES | Payment method used (e.g., `'card'`, `'netbanking'`, `'wallet'`, `'upi'`) (Phase 3.2) |
| `order_status` | `z_order_status` enum | NULL | YES | Order status (includes `'paid'` value) |
| `metadata` | `jsonb` | `'{}'` | NO | General metadata JSONB field |

### Conclusion for STEP 1
✅ **`payment_status` column EXISTS** in `orders` table
- Type: Enum (`z_payment_status`)
- Default: `'pending'`
- Values: `'pending'`, `'paid'`, `'failed'`, `'refunded'`

---

## STEP 2: Payment Logs Table

### `payment_logs` Table Schema

| Column Name | Type | Purpose |
|------------|------|---------|
| `id` | `uuid` | Primary key |
| `order_id` | `uuid` | FK → `orders.id` |
| `provider` | `text` | Payment provider name |
| `provider_response` | `jsonb` | Raw provider response |
| `status` | `text` | Payment status (text field, not enum) |
| `created_at` | `timestamptz` | Timestamp |

### Conclusion for STEP 2
⚠️ **`payment_logs` table EXISTS** but is **NOT the source of truth**
- Contains historical payment events
- `status` field is text (not enum)
- Used for audit/logging purposes
- **NOT used for current payment status**

---

## STEP 3: JSONB Fields Inspection

### `payment_provider_response` JSONB Structure

Based on `BACKEND_DATABASE_SCHEMA_REPORT.md`:

```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_hash",
  "credits_applied": 500,
  "credits_locked": true,
  "credits_deducted_at": "2024-12-25T...",
  "verified_at": "2024-12-25T...",
  "payment_attempts": 1,
  "pending_expires_at": "2024-12-25T..."
}
```

**Note:** This field does NOT contain `payment_status` directly. It contains Razorpay-specific data.

### `metadata` JSONB Field

- Default: `'{}'` (empty object)
- May contain various order-related metadata
- **NOT the primary source** for payment status
- May contain payment-related keys but should not be relied upon

### Conclusion for STEP 3
❌ **JSONB fields are NOT the source of truth**
- `payment_provider_response`: Contains provider-specific data, not status
- `metadata`: General purpose field, not payment status source

---

## STEP 4: Summary — Payment Status Source of Truth

### ✅ PRIMARY SOURCE: `orders.payment_status`

**Location:** `orders` table, `payment_status` column

**Type:** Enum (`z_payment_status`)

**Values:**
- `'pending'` (default)
- `'paid'`
- `'failed'`
- `'refunded'`

**How to Query:**
```sql
SELECT payment_status FROM orders WHERE id = '<ORDER_UUID>';
```

**In Supabase Client:**
```typescript
const { data } = await supabase
  .from("orders")
  .select("payment_status")
  .eq("id", orderId)
  .single();
```

---

## STEP 5: Additional Payment-Related Fields

### Supporting Fields (Not Status Source)

1. **`paid_at`** (`timestamptz`)
   - Timestamp when payment was captured
   - Set via webhook
   - Indicates WHEN payment occurred, not the status

2. **`order_status`** (enum)
   - Includes `'paid'` value
   - Represents order lifecycle, not payment status
   - Different from `payment_status`

3. **`payment_provider`** (`text`)
   - Provider name (e.g., `'razorpay'`)
   - Indicates WHO processed payment, not status

4. **`razorpay_order_id`** (`text`)
   - External payment provider order ID
   - Reference field, not status

---

## Inspection Endpoint

A read-only inspection endpoint has been created at:
```
GET /api/admin/orders/:id/inspect
```

This endpoint will:
1. Query the `orders` table for the specified order UUID
2. Check `payment_status` field existence and value
3. Inspect `payment_logs` table for related records
4. Examine JSONB fields (`metadata`, `payment_provider_response`)
5. Return a comprehensive report

**Usage:**
```bash
curl http://localhost:3000/api/admin/orders/<ORDER_UUID>/inspect
```

---

## Final Conclusion

### ✅ Payment Status Source of Truth

**PRIMARY:** `orders.payment_status` (enum column)

**NOT Sources:**
- ❌ `payment_logs.status` (historical/audit only)
- ❌ `orders.metadata.payment_status` (if exists, not primary)
- ❌ `orders.payment_provider_response.status` (provider data, not status)
- ❌ `orders.order_status` (order lifecycle, different from payment)

### Recommendation

Always query `orders.payment_status` directly. Ensure this column is:
1. ✅ Included in SELECT queries
2. ✅ Not omitted when using `select("*")` with nested relations
3. ✅ Explicitly listed if using column lists

---

## Next Steps

1. Use the inspection endpoint to verify actual data in database
2. Check if `payment_status` is NULL for any orders
3. Verify the SELECT query in API route includes `payment_status`
4. Ensure frontend reads from `order.payment_status` (not nested paths)

