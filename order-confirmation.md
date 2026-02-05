# Order Confirmation Refactoring: Metadata Snapshots

## Overview

Refactor order confirmation page and email system to use immutable metadata snapshots, supporting guest orders without dependencies on the `users` table. Implement idempotent email sending with failure handling and retries.

## Requirements

- ✅ Support guest orders (no user authentication required)
- ✅ No dependency on `users` table
- ✅ Immutable snapshot rendering (use `metadata` field)
- ✅ Idempotent email sending (prevent duplicate emails)
- ✅ Failure handling and retries
- ✅ TypeScript correctness

---

## Current State Analysis

### 1. Email Service (`lib/email/service.ts`)

**Current Issues:**
- ❌ Requires `user_id` (line 428-435) - fails for guest orders
- ❌ Queries `users` table for email/name (lines 437-451)
- ❌ Queries `order_items` table instead of using snapshots (lines 454-469)
- ❌ Queries `addresses` table instead of using snapshots (lines 472-498)
- ❌ No idempotency check (can send duplicate emails)
- ❌ No retry mechanism

**Current Flow:**
```
Order ID → Fetch order → Check user_id → Query users table → Query order_items → Query addresses → Send email
```

### 2. Checkout Success Page (`app/(storefront)/checkout/success/page.tsx`)

**Current Issues:**
- ❌ Requires user authentication (lines 20-27)
- ❌ Queries `users` table (lines 30-36)
- ❌ Filters by `user_id` (line 45) - excludes guest orders
- ❌ Does not use metadata snapshots

**Current Flow:**
```
Order Number → Require auth → Query users → Filter by user_id → Display order
```

### 3. Metadata Structure (Already Exists)

**Available in `types/orders.ts`:**
- ✅ `CustomerSnapshot` - customer info snapshot
- ✅ `OrderItemSnapshot` - order items snapshot
- ✅ `OrderMetadata` - full metadata structure

**Snapshot Structure:**
```typescript
interface CustomerSnapshot {
  name: string;
  phone: string;
  email: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  snapshot_taken_at: string;
}

interface OrderItemSnapshot {
  sku: string;
  product_uid: string;
  product_name: string;
  size: string;
  quantity: number;
  selling_price: number;
  cost_price: number;
  subtotal: number;
}

interface OrderMetadata {
  customer_snapshot: CustomerSnapshot;
  items_snapshot: OrderItemSnapshot[];
  shipping: ShippingMetadata;
  checkout_source: "logged_in" | "guest";
}
```

---

## Refactoring Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Email Tracking Fields

Add fields to track email sending status for idempotency:

```sql
-- Migration: Add email tracking to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_email_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS confirmation_email_last_error text;

CREATE INDEX IF NOT EXISTS idx_orders_email_sent 
ON orders(confirmation_email_sent_at) 
WHERE confirmation_email_sent_at IS NULL;
```

**Rationale:**
- `confirmation_email_sent_at`: Timestamp when email was successfully sent (null = not sent)
- `confirmation_email_attempts`: Number of attempts (for retry logic)
- `confirmation_email_last_error`: Last error message (for debugging)

**Alternative (Metadata-based):**
If you prefer not to add columns, store in metadata:
```typescript
interface OrderMetadata {
  // ... existing fields
  email_tracking?: {
    confirmation_sent_at?: string;
    confirmation_attempts?: number;
    confirmation_last_error?: string;
  };
}
```

---

### Phase 2: Email Service Refactoring

#### 2.1 Refactor `sendOrderConfirmationEmail` Function

**New Implementation:**

```typescript
/**
 * Send order confirmation email using metadata snapshots
 * Supports guest orders, idempotent, with retry logic
 * 
 * @param orderId - Order ID to send confirmation for
 * @param options - Optional retry configuration
 * @returns Promise<{ success: boolean; alreadySent?: boolean; error?: string }>
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
  options?: {
    maxRetries?: number;
    skipIdempotencyCheck?: boolean; // For manual retries
  }
): Promise<{ success: boolean; alreadySent?: boolean; error?: string }> {
  const maxRetries = options?.maxRetries ?? 3;
  const skipIdempotencyCheck = options?.skipIdempotencyCheck ?? false;

  if (!RESEND_API_KEY) {
    console.warn("[ORDER_CONFIRMATION_EMAIL] RESEND_API_KEY not set - skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch order with metadata snapshots
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        subtotal,
        shipping_fee,
        total_amount,
        payment_status,
        metadata,
        confirmation_email_sent_at,
        confirmation_email_attempts,
        confirmation_email_last_error,
        guest_email,
        shipping_name,
        shipping_address1,
        shipping_address2,
        shipping_city,
        shipping_state,
        shipping_pincode,
        shipping_country
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      console.error("[EMAIL_FAILED]", {
        type: "ORDER_CONFIRMATION_EMAIL",
        order_id: orderId,
        error: orderError?.message || "Order not found",
      });
      return { success: false, error: orderError?.message || "Order not found" };
    }

    const typedOrder = orderData as {
      id: string;
      order_number: string;
      subtotal: number | null;
      shipping_fee: number | null;
      total_amount: number | null;
      payment_status: string | null;
      metadata: OrderMetadata | null;
      confirmation_email_sent_at: string | null;
      confirmation_email_attempts: number | null;
      confirmation_email_last_error: string | null;
      guest_email: string | null;
      shipping_name: string | null;
      shipping_address1: string | null;
      shipping_address2: string | null;
      shipping_city: string | null;
      shipping_state: string | null;
      shipping_pincode: string | null;
      shipping_country: string | null;
    };

    // IDEMPOTENCY CHECK: Skip if already sent (unless manual retry)
    if (!skipIdempotencyCheck && typedOrder.confirmation_email_sent_at) {
      console.log("[ORDER_CONFIRMATION_EMAIL] Already sent, skipping", {
        order_id: orderId,
        order_number: typedOrder.order_number,
        sent_at: typedOrder.confirmation_email_sent_at,
      });
      return { success: true, alreadySent: true };
    }

    // RETRY CHECK: Don't retry if exceeded max attempts
    const attempts = typedOrder.confirmation_email_attempts || 0;
    if (attempts >= maxRetries) {
      console.error("[EMAIL_FAILED] Max retries exceeded", {
        order_id: orderId,
        order_number: typedOrder.order_number,
        attempts,
        max_retries: maxRetries,
        last_error: typedOrder.confirmation_email_last_error,
      });
      return {
        success: false,
        error: `Max retries (${maxRetries}) exceeded. Last error: ${typedOrder.confirmation_email_last_error}`,
      };
    }

    // Extract data from metadata snapshots
    const metadata = typedOrder.metadata as OrderMetadata | null;
    if (!metadata || !metadata.customer_snapshot || !metadata.items_snapshot) {
      console.error("[EMAIL_FAILED] Missing metadata snapshots", {
        order_id: orderId,
        order_number: typedOrder.order_number,
      });
      return { success: false, error: "Order metadata snapshots missing" };
    }

    const customerSnapshot = metadata.customer_snapshot;
    const itemsSnapshot = metadata.items_snapshot;

    // Determine recipient email (guest or logged-in)
    const recipientEmail = customerSnapshot.email || typedOrder.guest_email;
    if (!recipientEmail) {
      console.error("[EMAIL_FAILED] No email address found", {
        order_id: orderId,
        order_number: typedOrder.order_number,
      });
      
      // Update attempt tracking
      await supabase
        .from("orders")
        .update({
          confirmation_email_attempts: attempts + 1,
          confirmation_email_last_error: "No email address found in order",
        })
        .eq("id", orderId);

      return { success: false, error: "No email address found" };
    }

    // Build shipping address from snapshot or order fields
    const shippingAddress = customerSnapshot.address || {
      line1: typedOrder.shipping_address1 || "",
      line2: typedOrder.shipping_address2 || null,
      city: typedOrder.shipping_city || "",
      state: typedOrder.shipping_state || "",
      pincode: typedOrder.shipping_pincode || "",
      country: typedOrder.shipping_country || "India",
    };

    // Transform items snapshot to email format
    const emailItems = itemsSnapshot.map((item) => ({
      name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      price: item.selling_price,
    }));

    // Build and send email
    const { subject, html, text } = buildOrderConfirmationEmailTemplate({
      orderNumber: typedOrder.order_number,
      customerName: customerSnapshot.name,
      items: emailItems,
      subtotal: typedOrder.subtotal || 0,
      shippingCost: typedOrder.shipping_fee || 0,
      total: typedOrder.total_amount || 0,
      shippingAddress: {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 || undefined,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country,
      },
      paymentStatus: typedOrder.payment_status || "pending",
    });

    const client = getResendClient();
    const fromSender = getOrdersSender();
    
    // Update attempt count before sending
    await supabase
      .from("orders")
      .update({
        confirmation_email_attempts: attempts + 1,
      })
      .eq("id", orderId);

    const result = await client.emails.send({
      from: fromSender,
      to: [recipientEmail],
      subject,
      html,
      text,
    });

    if (result.error) {
      const errorMessage = result.error.message || "Unknown error";
      console.error("[EMAIL_FAILED]", {
        type: "ORDER_CONFIRMATION_EMAIL",
        order_id: orderId,
        order_number: typedOrder.order_number,
        error: errorMessage,
        attempt: attempts + 1,
      });

      // Update error tracking
      await supabase
        .from("orders")
        .update({
          confirmation_email_last_error: errorMessage,
        })
        .eq("id", orderId);

      return { success: false, error: errorMessage };
    }

    // SUCCESS: Mark as sent
    const sentAt = new Date().toISOString();
    await supabase
      .from("orders")
      .update({
        confirmation_email_sent_at: sentAt,
        confirmation_email_last_error: null,
      })
      .eq("id", orderId);

    // Log success
    console.log("[ORDER_CONFIRMATION_EMAIL_SENT]", {
      order_id: orderId,
      order_number: typedOrder.order_number,
      email: recipientEmail.substring(0, 3) + "***", // Masked
      attempt: attempts + 1,
    });

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "order_confirmation_email_sent",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: typedOrder.order_number,
          recipient_email: recipientEmail.substring(0, 3) + "***", // Masked
          sent_at: sentAt,
        },
      } as unknown as never);
    } catch (auditError) {
      // Non-fatal
      console.warn("[ORDER_CONFIRMATION_EMAIL] Audit log failed:", auditError);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[EMAIL_FAILED]", {
      type: "ORDER_CONFIRMATION_EMAIL",
      order_id: orderId,
      error: errorMessage,
    });

    // Update error tracking
    try {
      const supabase = createServiceRoleClient();
      await supabase
        .from("orders")
        .update({
          confirmation_email_last_error: errorMessage,
        })
        .eq("id", orderId);
    } catch (updateError) {
      // Non-fatal
      console.warn("[ORDER_CONFIRMATION_EMAIL] Failed to update error tracking:", updateError);
    }

    return { success: false, error: errorMessage };
  }
}
```

**Key Changes:**
1. ✅ No `user_id` dependency - uses `guest_email` or `customer_snapshot.email`
2. ✅ Uses `metadata.items_snapshot` instead of querying `order_items`
3. ✅ Uses `metadata.customer_snapshot.address` instead of querying `addresses`
4. ✅ Idempotency check via `confirmation_email_sent_at`
5. ✅ Retry tracking via `confirmation_email_attempts`
6. ✅ Error tracking via `confirmation_email_last_error`

---

### Phase 3: Checkout Success Page Refactoring

#### 3.1 Refactor `CheckoutSuccessPage` Component

**New Implementation:**

```typescript
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { OrderMetadata } from "@/types/orders";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const orderNumber = resolvedSearchParams.order;

  if (!orderNumber) {
    redirect("/");
  }

  const supabase = await createServerClient();

  // Fetch order by order_number (works for both guest and logged-in orders)
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      payment_status,
      total_amount,
      created_at,
      payment_provider_response,
      metadata,
      guest_email,
      guest_phone
    `)
    .eq("order_number", orderNumber)
    .single();

  if (error || !order) {
    redirect("/");
  }

  const typedOrder = order as {
    id: string;
    order_number: string;
    payment_status: string;
    total_amount: number | null;
    created_at: string;
    payment_provider_response: any;
    metadata: OrderMetadata | null;
    guest_email: string | null;
    guest_phone: string | null;
  };

  // Extract data from metadata snapshots
  const metadata = typedOrder.metadata;
  if (!metadata || !metadata.customer_snapshot || !metadata.items_snapshot) {
    // Fallback: redirect if metadata missing (shouldn't happen for new orders)
    console.error("[CHECKOUT_SUCCESS] Missing metadata snapshots", {
      order_number: orderNumber,
    });
    redirect("/");
  }

  const customerSnapshot = metadata.customer_snapshot;
  const itemsSnapshot = metadata.items_snapshot;

  const paymentResponse = typedOrder.payment_provider_response as Record<string, any> | null;
  const razorpayPaymentId = paymentResponse?.razorpay_payment_id;
  const isPaid = typedOrder.payment_status === "paid";
  const isPending = typedOrder.payment_status === "pending";

  // Calculate totals from snapshots
  const subtotal = itemsSnapshot.reduce((sum, item) => sum + item.subtotal, 0);
  const total = typedOrder.total_amount || subtotal;

  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                isPaid ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              {isPaid ? (
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10 text-yellow-600 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Success Message */}
          <h1 className="serif-display text-3xl text-night mb-4">
            {isPaid
              ? "Payment Successful!"
              : isPending
              ? "Processing Payment..."
              : "Payment Status"}
          </h1>
          <p className="text-gray-600 mb-8">
            {isPaid
              ? `Thank you for your order, ${customerSnapshot.name}! We've received your payment and will process your order shortly.`
              : isPending
              ? "Your payment is being processed. We will update you via email once the payment is confirmed. Please check back in a few minutes."
              : "Your payment status is being verified. Please check back later or contact support if you have any questions."}
          </p>

          {/* Order Details */}
          <div className="bg-cream rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-night mb-4">Order Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-medium text-night">{typedOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span className="font-medium text-night">{customerSnapshot.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span
                  className={`font-medium capitalize ${
                    isPaid
                      ? "text-green-600"
                      : isPending
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {typedOrder.payment_status}
                </span>
              </div>
              {razorpayPaymentId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment ID:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {razorpayPaymentId.substring(0, 20)}...
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-medium text-night">
                  {format(new Date(typedOrder.created_at), "MMM dd, yyyy 'at' h:mm a")}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-silver">
                <span className="text-gray-600 font-semibold">Total Amount:</span>
                <span className="font-bold text-night text-lg">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items Preview */}
          <div className="bg-cream rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-night mb-4">Order Items</h2>
            <div className="space-y-3">
              {itemsSnapshot.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.product_name} ({item.size}) × {item.quantity}
                  </span>
                  <span className="font-medium text-night">
                    ₹{item.subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
              {itemsSnapshot.length > 3 && (
                <div className="text-xs text-gray-500 pt-2 border-t border-silver">
                  +{itemsSnapshot.length - 3} more item(s)
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          {customerSnapshot.address && (
            <div className="bg-cream rounded-lg p-6 mb-8 text-left">
              <h2 className="font-semibold text-night mb-4">Shipping Address</h2>
              <div className="text-sm text-gray-700">
                <p>{customerSnapshot.address.line1}</p>
                {customerSnapshot.address.line2 && <p>{customerSnapshot.address.line2}</p>}
                <p>
                  {customerSnapshot.address.city}, {customerSnapshot.address.state}{" "}
                  {customerSnapshot.address.pincode}
                </p>
                <p>{customerSnapshot.address.country}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* For guest orders, link to track-order instead of account */}
            {metadata.checkout_source === "guest" ? (
              <Link
                href={`/track-order?order_number=${typedOrder.order_number}`}
                className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors font-medium"
              >
                Track Order
              </Link>
            ) : (
              <Link
                href={`/account/orders/${typedOrder.id}`}
                className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors font-medium"
              >
                View Order Details
              </Link>
            )}
            <Link
              href="/"
              className="px-6 py-3 border border-gold text-gold rounded-lg hover:bg-gold/5 transition-colors font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Changes:**
1. ✅ No user authentication required
2. ✅ No `users` table query
3. ✅ Uses `metadata` snapshots for all data
4. ✅ Supports guest orders (shows track-order link)
5. ✅ Renders from immutable snapshots

---

### Phase 4: Retry Mechanism

#### 4.1 Create Retry API Endpoint

Create a new API endpoint for manual retries and scheduled retries:

```typescript
// app/api/admin/orders/[id]/retry-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/email/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  try {
    const result = await sendOrderConfirmationEmail(orderId, {
      skipIdempotencyCheck: true, // Force retry
      maxRetries: 5,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.alreadySent
          ? "Email was already sent"
          : "Email sent successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send email",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
```

#### 4.2 Scheduled Retry Job (Optional)

For automatic retries of failed emails, create a cron job or scheduled function:

```typescript
// app/api/cron/retry-failed-emails/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendOrderConfirmationEmail } from "@/lib/email/service";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // Find orders with failed email attempts (not sent, < 3 attempts, paid status)
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, confirmation_email_attempts")
      .is("confirmation_email_sent_at", null)
      .lt("confirmation_email_attempts", 3)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: true })
      .limit(50); // Process 50 at a time

    if (error) {
      throw error;
    }

    const results = await Promise.allSettled(
      (orders || []).map((order) =>
        sendOrderConfirmationEmail(order.id, { maxRetries: 3 })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      processed: orders?.length || 0,
      successful,
      failed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
```

---

## TypeScript Type Updates

### Update `types/orders.ts`

Add email tracking fields to the `Order` interface:

```typescript
export interface Order {
  // ... existing fields
  
  // Email tracking (for idempotency and retries)
  confirmation_email_sent_at?: string | null;
  confirmation_email_attempts?: number | null;
  confirmation_email_last_error?: string | null;
  
  // ... rest of fields
}
```

---

## Migration Strategy

### Step 1: Database Migration

Run the migration to add email tracking columns:

```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_email_tracking_to_orders.sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_email_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS confirmation_email_last_error text;

CREATE INDEX IF NOT EXISTS idx_orders_email_sent 
ON orders(confirmation_email_sent_at) 
WHERE confirmation_email_sent_at IS NULL;

COMMENT ON COLUMN orders.confirmation_email_sent_at IS 'Timestamp when confirmation email was successfully sent. NULL means not sent yet.';
COMMENT ON COLUMN orders.confirmation_email_attempts IS 'Number of attempts to send confirmation email. Used for retry logic.';
COMMENT ON COLUMN orders.confirmation_email_last_error IS 'Last error message if email sending failed.';
```

### Step 2: Update Email Service

1. Replace `lib/email/service.ts` with the new implementation
2. Test with both guest and logged-in orders
3. Verify idempotency (calling twice should only send once)

### Step 3: Update Checkout Success Page

1. Replace `app/(storefront)/checkout/success/page.tsx` with the new implementation
2. Test with guest orders (no auth)
3. Test with logged-in orders
4. Verify snapshot rendering

### Step 4: Update Webhook/Verify Routes

Update payment webhook and verify routes to use the new email function:

```typescript
// In app/api/payments/webhook/route.ts and app/api/payments/verify/route.ts
// Replace existing email sending code with:

try {
  const { sendOrderConfirmationEmail } = await import("@/lib/email/service");
  const result = await sendOrderConfirmationEmail(order.id);
  
  if (!result.success && !result.alreadySent) {
    console.warn("[PAYMENT_CAPTURED] Order confirmation email failed:", {
      order_id: order.id,
      order_number: order.order_number,
      error: result.error,
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

### Step 5: Backfill Existing Orders (Optional)

If you want to backfill email tracking for existing orders:

```sql
-- Mark orders as "email sent" if they have payment_status = 'paid' and were created before migration
-- This prevents re-sending emails to old orders
UPDATE orders
SET confirmation_email_sent_at = created_at
WHERE payment_status = 'paid'
  AND confirmation_email_sent_at IS NULL
  AND created_at < '2025-01-29'; -- Replace with migration date
```

---

## Testing Checklist

### Email Service Tests

- [ ] Guest order: Email sent using `guest_email` or `customer_snapshot.email`
- [ ] Logged-in order: Email sent using `customer_snapshot.email`
- [ ] Idempotency: Calling twice only sends one email
- [ ] Missing email: Returns error, updates attempt count
- [ ] Missing metadata: Returns error with clear message
- [ ] Retry limit: Stops after max retries
- [ ] Error tracking: Last error stored correctly

### Checkout Success Page Tests

- [ ] Guest order: Page loads without authentication
- [ ] Guest order: Shows track-order link (not account link)
- [ ] Logged-in order: Shows account link
- [ ] Snapshot rendering: Customer name, items, address from metadata
- [ ] Missing metadata: Redirects gracefully
- [ ] Payment status: Shows correct status (paid/pending/failed)

### Integration Tests

- [ ] Payment webhook: Email sent after payment
- [ ] Payment verify: Email sent after verification
- [ ] Manual retry: Admin can retry failed emails
- [ ] Scheduled retry: Cron job retries failed emails

---

## Rollback Plan

If issues occur:

1. **Revert Email Service**: Restore previous `lib/email/service.ts`
2. **Revert Page**: Restore previous `app/(storefront)/checkout/success/page.tsx`
3. **Database**: Email tracking columns are nullable, safe to ignore

---

## Performance Considerations

1. **Index**: `idx_orders_email_sent` helps find unsent emails quickly
2. **Batch Processing**: Retry cron job processes 50 orders at a time
3. **No Extra Queries**: Using snapshots eliminates 3+ database queries per email

---

## Security Considerations

1. **Email Validation**: Recipient email validated from snapshots (immutable)
2. **Guest Access**: Success page accessible without auth (by design)
3. **Order Number**: Used as identifier (public, but not sensitive)
4. **Cron Secret**: Retry endpoint protected by `CRON_SECRET`

---

## Future Enhancements

1. **Email Templates**: Support multiple templates based on order type
2. **Email Preferences**: Respect customer email preferences
3. **Delivery Tracking**: Track email delivery status (via Resend webhooks)
4. **Analytics**: Track email open rates, click rates
5. **A/B Testing**: Test different email templates

---

## Summary

This refactoring:

✅ **Removes `users` table dependency** - Uses metadata snapshots and `guest_email`  
✅ **Supports guest orders** - No authentication required  
✅ **Immutable snapshots** - All data from `metadata` field  
✅ **Idempotent emails** - Prevents duplicate sends  
✅ **Retry mechanism** - Handles failures gracefully  
✅ **TypeScript correct** - Full type safety  

The system is now resilient, supports all order types, and uses immutable snapshots for consistent rendering.
