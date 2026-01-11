import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyRazorpaySignature } from "@/lib/payments/hash";
import { z } from "zod";

// Request body schema
const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
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
    } = validation.data;

    // Verify signature
    let isValidSignature = false;
    try {
      isValidSignature = verifyRazorpaySignature(
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature
      );
    } catch (hashError: any) {
      console.error("Signature verification error:", hashError);
      return NextResponse.json(
        { error: "Signature verification failed", details: hashError.message },
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
    // Note: Supabase JS client doesn't directly support JSONB field queries,
    // so we query pending razorpay orders and filter in memory
    const supabase = await createServerClient();
    const { data: orders, error: findError } = await supabase
      .from("orders")
      .select("id, payment_status, payment_provider_response")
      .eq("payment_provider", "razorpay")
      .in("payment_status", ["pending", "failed"]) // Only check pending/failed orders
      .order("created_at", { ascending: false })
      .limit(50); // Reasonable limit for recent orders

    if (findError) {
      console.error("Error finding order:", findError);
      return NextResponse.json(
        { error: "Failed to find order", details: findError.message },
        { status: 500 }
      );
    }

    // Type assertion for orders
    const typedOrders = (orders || []) as Array<{
      id: string;
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

    // Update order status
    const paymentProviderResponse =
      (order.payment_provider_response as Record<string, any>) || {};
    paymentProviderResponse.razorpay_payment_id = razorpay_payment_id;

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_provider_response: paymentProviderResponse,
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return NextResponse.json(
        { error: "Failed to update order", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    console.error("Unexpected error in verify:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
