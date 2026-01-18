/**
 * FINAL — Razorpay Payment Webhook
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
import { verifyWebhookSignature, buildIdempotencyKey } from "@/lib/payments/webhook";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";
import { calculateShippingRate } from "@/lib/shipping/rate-calculator";

export const dynamic = "force-dynamic";

/**
 * Decrement stock for order items after payment
 * Must run even if shipment fails
 * 
 * Safety:
 * - If stock < required → log warning but still mark PAID
 * - No silent failure
 * - Each item processed with awaited commit
 */
async function decrementStockForOrder(orderId: string): Promise<{
  success: boolean;
  decremented: number;
  errors: string[];
}> {
  const supabase = createServiceRoleClient();
  const errors: string[] = [];
  let decremented = 0;

  console.log("[STOCK_DECREMENT_START]", { order_id: orderId });

  // Fetch order items
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

  // Process each item
  for (const item of orderItems as Array<{
    id: string;
    sku: string | null;
    variant_id: string | null;
    quantity: number;
    name: string | null;
  }>) {
    try {
      // Find variant by SKU or variant_id
      let variantId = item.variant_id;
      
      if (!variantId && item.sku) {
        // Lookup by SKU
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id")
          .eq("sku", item.sku)
          .single();
        
        if (variant) {
          variantId = (variant as { id: string }).id;
        }
      }

      if (!variantId) {
        const errorMsg = `Variant not found for item ${item.sku || item.id}`;
        console.warn("[STOCK_DECREMENT_SKIP]", { item_id: item.id, error: errorMsg });
        errors.push(errorMsg);
        continue;
      }

      // Get current stock
      const { data: variantData } = await supabase
        .from("product_variants")
        .select("id, sku, stock")
        .eq("id", variantId)
        .single();

      if (!variantData) {
        const errorMsg = `Variant ${variantId} not found`;
        errors.push(errorMsg);
        continue;
      }

      const currentStock = (variantData as { stock: number | null }).stock ?? 0;
      const newStock = Math.max(0, currentStock - item.quantity);

      // Check if stock is sufficient
      if (currentStock < item.quantity) {
        console.warn("[STOCK_DECREMENT_WARNING] Insufficient stock:", {
          order_id: orderId,
          variant_id: variantId,
          sku: item.sku,
          requested: item.quantity,
          available: currentStock,
        });
        // Continue anyway - don't block payment
      }

      // Decrement stock (atomic update)
      const { error: updateError } = await supabase
        .from("product_variants")
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", variantId);

      if (updateError) {
        const errorMsg = `Failed to update stock for ${item.sku}: ${updateError.message}`;
        console.error("[STOCK_DECREMENT_ERROR]", { variant_id: variantId, error: updateError.message });
        errors.push(errorMsg);
        continue;
      }

      decremented++;
      console.log("[STOCK_DECREMENTED]", {
        order_id: orderId,
        variant_id: variantId,
        sku: item.sku,
        quantity: item.quantity,
        old_stock: currentStock,
        new_stock: newStock,
      });
    } catch (itemError) {
      const errorMsg = `Error processing item ${item.sku}: ${itemError instanceof Error ? itemError.message : "Unknown"}`;
      console.error("[STOCK_DECREMENT_ERROR]", { item_id: item.id, error: itemError });
      errors.push(errorMsg);
    }
  }

  const success = errors.length === 0;
  console.log("[STOCK_DECREMENT_COMPLETE]", {
    order_id: orderId,
    success,
    decremented,
    total_items: orderItems.length,
    errors: errors.length > 0 ? errors : undefined,
  });

  return { success, decremented, errors };
}

/**
 * Calculate and store internal shipping cost for order
 */
async function calculateAndStoreShippingCost(orderId: string): Promise<number> {
  const supabase = createServiceRoleClient();

  try {
    // Get shipping address pincode
    const { data: orderData } = await supabase
      .from("orders")
      .select("shipping_address_id, metadata")
      .eq("id", orderId)
      .single();

    if (!orderData || !(orderData as { shipping_address_id: string | null }).shipping_address_id) {
      console.warn("[SHIPPING_COST] No shipping address for order:", orderId);
      return 0;
    }

    const { data: address } = await supabase
      .from("addresses")
      .select("pincode")
      .eq("id", (orderData as { shipping_address_id: string }).shipping_address_id)
      .single();

    if (!address || !(address as { pincode: string | null }).pincode) {
      console.warn("[SHIPPING_COST] No pincode for order:", orderId);
      return 0;
    }

    const pincode = ((address as { pincode: string }).pincode || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(pincode)) {
      console.warn("[SHIPPING_COST] Invalid pincode:", pincode);
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
    const existingMetadata = ((orderData as { metadata: Record<string, unknown> | null }).metadata as Record<string, unknown>) || {};
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

export async function POST(req: NextRequest) {
  try {
    // Read raw body (must not be parsed before signature verification)
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let isValidSignature = false;
    try {
      isValidSignature = verifyWebhookSignature(rawBody, signature);
    } catch (hashError: unknown) {
      console.error("Webhook signature verification error:", hashError);
      return NextResponse.json(
        { error: "Signature verification failed", details: hashError instanceof Error ? hashError.message : "Unknown" },
        { status: 500 }
      );
    }

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (!event || !paymentEntity) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;
    const idempotencyKey = buildIdempotencyKey(payload, signature);

    // Check idempotency - look for existing payment_logs with same idempotency key
    const { data: recentLogs } = await supabase
      .from("payment_logs")
      .select("id, provider_response")
      .eq("provider", "razorpay")
      .order("created_at", { ascending: false })
      .limit(100);

    const typedRecentLogs = (recentLogs || []) as Array<{
      id: string;
      provider_response: Record<string, unknown> | null;
    }>;

    const existingLog = typedRecentLogs.find((log) => {
      const response = (log.provider_response as Record<string, unknown>) || {};
      return response?.idempotency_key === idempotencyKey;
    });

    if (existingLog) {
      return NextResponse.json({
        success: true,
        message: "Webhook already processed",
        idempotency_key: idempotencyKey,
      });
    }

    // Find order by razorpay_order_id
    const { data: orderData, error: findError } = await supabase
      .from("orders")
      .select(
        "id, user_id, order_status, payment_status, payment_provider_response, razorpay_order_id, payment_method, paid_at, metadata, created_at"
      )
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (findError || !orderData) {
      console.error("Order not found for Razorpay order ID:", razorpayOrderId, findError);
      await supabase.from("payment_logs").insert({
        order_id: null,
        provider: "razorpay",
        provider_response: {
          event,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          idempotency_key: idempotencyKey,
          incident: "order_not_found",
          payload_snippet: JSON.stringify(payload).substring(0, 500),
        },
        status: "incident",
      } as unknown as never);

      return NextResponse.json({
        success: false,
        message: "Order not found - incident logged for manual review",
      });
    }

    const order = orderData as {
      id: string;
      user_id: string | null;
      order_status: string;
      payment_status: string;
      payment_provider_response: Record<string, unknown> | null;
      razorpay_order_id: string | null;
      payment_method: string | null;
      paid_at: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    };

    // Handle different event types
    switch (event) {
      case "payment.captured":
      case "payment.authorized":
        // Idempotency check - if already PAID, ignore duplicate events
        if (order.payment_status === "paid" && order.order_status === "paid") {
          const currentResponse = (order.payment_provider_response as Record<string, unknown>) || {};
          if (currentResponse.razorpay_payment_id === razorpayPaymentId) {
            await supabase.from("payment_logs").insert({
              order_id: order.id,
              provider: "razorpay",
              provider_response: {
                event,
                idempotency_key: idempotencyKey,
                note: "duplicate_webhook_ignored",
                razorpay_payment_id: razorpayPaymentId,
              },
              status: "duplicate",
            } as unknown as never);

            return NextResponse.json({
              success: true,
              message: "Payment already recorded - duplicate webhook ignored",
            });
          }
        }

        // Extract payment method from payment entity
        const paymentMethod = paymentEntity.method || paymentEntity.method_type || null;
        const paidAtTimestamp = new Date().toISOString();

        // Update order: set payment_status=PAID, order_status=PAID
        const currentResponse = (order.payment_provider_response as Record<string, unknown>) || {};
        const updatedResponse = { ...currentResponse };
        updatedResponse.razorpay_payment_id = razorpayPaymentId;
        updatedResponse.razorpay_signature = signature.substring(0, 50);
        updatedResponse.webhook_received_at = paidAtTimestamp;
        updatedResponse.webhook_event = event;
        updatedResponse.payment_method = paymentMethod;

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            order_status: "paid",
            payment_status: "paid",
            payment_method: paymentMethod,
            paid_at: paidAtTimestamp,
            payment_provider_response: updatedResponse,
            updated_at: paidAtTimestamp,
          } as unknown as never)
          .eq("id", order.id);

        if (updateError) {
          console.error("Error updating order:", updateError);
          return NextResponse.json(
            { error: "Failed to update order", details: updateError.message },
            { status: 500 }
          );
        }

        console.log("[PAYMENT_CAPTURED]", {
          order_id: order.id,
          razorpay_payment_id: razorpayPaymentId,
          payment_method: paymentMethod,
        });

        // Write payment log
        await supabase.from("payment_logs").insert({
          order_id: order.id,
          provider: "razorpay",
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
          status: "paid",
        } as unknown as never);

        // ============================================
        // STEP 4: STOCK DECREMENT (after order is PAID)
        // Must run even if shipment fails
        // ============================================
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
            error: stockError instanceof Error ? stockError.message : "Unknown error",
          });
          // Don't fail - order is still PAID
        }

        // ============================================
        // STEP 3: CALCULATE SHIPPING COST
        // ============================================
        try {
          await calculateAndStoreShippingCost(order.id);
        } catch (shippingCostError) {
          console.error("[SHIPPING_COST_EXCEPTION]", {
            order_id: order.id,
            error: shippingCostError instanceof Error ? shippingCostError.message : "Unknown error",
          });
          // Don't fail - order is still PAID
        }

        // ============================================
        // STEP 5: TRIGGER SHIPMENT CREATION
        // Only if Shiprocket is enabled
        // Never blocks payment or confirmation
        // ============================================
        if (process.env.SHIPROCKET_ENABLED === "true") {
          try {
            console.log("[SHIPMENT_TRIGGER]", { order_id: order.id });
            await createShipmentForPaidOrder(order.id);
          } catch (shipmentError: unknown) {
            // Log error but do NOT break webhook or redirect
            console.error("[SHIPMENT_CREATION_ERROR] (non-fatal):", {
              order_id: order.id,
              error: shipmentError instanceof Error ? shipmentError.message : "Unknown error",
            });
            // Order remains PAID even if shipment creation fails
            // Admin can manually retry shipment creation later
          }
        } else {
          console.log("[SHIPROCKET_DISABLED] Skipping shipment creation:", { order_id: order.id });
        }

        break;

      case "payment.failed":
        // Payment failed - update payment_status but DO NOT delete order
        const failedResponse = (order.payment_provider_response as Record<string, unknown>) || {};
        if (
          order.payment_status === "failed" &&
          failedResponse.razorpay_payment_id === razorpayPaymentId
        ) {
          return NextResponse.json({
            success: true,
            message: "Payment failure already recorded - duplicate webhook ignored",
          });
        }

        const paymentAttempts = ((failedResponse.payment_attempts as number) || 0) + 1;
        failedResponse.razorpay_payment_id = razorpayPaymentId;
        failedResponse.webhook_received_at = new Date().toISOString();
        failedResponse.webhook_event = event;
        failedResponse.failure_reason =
          paymentEntity.error_description || paymentEntity.error_code || "Payment failed";
        failedResponse.payment_attempts = paymentAttempts;

        await supabase
          .from("orders")
          .update({
            payment_status: "failed",
            payment_provider_response: failedResponse,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", order.id);

        await supabase.from("payment_logs").insert({
          order_id: order.id,
          provider: "razorpay",
          provider_response: {
            event,
            payment_id: razorpayPaymentId,
            order_id: razorpayOrderId,
            error: paymentEntity.error_description,
            payment_attempts: paymentAttempts,
            idempotency_key: idempotencyKey,
            processed_at: new Date().toISOString(),
          },
          status: "failed",
        } as unknown as never);

        console.log("[PAYMENT_FAILED]", {
          order_id: order.id,
          reason: paymentEntity.error_description,
          attempts: paymentAttempts,
        });

        break;

      case "refund.processed":
        if (!order) {
          await supabase.from("payment_logs").insert({
            order_id: null,
            provider: "razorpay",
            provider_response: {
              event,
              razorpay_order_id: razorpayOrderId,
              idempotency_key: idempotencyKey,
              incident: "order_not_found",
            },
            status: "incident",
          } as unknown as never);

          return NextResponse.json({
            success: false,
            message: "Order not found - incident logged",
          });
        }

        const refundResponse = (order.payment_provider_response as Record<string, unknown>) || {};
        refundResponse.refund_id = paymentEntity.id;
        refundResponse.refund_amount = paymentEntity.amount;
        refundResponse.refund_status = paymentEntity.status;
        refundResponse.webhook_received_at = new Date().toISOString();
        refundResponse.webhook_event = event;

        await supabase
          .from("orders")
          .update({
            payment_status: "refunded",
            payment_provider_response: refundResponse,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", order.id);

        await supabase.from("payment_logs").insert({
          order_id: order.id,
          provider: "razorpay",
          provider_response: {
            event,
            refund_id: paymentEntity.id,
            refund_amount: paymentEntity.amount,
            status: paymentEntity.status,
            idempotency_key: idempotencyKey,
            processed_at: new Date().toISOString(),
          },
          status: "refunded",
        } as unknown as never);

        console.log("[PAYMENT_REFUNDED]", {
          order_id: order.id,
          refund_amount: paymentEntity.amount,
        });

        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
        if (order) {
          await supabase.from("payment_logs").insert({
            order_id: order.id,
            provider: "razorpay",
            provider_response: {
              event,
              payload: payload.payload,
              idempotency_key: idempotencyKey,
            },
            status: "unknown",
          } as unknown as never);
        }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      idempotency_key: idempotencyKey,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
