import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature, buildIdempotencyKey } from "@/lib/payments/webhook";
import { createShipmentForPaidOrder } from "@/lib/shipping/create-shipment";

export const dynamic = "force-dynamic";

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
    } catch (hashError: any) {
      console.error("Webhook signature verification error:", hashError);
      return NextResponse.json(
        { error: "Signature verification failed", details: hashError.message },
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
    // Note: Supabase JSONB contains check - we'll query all recent logs and filter in memory
    const { data: recentLogs } = await supabase
      .from("payment_logs")
      .select("id, provider_response")
      .eq("provider", "razorpay")
      .order("created_at", { ascending: false })
      .limit(100);

    const typedRecentLogs = (recentLogs || []) as Array<{
      id: string;
      provider_response: Record<string, any> | null;
    }>;

    const existingLog = typedRecentLogs.find((log) => {
      const response = (log.provider_response as Record<string, any>) || {};
      return response?.idempotency_key === idempotencyKey;
    });

    if (existingLog) {
      // Already processed - return success
      return NextResponse.json({
        success: true,
        message: "Webhook already processed",
        idempotency_key: idempotencyKey,
      });
    }

    // Find order by razorpay_order_id (Phase 3.2: using dedicated column)
    const { data: orderData, error: findError } = await supabase
      .from("orders")
      .select(
        "id, user_id, order_status, payment_status, payment_provider_response, razorpay_order_id, payment_method, paid_at, metadata, created_at"
      )
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (findError || !orderData) {
      // Order not found - log incident
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

    // Type assertion for order
    const order = orderData as {
      id: string;
      user_id: string | null;
      order_status: string;
      payment_status: string;
      payment_provider_response: Record<string, any> | null;
      razorpay_order_id: string | null;
      payment_method: string | null;
      paid_at: string | null;
      metadata: Record<string, any> | null;
      created_at: string;
    };

    // Handle different event types
    switch (event) {
      case "payment.captured":
      case "payment.authorized":
        // Phase 3.2: Idempotency check - if already PAID, ignore duplicate events
        if (order.payment_status === "paid" && order.order_status === "paid") {
          // Check if this is the same payment ID (extra idempotency check)
          const currentResponse =
            (order.payment_provider_response as Record<string, any>) || {};
          if (currentResponse.razorpay_payment_id === razorpayPaymentId) {
            // Already paid with same payment ID - idempotent
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

        // Update order: set payment_status=PAID, order_status=PAID, store payment_method and paid_at
        const currentResponse =
          (order.payment_provider_response as Record<string, any>) || {};
        const updatedResponse = { ...currentResponse };
        updatedResponse.razorpay_payment_id = razorpayPaymentId;
        updatedResponse.razorpay_signature = signature.substring(0, 50); // Store partial signature
        updatedResponse.webhook_received_at = paidAtTimestamp;
        updatedResponse.webhook_event = event;
        updatedResponse.payment_method = paymentMethod;

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            order_status: "paid", // Phase 3.2: Update order_status to PAID (per requirements)
            payment_status: "paid",
            payment_method: paymentMethod, // Phase 3.2: Store payment method
            paid_at: paidAtTimestamp, // Phase 3.2: Store paid_at timestamp
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

        // Write audit log
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

        // FINAL FIX: Trigger shipment creation directly (not via HTTP)
        // Only creates shipment for PAID orders - idempotent
        // Wrapped in try/catch to ensure webhook never fails
        try {
          await createShipmentForPaidOrder(order.id);
        } catch (shipmentError: any) {
          // FINAL FIX: Log error but do NOT break webhook or redirect
          console.error("[WEBHOOK] Shipment creation error (non-fatal):", {
            order_id: order.id,
            error: shipmentError?.message || shipmentError,
          });
          // Order remains PAID even if shipment creation fails
          // Admin can manually retry shipment creation later
        }

        break;

      case "payment.failed":
        // Phase 3.2: Payment failed - update payment_status but DO NOT delete order
        // Order remains in DB with payment_status=FAILED
        
        // Idempotency check: if already failed with same payment ID, ignore
        const failedResponse =
          (order.payment_provider_response as Record<string, any>) || {};
        if (
          order.payment_status === "failed" &&
          failedResponse.razorpay_payment_id === razorpayPaymentId
        ) {
          // Already recorded as failed with same payment ID - idempotent
          return NextResponse.json({
            success: true,
            message: "Payment failure already recorded - duplicate webhook ignored",
          });
        }

        const paymentAttempts = (failedResponse.payment_attempts || 0) + 1;
        failedResponse.razorpay_payment_id = razorpayPaymentId;
        failedResponse.webhook_received_at = new Date().toISOString();
        failedResponse.webhook_event = event;
        failedResponse.failure_reason =
          paymentEntity.error_description || paymentEntity.error_code || "Payment failed";
        failedResponse.payment_attempts = paymentAttempts;

        // Phase 3.2: Update payment_status to FAILED, but keep order in DB
        await supabase
          .from("orders")
          .update({
            payment_status: "failed", // Update payment status only
            payment_provider_response: failedResponse,
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", order.id);

        // Write audit log
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

        // Handle refund
        const refundResponse =
          (order.payment_provider_response as Record<string, any>) || {};
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

        // Write audit log
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

        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
        // Write audit log for unhandled events
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
  } catch (error: any) {
    console.error("Unexpected error in webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
