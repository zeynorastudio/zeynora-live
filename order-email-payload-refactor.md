Order Email Payload Refactor

Why the payload builder isolates risk
- It centralizes validation (email + items snapshot) before any HTML is created.
- It makes the send path deterministic by returning a single, validated shape.

Why snapshot-only prevents schema drift
- The email is built from `metadata.customer_snapshot` and `metadata.items_snapshot`.
- This avoids dependency on live tables that might change or be incomplete.

Why logging payload is critical
- It provides a complete, single-source record of what the email is sending.
- It makes failures observable without guessing which fields were missing.

Why payment_status guard ensures correctness
- The email only sends when `payment_status === "paid"`.
- This prevents confirmations for unpaid or pending orders.

Why this stabilizes Phase 3B
- It removes silent failures by enforcing validation and explicit logging.
- It locks the confirmation email to paid, snapshot-backed orders only.
