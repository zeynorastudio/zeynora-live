import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { z } from "zod";

// Request body schema
const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().optional(),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().optional(),
  credits_only: z.boolean().optional(),
  order_id: z.string().optional(), // For credits-only orders
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = verifyPaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      credits_only,
      order_id,
    } = validation.data;

    const supabase = createServiceRoleClient();

    // Handle credits-only orders
    if (credits_only && order_id) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, user_id, order_number, payment_status, payment_provider_response, total_amount")
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      const typedOrder = order as {
        id: string;
        user_id: string | null;
        order_number: string;
        payment_status: string;
        payment_provider_response: Record<string, any> | null;
        total_amount: number | null;
      };

      if (typedOrder.payment_status === "paid") {
        return NextResponse.json({
          success: true,
          message: "Order already paid",
        });
      }

      const paymentResponse = (typedOrder.payment_provider_response as Record<string, any>) || {};
      const creditsApplied = paymentResponse.credits_applied || 0;

      if (creditsApplied <= 0) {
        return NextResponse.json(
          { error: "No credits applied to this order" },
          { status: 400 }
        );
      }

      // Deduct credits
      if (typedOrder.user_id) {
        const { deductCredits } = await import("@/lib/wallet");
        try {
          await deductCredits(
            typedOrder.user_id,
            creditsApplied,
            typedOrder.id,
            `Payment for order ${typedOrder.order_number || typedOrder.id}`,
            null
          );
        } catch (creditError: unknown) {
          const errorMessage = creditError instanceof Error ? creditError.message : "Unknown error";
          console.error("[PAYMENT_VERIFY] Failed to deduct credits (credits-only order):", {
            order_id: typedOrder.id,
            order_number: typedOrder.order_number,
            user_id: typedOrder.user_id,
            credits_applied: creditsApplied,
            error: errorMessage,
          });
          return NextResponse.json(
            { error: `Failed to deduct credits: ${errorMessage}` },
            { status: 500 }
          );
        }
      }

      // Update order status
      paymentResponse.credits_applied = creditsApplied;
      paymentResponse.credits_deducted_at = new Date().toISOString();
      paymentResponse.credits_locked = false;

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          payment_provider_response: paymentResponse,
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", typedOrder.id);

      if (updateError) {
        console.error("[PAYMENT_VERIFY] Error updating order (credits-only):", {
          order_id: typedOrder.id,
          order_number: typedOrder.order_number,
          error: updateError.message,
        });
        return NextResponse.json(
          { error: "Failed to update order", details: updateError.message },
          { status: 500 }
        );
      }

      // Send order confirmation email for credits-only orders (non-blocking)
      try {
        const { sendOrderConfirmationEmail } = await import("@/lib/email/order-confirmation");
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

      return NextResponse.json({
        success: true,
        message: "Order paid with credits successfully",
      });
    }

    // Regular Razorpay payment verification
    if (!razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Payment details required for Razorpay verification" },
        { status: 400 }
      );
    }

    // Verify signature
    let isValidSignature = false;
    try {
      isValidSignature = verifyPaymentSignature(
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      );
    } catch (hashError: unknown) {
      const errorMessage = hashError instanceof Error ? hashError.message : "Unknown error";
      console.error("[PAYMENT_VERIFY] Signature verification error:", {
        razorpay_order_id,
        error: errorMessage,
      });
      return NextResponse.json(
        { error: "Signature verification failed", details: errorMessage },
        { status: 500 }
      );
    }

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Find order by razorpay_order_id
    const { data: orders, error: findError } = await supabase
      .from("orders")
      .select("id, user_id, order_number, payment_status, payment_provider_response")
      .eq("payment_provider", "razorpay")
      .in("payment_status", ["pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (findError) {
      console.error("[PAYMENT_VERIFY] Error finding order:", {
        razorpay_order_id,
        error: findError.message,
      });
      return NextResponse.json(
        { error: "Failed to find order", details: findError.message },
        { status: 500 }
      );
    }

    // Type assertion for orders
    const typedOrders = (orders || []) as Array<{
      id: string;
      user_id: string | null;
      order_number: string;
      payment_status: string;
      payment_provider_response: Record<string, any> | null;
    }>;

    // Filter by razorpay_order_id from JSONB
    const order = typedOrders.find((o) => {
      const response = (o.payment_provider_response as Record<string, any>) || {};
      return response?.razorpay_order_id === razorpay_order_id;
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if already paid
    if (order.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
      });
    }

    // Update order status and deduct credits if applied
    const paymentProviderResponse =
      (order.payment_provider_response as Record<string, any>) || {};
    paymentProviderResponse.razorpay_payment_id = razorpay_payment_id;
    paymentProviderResponse.razorpay_signature = razorpay_signature;
    paymentProviderResponse.verified_at = new Date().toISOString();

    // Deduct credits if they were applied
    const creditsApplied = paymentProviderResponse.credits_applied || 0;
    if (creditsApplied > 0 && order.user_id) {
      const { deductCredits } = await import("@/lib/wallet");
      try {
        await deductCredits(
          order.user_id,
          creditsApplied,
          order.id,
          `Payment for order ${order.order_number || order.id}`,
          null
        );
        paymentProviderResponse.credits_deducted_at = new Date().toISOString();
        paymentProviderResponse.credits_locked = false;
      } catch (creditError: unknown) {
        const errorMessage = creditError instanceof Error ? creditError.message : "Unknown error";
        console.error("[PAYMENT_VERIFY] Failed to deduct credits:", {
          order_id: order.id,
          order_number: order.order_number,
          user_id: order.user_id,
          credits_applied: creditsApplied,
          error: errorMessage,
        });
        // Don't fail the payment, but log the error for manual review
      }
    }

    // Decrement variant stock atomically on order completion
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("[PAYMENT_VERIFY] Failed to fetch order items:", {
        order_id: order.id,
        order_number: order.order_number,
        error: itemsError.message,
      });
    }

    const typedOrderItems = (orderItems || []) as Array<{
      variant_id: string | null;
      quantity: number;
    }>;

    if (typedOrderItems.length > 0) {
      for (const item of typedOrderItems) {
        if (item.variant_id && item.quantity) {
          // Use RPC function ONLY for atomic stock decrement - NO FALLBACK
          const { error: rpcError } = await supabase.rpc("decrement_stock", {
            variant_id_in: item.variant_id,
            qty_in: item.quantity,
          } as unknown as Record<string, never>);

          if (rpcError) {
            // Log critical error with full context - DO NOT use fallback
            console.error("[CRITICAL] Stock decrement RPC failed:", {
              order_id: order.id,
              order_number: order.order_number,
              user_id: order.user_id,
              variant_id: item.variant_id,
              quantity: item.quantity,
              error: rpcError.message,
              hint: "Order will be marked paid but stock may need manual adjustment",
            });

            // Write to audit log for visibility
            await supabase.from("admin_audit_logs").insert({
              action: "stock_decrement_failed",
              target_resource: "product_variants",
              target_id: item.variant_id,
              details: {
                order_id: order.id,
                order_number: order.order_number,
                quantity: item.quantity,
                error: rpcError.message,
                requires_manual_intervention: true,
              },
            } as unknown as never);
          }
        }
      }
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_provider_response: paymentProviderResponse,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", order.id);

    if (updateError) {
      console.error("[PAYMENT_VERIFY] Error updating order after payment:", {
        order_id: order.id,
        order_number: order.order_number,
        error: updateError.message,
      });
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
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        signature: razorpay_signature,
      },
      status: "paid",
    } as unknown as never);

    // Send order confirmation email (non-blocking)
    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/email/order-confirmation");
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

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[PAYMENT_VERIFY] Unexpected error:", {
      route: "/api/payments/verify",
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
