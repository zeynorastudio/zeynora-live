/**
 * PRODUCTION-HARDENED — Razorpay Payment Webhook
 *
 * Safety Features:
 * - Database-level idempotency via unique constraint on idempotency_key
 * - Conditional order status updates (only if payment_status = 'pending')
 * - Zero reliance on user_id (guest checkout supported)
 * - Full TypeScript typing
 *
 * Handles payment events from Razorpay:
 * - payment.captured / payment.authorized → Mark order PAID
 * - payment.failed → Mark payment FAILED
 * - refund.processed → Mark payment REFUNDED
 *
 * After PAID:
 * 1. Decrement stock for each order item
 * 2. Calculate and store internal shipping cost
 * 3. Trigger shipment creation
 *
 * Stock decrement happens even if shipment fails.
 * Payment webhook never blocks customer flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  verifyWebhookSignature,
  buildIdempotencyKey,
} from "@/lib/payments/webhook";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";
import { calculateShippingRate } from "@/lib/shipping/rate-calculator";

export const dynamic = "force-dynamic";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderRecord {
  id: string;
  user_id: string | null;
  order_number: string;
  order_status: string;
  payment_status: string;
  payment_provider_response: Record<string, unknown> | null;
  razorpay_order_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface PaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  method_type?: string;
  error_description?: string;
  error_code?: string;
}

interface WebhookPayload {
  event: string;
  event_id?: string;
  payload?: {
    payment?: {
      entity?: PaymentEntity;
    };
  };
}

interface PostgrestError {
  code?: string;
  message?: string;
  details?: string;
}

// ============================================================================
// STOCK DECREMENT — ATOMIC RPC-BASED IMPLEMENTATION
// ============================================================================

/**
 * Order item structure from database
 */
interface OrderItem {
  id: string;
  sku: string | null;
  variant_id: string | null;
  quantity: number;
  name: string | null;
}

/**
 * Result of stock decrement operation
 */
interface StockDecrementResult {
  success: boolean;
  decremented: number;
  errors: string[];
}

/**
 * Atomically decrement stock for all order items using database RPC.
 *
 * RACE-SAFETY GUARANTEES:
 * - Uses decrement_stock RPC with FOR UPDATE row locking
 * - No read-modify-write pattern in application code
 * - Concurrent webhooks are serialized at database level
 * - Stock cannot go negative (GREATEST(0, stock - qty) in RPC)
 *
 * EXECUTION ORDER:
 * - This function MUST only be called AFTER:
 *   1. Idempotency check passes (unique constraint on idempotency_key)
 *   2. Conditional order update succeeds (payment_status = 'pending' → 'paid')
 * - If order update affected 0 rows, caller exits before reaching this function
 *
 * FAILURE HANDLING:
 * - Errors are logged but NOT thrown
 * - Partial success is possible (some items decremented, some failed)
 * - Webhook completes safely regardless of stock errors
 * - No retries (would risk double-decrement on transient failures)
 */
async function decrementStockForOrder(orderId: string): Promise<StockDecrementResult> {
  const supabase = createServiceRoleClient();
  const errors: string[] = [];
  let decremented = 0;

  console.log("[STOCK_DECREMENT_START]", { order_id: orderId });

  // Fetch order items (read-only, no stock values needed)
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("id, sku, variant_id, quantity, name")
    .eq("order_id", orderId);

  if (itemsError || !orderItems || orderItems.length === 0) {
    console.error("[STOCK_DECREMENT_ERROR] No order items found:", {
      order_id: orderId,
      error: itemsError?.message,
    });
    return { success: false, decremented: 0, errors: ["No order items found"] };
  }

  const typedItems = orderItems as OrderItem[];

  // Process each item using atomic RPC calls
  for (const item of typedItems) {
    // Determine decrement method: by variant_id (preferred) or by SKU (fallback)
    const hasVariantId = !!item.variant_id;
    const hasSku = !!item.sku;

    if (!hasVariantId && !hasSku) {
      const errorMsg = `No variant_id or SKU for order item ${item.id}`;
      console.warn("[STOCK_DECREMENT_SKIP]", {
        order_id: orderId,
        item_id: item.id,
        item_name: item.name,
        error: errorMsg,
      });
      errors.push(errorMsg);
      continue;
    }

    try {
      if (hasVariantId) {
        // PRIMARY PATH: Use decrement_stock RPC by variant_id
        const { error: rpcError } = await supabase.rpc("decrement_stock", {
          variant_id_in: item.variant_id,
          qty_in: item.quantity,
        });

        if (rpcError) {
          const errorMsg = `decrement_stock failed for variant ${item.variant_id}: ${rpcError.message}`;
          console.error("[STOCK_DECREMENT_RPC_ERROR]", {
            order_id: orderId,
            variant_id: item.variant_id,
            sku: item.sku,
            quantity: item.quantity,
            error: rpcError.message,
            code: rpcError.code,
          });
          errors.push(errorMsg);
          continue;
        }

        decremented++;
        console.log("[STOCK_DECREMENTED]", {
          order_id: orderId,
          variant_id: item.variant_id,
          sku: item.sku,
          quantity: item.quantity,
          method: "decrement_stock",
        });
      } else {
        // FALLBACK PATH: Use decrement_stock_by_sku RPC
        const { error: rpcError } = await supabase.rpc("decrement_stock_by_sku", {
          sku_in: item.sku,
          qty_in: item.quantity,
        });

        if (rpcError) {
          const errorMsg = `decrement_stock_by_sku failed for SKU ${item.sku}: ${rpcError.message}`;
          console.error("[STOCK_DECREMENT_RPC_ERROR]", {
            order_id: orderId,
            sku: item.sku,
            quantity: item.quantity,
            error: rpcError.message,
            code: rpcError.code,
          });
          errors.push(errorMsg);
          continue;
        }

        decremented++;
        console.log("[STOCK_DECREMENTED]", {
          order_id: orderId,
          sku: item.sku,
          quantity: item.quantity,
          method: "decrement_stock_by_sku",
        });
      }
    } catch (itemError) {
      // Catch any unexpected errors (network issues, etc.)
      const errorMsg = `Unexpected error decrementing stock for ${item.sku || item.variant_id}: ${
        itemError instanceof Error ? itemError.message : "Unknown"
      }`;
      console.error("[STOCK_DECREMENT_EXCEPTION]", {
        order_id: orderId,
        item_id: item.id,
        variant_id: item.variant_id,
        sku: item.sku,
        error: itemError instanceof Error ? itemError.message : itemError,
      });
      errors.push(errorMsg);
      // No retry — continue to next item
    }
  }

  const success = errors.length === 0;
  console.log("[STOCK_DECREMENT_COMPLETE]", {
    order_id: orderId,
    success,
    decremented,
    total_items: typedItems.length,
    errors: errors.length > 0 ? errors : undefined,
  });

  return { success, decremented, errors };
}

// ============================================================================
// SHIPPING COST CALCULATION (DO NOT MODIFY - OUT OF SCOPE)
// ============================================================================

/**
 * Calculate and store internal shipping cost for order
 * Reads shipping pincode from order.shipping_pincode (preferred) or addresses table (fallback)
 */
async function calculateAndStoreShippingCost(orderId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  try {
    // Get shipping pincode - prefer order.shipping_pincode, fallback to addresses table
    const { data: orderData } = await supabase
      .from("orders")
      .select("shipping_pincode, shipping_address_id, metadata")
      .eq("id", orderId)
      .single();

    if (!orderData) {
      console.error("[SHIPPING_COST] Order not found:", orderId);
      return 0;
    }

    let pincode: string | null = null;

    // STEP 1: Try order.shipping_pincode first (preferred)
    const typedOrderData = orderData as {
      shipping_pincode: string | null;
      shipping_address_id: string | null;
      metadata: Record<string, unknown> | null;
    };

    if (typedOrderData.shipping_pincode) {
      pincode = typedOrderData.shipping_pincode.replace(/\D/g, "");
      if (!/^\d{6}$/.test(pincode)) {
        pincode = null; // Invalid format, try fallback
      }
    }

    // STEP 2: Fallback to addresses table if order.shipping_pincode not available
    if (!pincode && typedOrderData.shipping_address_id) {
      const { data: address } = await supabase
        .from("addresses")
        .select("pincode")
        .eq("id", typedOrderData.shipping_address_id)
        .single();

      if (address && (address as { pincode: string | null }).pincode) {
        pincode = (
          (address as { pincode: string }).pincode || ""
        ).replace(/\D/g, "");
        if (!/^\d{6}$/.test(pincode)) {
          pincode = null; // Invalid format
        }
      }
    }

    // STEP 3: Validate pincode
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      console.error("[SHIPPING_COST] No shipping address for order:", {
        order_id: orderId,
        has_shipping_pincode: !!typedOrderData.shipping_pincode,
        has_shipping_address_id: !!typedOrderData.shipping_address_id,
      });
      return 0;
    }

    // Calculate shipping rate
    const rateResult = await calculateShippingRate(pincode);

    if (!rateResult.success) {
      console.warn("[SHIPPING_COST] Rate calculation failed:", rateResult.error);
      return 0;
    }

    const shippingCost = rateResult.shipping_cost;

    // Store shipping cost in order
    const existingMetadata =
      ((orderData as { metadata: Record<string, unknown> | null })
        .metadata as Record<string, unknown>) || {};
    await supabase
      .from("orders")
      .update({
        internal_shipping_cost: shippingCost,
        metadata: {
          ...existingMetadata,
          shipping_cost_calculated: shippingCost,
          shipping_cost_courier: rateResult.courier_name || null,
          shipping_cost_calculated_at: new Date().toISOString(),
        },
      } as unknown as never)
      .eq("id", orderId);

    console.log("[SHIPPING_COST_STORED]", {
      order_id: orderId,
      pincode,
      cost: shippingCost,
      courier: rateResult.courier_name,
    });

    return shippingCost;
  } catch (error) {
    console.error("[SHIPPING_COST_ERROR]", {
      order_id: orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return 0;
  }
}

// ============================================================================
// IDEMPOTENCY HELPERS
// ============================================================================

/**
 * Check if a Postgres error is a unique constraint violation
 */
function isUniqueConstraintViolation(error: PostgrestError | null): boolean {
  if (!error) return false;
  // PostgreSQL unique violation error code
  return error.code === "23505";
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  console.log("[WEBHOOK_START] Event received");
  try {
    // ========================================================================
    // SECURITY: SIGNATURE VERIFICATION MUST HAPPEN FIRST
    // ========================================================================
    // No database writes or idempotency checks until signature is verified.
    // This prevents malicious/unverified requests from polluting payment_logs
    // or triggering idempotency checks with invalid data.
    // ========================================================================

    // Read raw body (must not be parsed before signature verification)
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    // CRITICAL: Verify webhook signature BEFORE any database operations
    let isValidSignature = false;
    try {
      isValidSignature = verifyWebhookSignature(rawBody, signature);
    } catch (hashError: unknown) {
      console.error("Webhook signature verification error:", hashError);
      return NextResponse.json(
        {
          error: "Signature verification failed",
          details:
            hashError instanceof Error ? hashError.message : "Unknown",
        },
        { status: 500 }
      );
    }

    // If signature is invalid, return immediately (no DB writes)
    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    console.log("[WEBHOOK_VERIFIED]");

    // ========================================================================
    // SIGNATURE VERIFIED - Safe to proceed with processing
    // ========================================================================

    // Parse webhook payload (safe now that signature is verified)
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!event || !paymentEntity) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    console.log("[WEBHOOK_EVENT_TYPE]", event);

    // Initialize database client (no writes yet)
    const supabase = createServiceRoleClient();
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;
    const idempotencyKey = buildIdempotencyKey(payload, signature);

    // ========================================================================
    // STEP 1: DATABASE-LEVEL IDEMPOTENCY CHECK (MANDATORY)
    // ========================================================================
    // Try to insert a payment_log with the idempotency_key FIRST.
    // The unique constraint on idempotency_key ensures only ONE webhook
    // can ever succeed for this key. Concurrent requests will get a
    // unique violation error (23505) and exit immediately.
    // ========================================================================

    const { error: idempotencyInsertError } = await supabase
      .from("payment_logs")
      .insert({
        order_id: null, // Will be updated after order lookup
        provider: "razorpay",
        provider_response: {
          event,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          payload_snippet: JSON.stringify(payload).substring(0, 500),
          processing_started_at: new Date().toISOString(),
        },
        status: "processing",
        idempotency_key: idempotencyKey,
      } as unknown as never);

    // Check for unique constraint violation (duplicate webhook)
    if (isUniqueConstraintViolation(idempotencyInsertError)) {
      console.log("[IDEMPOTENCY] Webhook already processed:", {
        idempotency_key: idempotencyKey,
        razorpay_order_id: razorpayOrderId,
      });
      return NextResponse.json({
        success: true,
        message: "Webhook already processed",
        idempotency_key: idempotencyKey,
      });
    }

    // Other insert errors - log but continue (may be column missing in older schema)
    if (idempotencyInsertError) {
      console.error("[IDEMPOTENCY] Insert error (non-duplicate):", {
        error: idempotencyInsertError,
        idempotency_key: idempotencyKey,
      });
    }

    // ========================================================================
    // STEP 2: FIND ORDER BY RAZORPAY ORDER ID
    // ========================================================================
    const { data: orderData, error: findError } = await supabase
      .from("orders")
      .select(
        "id, user_id, order_number, order_status, payment_status, payment_provider_response, razorpay_order_id, payment_method, paid_at, metadata, created_at"
      )
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (findError || !orderData) {
      console.error(
        "Order not found for Razorpay order ID:",
        razorpayOrderId,
        findError
      );

      // Update payment log with incident status
      await supabase
        .from("payment_logs")
        .update({
          provider_response: {
            event,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            incident: "order_not_found",
            payload_snippet: JSON.stringify(payload).substring(0, 500),
          },
          status: "incident",
        } as unknown as never)
        .eq("idempotency_key", idempotencyKey);

      return NextResponse.json({
        success: false,
        message: "Order not found - incident logged for manual review",
      });
    }

    const order = orderData as OrderRecord;

    // Update payment log with order_id
    await supabase
      .from("payment_logs")
      .update({
        order_id: order.id,
      } as unknown as never)
      .eq("idempotency_key", idempotencyKey);

    // ========================================================================
    // STEP 3: HANDLE DIFFERENT EVENT TYPES
    // ========================================================================
    switch (event) {
      case "payment.captured":
      case "payment.authorized": {
        console.log("[WEBHOOK_PAYMENT_CAPTURED]");
        // ==================================================================
        // STEP 4: SAFE ORDER STATUS TRANSITION (CONDITIONAL UPDATE)
        // ==================================================================
        // Only update the order if payment_status is still 'pending'.
        // If another webhook already processed this, the update will
        // affect 0 rows and we exit early.
        // ==================================================================

        // Check if already paid (defensive check before update)
        if (order.payment_status === "paid" && order.order_status === "paid") {
          const currentResponse =
            (order.payment_provider_response as Record<string, unknown>) || {};
          if (currentResponse.razorpay_payment_id === razorpayPaymentId) {
            // Update payment log to duplicate
            await supabase
              .from("payment_logs")
              .update({
                status: "duplicate",
                provider_response: {
                  event,
                  note: "duplicate_webhook_ignored",
                  razorpay_payment_id: razorpayPaymentId,
                },
              } as unknown as never)
              .eq("idempotency_key", idempotencyKey);

            return NextResponse.json({
              success: true,
              message: "Payment already recorded - duplicate webhook ignored",
            });
          }
        }

        // Extract payment method from payment entity
        const paymentMethod =
          paymentEntity.method || paymentEntity.method_type || null;
        const paidAtTimestamp = new Date().toISOString();

        // Build updated provider response
        const currentResponse =
          (order.payment_provider_response as Record<string, unknown>) || {};
        const updatedResponse = { ...currentResponse };
        updatedResponse.razorpay_payment_id = razorpayPaymentId;
        updatedResponse.razorpay_signature = signature.substring(0, 50);
        updatedResponse.webhook_received_at = paidAtTimestamp;
        updatedResponse.webhook_event = event;
        updatedResponse.payment_method = paymentMethod;

        console.log("[WEBHOOK_UPDATING_ORDER]", { order_id: order.id });

        // CONDITIONAL UPDATE: Only update if payment_status = 'pending'
        const { data: updatedData, error: updateError } = await supabase
          .from("orders")
          .update({
            order_status: "paid",
            payment_status: "paid",
            payment_method: paymentMethod,
            paid_at: paidAtTimestamp,
            payment_provider_response: updatedResponse,
            updated_at: paidAtTimestamp,
          } as unknown as never)
          .eq("id", order.id)
          .eq("payment_status", "pending") // CRITICAL: Only if still pending
          .select();

        if (updateError) {
          console.error("Error updating order:", updateError);
          return NextResponse.json(
            { error: "Failed to update order", details: updateError.message },
            { status: 500 }
          );
        }

        // Check if update actually happened (returns empty array if no rows matched)
        const updateSucceeded =
          Array.isArray(updatedData) && updatedData.length > 0;

        console.log("[WEBHOOK_ORDER_UPDATED]", { 
          order_id: order.id,
          update_succeeded: updateSucceeded 
        });

        if (!updateSucceeded) {
          // Order was already processed by another webhook
          console.log("[PAYMENT_CAPTURED] Order already processed:", {
            order_id: order.id,
            order_number: order.order_number,
            current_status: order.payment_status,
          });

          // Update payment log to duplicate
          await supabase
            .from("payment_logs")
            .update({
              status: "duplicate",
              provider_response: {
                event,
                note: "order_already_processed",
                razorpay_payment_id: razorpayPaymentId,
                order_status_at_time: order.payment_status,
              },
            } as unknown as never)
            .eq("idempotency_key", idempotencyKey);

          return NextResponse.json({
            success: true,
            message: "Order already processed - duplicate webhook ignored",
          });
        }

        console.log("[PAYMENT_CAPTURED]", {
          order_id: order.id,
          razorpay_payment_id: razorpayPaymentId,
          payment_method: paymentMethod,
        });

        // Update payment log with success
        await supabase
          .from("payment_logs")
          .update({
            status: "paid",
            provider_response: {
              event,
              payment_id: razorpayPaymentId,
              order_id: razorpayOrderId,
              amount: paymentEntity.amount,
              currency: paymentEntity.currency,
              status: paymentEntity.status,
              idempotency_key: idempotencyKey,
              payload_snippet: JSON.stringify(payload).substring(0, 500),
              processed_at: new Date().toISOString(),
            },
          } as unknown as never)
          .eq("idempotency_key", idempotencyKey);

        // ==================================================================
        // POST-PAYMENT PROCESSING (STOCK, SHIPPING, EMAIL)
        // DO NOT MODIFY - OUT OF SCOPE
        // ==================================================================

        // STEP 5: STOCK DECREMENT (after order is PAID)
        try {
          console.log("[POST_PAYMENT_START] Processing order:", order.id);

          const stockResult = await decrementStockForOrder(order.id);

          if (!stockResult.success) {
            console.warn("[STOCK_DECREMENT_PARTIAL]", {
              order_id: order.id,
              decremented: stockResult.decremented,
              errors: stockResult.errors,
            });
            // Don't fail - order is still PAID
          }
        } catch (stockError) {
          console.error("[STOCK_DECREMENT_EXCEPTION]", {
            order_id: order.id,
            error:
              stockError instanceof Error ? stockError.message : "Unknown error",
          });
          // Don't fail - order is still PAID
        }

        // STEP 6: CALCULATE SHIPPING COST
        try {
          await calculateAndStoreShippingCost(order.id);
        } catch (shippingCostError) {
          console.error("[SHIPPING_COST_EXCEPTION]", {
            order_id: order.id,
            error:
              shippingCostError instanceof Error
                ? shippingCostError.message
                : "Unknown error",
          });
          // Don't fail - order is still PAID
        }

        // STEP 7: SEND ORDER CONFIRMATION EMAIL
        try {
          console.log("[WEBHOOK_CALLING_EMAIL]", { order_id: order.id });
          const { sendOrderConfirmationEmail } = await import(
            "@/lib/email/service"
          );
          const emailSent = await sendOrderConfirmationEmail(order.id);
          console.log("[WEBHOOK_EMAIL_RESULT]", { 
            order_id: order.id,
            email_sent: emailSent 
          });
          if (!emailSent) {
            console.warn(
              "[PAYMENT_CAPTURED] Order confirmation email not sent:",
              {
                order_id: order.id,
                order_number: order.order_number,
              }
            );
          }
        } catch (emailError) {
          // Don't fail payment if email fails
          console.error(
            "[PAYMENT_CAPTURED] Failed to send order confirmation email:",
            {
              order_id: order.id,
              order_number: order.order_number,
              error:
                emailError instanceof Error
                  ? emailError.message
                  : "Unknown error",
            }
          );
        }

        // STEP 8: TRIGGER SHIPMENT CREATION
        if (process.env.SHIPROCKET_ENABLED === "true") {
          try {
            console.log("[SHIPMENT_TRIGGER]", { order_id: order.id });
            await createShipmentForPaidOrder(order.id);
          } catch (shipmentError: unknown) {
            // Log error but do NOT break webhook or redirect
            console.error("[SHIPMENT_CREATION_ERROR] (non-fatal):", {
              order_id: order.id,
              error:
                shipmentError instanceof Error
                  ? shipmentError.message
                  : "Unknown error",
            });
            // Order remains PAID even if shipment creation fails
          }
        } else {
          console.log("[SHIPROCKET_DISABLED] Skipping shipment creation:", {
            order_id: order.id,
          });
        }

        break;
      }

      case "payment.failed": {
        // Payment failed - update payment_status but DO NOT delete order
        const failedResponse =
          (order.payment_provider_response as Record<string, unknown>) || {};
        if (
          order.payment_status === "failed" &&
          failedResponse.razorpay_payment_id === razorpayPaymentId
        ) {
          return NextResponse.json({
            success: true,
            message: "Payment failure already recorded - duplicate webhook ignored",
          });
        }

        const paymentAttempts =
          ((failedResponse.payment_attempts as number) || 0) + 1;
        const updatedFailedResponse = { ...failedResponse };
        updatedFailedResponse.razorpay_payment_id = razorpayPaymentId;
        updatedFailedResponse.webhook_received_at = new Date().toISOString();
        updatedFailedResponse.webhook_event = event;
        updatedFailedResponse.failure_reason =
          paymentEntity.error_description ||
          paymentEntity.error_code ||
          "Payment failed";
        updatedFailedResponse.payment_attempts = paymentAttempts;

        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            payment_provider_response: updatedFailedResponse,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", order.id);

        await supabase
          .from("payment_logs")
          .update({
            status: "failed",
            provider_response: {
              event,
              payment_id: razorpayPaymentId,
              order_id: razorpayOrderId,
              error: paymentEntity.error_description,
              payment_attempts: paymentAttempts,
              idempotency_key: idempotencyKey,
              processed_at: new Date().toISOString(),
            },
          } as unknown as never)
          .eq("idempotency_key", idempotencyKey);

        console.log("[PAYMENT_FAILED]", {
          order_id: order.id,
          reason: paymentEntity.error_description,
          attempts: paymentAttempts,
        });

        break;
      }

      case "refund.processed": {
        const refundResponse =
          (order.payment_provider_response as Record<string, unknown>) || {};
        const updatedRefundResponse = { ...refundResponse };
        updatedRefundResponse.refund_id = paymentEntity.id;
        updatedRefundResponse.refund_amount = paymentEntity.amount;
        updatedRefundResponse.refund_status = paymentEntity.status;
        updatedRefundResponse.webhook_received_at = new Date().toISOString();
        updatedRefundResponse.webhook_event = event;

        await supabase
          .from("orders")
          .update({
            payment_status: "refunded",
            payment_provider_response: updatedRefundResponse,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", order.id);

        await supabase
          .from("payment_logs")
          .update({
            status: "refunded",
            provider_response: {
              event,
              refund_id: paymentEntity.id,
              refund_amount: paymentEntity.amount,
              status: paymentEntity.status,
              idempotency_key: idempotencyKey,
              processed_at: new Date().toISOString(),
            },
          } as unknown as never)
          .eq("idempotency_key", idempotencyKey);

        console.log("[PAYMENT_REFUNDED]", {
          order_id: order.id,
          refund_amount: paymentEntity.amount,
        });

        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event}`);
        await supabase
          .from("payment_logs")
          .update({
            status: "unknown",
            provider_response: {
              event,
              payload: payload.payload,
              idempotency_key: idempotencyKey,
            },
          } as unknown as never)
          .eq("idempotency_key", idempotencyKey);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      idempotency_key: idempotencyKey,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in webhook:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}
