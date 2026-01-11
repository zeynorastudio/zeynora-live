import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { z } from "zod";

// Request body schema
const createOrderSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().min(1),
    })
  ),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
  }),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    country: z.string().default("India"),
  }),
  shipping_fee: z.number().min(0).optional(),
  estimated_delivery: z.object({
    min_days: z.number(),
    max_days: z.number(),
  }).optional(),
  credits_applied: z.number().min(0).optional(),
});

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ZYN-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { items, customer, address, shipping_fee, estimated_delivery, credits_applied } = validation.data;
    
    // Verify session using auth-aware client
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user record from users table
    const { data: userRecord } = await authSupabase
      .from("users")
      .select("id")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as { id: string } | null;

    // Use service role client for DB operations
    const supabase = createServiceRoleClient();

    // Calculate order total and verify items
    let totalAmount = 0;
    const verifiedItems: Array<{
      variant_id: string;
      variant_sku: string;
      product_uid: string;
      quantity: number;
      price: number;
    }> = [];

    for (const item of items) {
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("id, price, stock, product_uid, sku")
        .eq("sku", item.sku)
        .single();

      if (variantError || !variant) {
        return NextResponse.json(
          { error: `Variant with SKU ${item.sku} not found` },
          { status: 400 }
        );
      }

      const typedVariant = variant as {
        id: string;
        price: number | null;
        stock: number | null;
        product_uid: string;
        sku: string;
      };

      // Check stock availability
      if (typedVariant.stock === null || typedVariant.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for SKU ${item.sku}` },
          { status: 400 }
        );
      }

      // Use variant price if available, otherwise fallback to product price
      const variantPrice = typedVariant.price;
      if (variantPrice === null || variantPrice <= 0) {
        const { data: product } = await supabase
          .from("products")
          .select("price")
          .eq("uid", typedVariant.product_uid)
          .single();

        const typedProduct = product as { price: number } | null;
        if (!typedProduct || !typedProduct.price || typedProduct.price <= 0) {
          return NextResponse.json(
            { error: `No valid price found for SKU ${item.sku}` },
            { status: 400 }
          );
        }
        totalAmount += typedProduct.price * item.quantity;
        verifiedItems.push({
          variant_id: typedVariant.id,
          variant_sku: typedVariant.sku,
          product_uid: typedVariant.product_uid,
          quantity: item.quantity,
          price: typedProduct.price,
        });
      } else {
        totalAmount += variantPrice * item.quantity;
        verifiedItems.push({
          variant_id: typedVariant.id,
          variant_sku: typedVariant.sku,
          product_uid: typedVariant.product_uid,
          quantity: item.quantity,
          price: variantPrice,
        });
      }
    }

    // Add shipping fee to total
    const finalShippingFee = shipping_fee || 0;
    const appliedCredits = credits_applied || 0;
    const finalTotal = Math.max(0, totalAmount + finalShippingFee - appliedCredits);

    // If credits cover full amount, we still need to create order but no Razorpay order
    const needsRazorpay = finalTotal > 0;

    // Convert to paise (only if Razorpay needed)
    const amountInPaise = needsRazorpay ? Math.round(finalTotal * 100) : 0;

    if (needsRazorpay && amountInPaise < 100) {
      return NextResponse.json(
        { error: "Minimum order amount after credits is ₹1.00" },
        { status: 400 }
      );
    }

    // If credits are applied, validate and lock them
    if (appliedCredits > 0 && typedUserRecord) {
      const { getBalance, deductCredits } = await import("@/lib/wallet");
      
      try {
        const balance = await getBalance(typedUserRecord.id);
        if (balance.balance < appliedCredits) {
          return NextResponse.json(
            { error: `Insufficient credits. Available: ₹${balance.balance}` },
            { status: 400 }
          );
        }
        // Credits will be deducted after payment success (or restored on failure)
        // For now, we just validate
      } catch (error: any) {
        return NextResponse.json(
          { error: `Failed to validate credits: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Set pending expiration TTL
    const ttlMinutes = parseInt(
      process.env.PAYMENT_PENDING_TTL_MINUTES || "30",
      10
    );
    const pendingExpiresAt = new Date();
    pendingExpiresAt.setMinutes(pendingExpiresAt.getMinutes() + ttlMinutes);

    // Validate pincode serviceability before creating order
    const { checkServiceability } = await import("@/lib/shipping/serviceability");
    const serviceabilityResult = await checkServiceability(address.pincode);

    if (!serviceabilityResult.serviceable) {
      return NextResponse.json(
        {
          error: "Shipping not available to this pincode",
          details: serviceabilityResult.reason || "Pincode not serviceable",
        },
        { status: 400 }
      );
    }

    // Create local DB order (pending)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: typedUserRecord?.id || null,
        payment_provider: "razorpay",
        payment_status: "pending",
        currency: "INR",
        subtotal: totalAmount,
        shipping_fee: finalShippingFee,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: finalTotal,
        payment_provider_response: {
          payment_attempts: 0,
          pending_expires_at: pendingExpiresAt.toISOString(),
        },
        metadata: {
          customer_name: customer.name,
          email: customer.email,
          phone: customer.phone,
          shipping_address: address,
          address_snapshot: {
            recipient_name: customer.name,
            phone: customer.phone,
            address_line_1: address.line1,
            address_line_2: address.line2 || null,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country,
            snapshot_taken_at: new Date().toISOString(),
          },
          shipping: {
            estimated_delivery: estimated_delivery || null,
            serviceability_checked: true,
            available_couriers: serviceabilityResult.available_couriers || [],
          },
        },
      } as unknown as never)
      .select()
      .single();

    if (orderError || !order) {
      console.error("Failed to save order:", orderError);
      return NextResponse.json(
        { error: "Failed to save order", details: orderError?.message },
        { status: 500 }
      );
    }

    const typedOrder = order as {
      id: string;
      payment_provider_response: Record<string, any> | null;
    };

    // Create Razorpay order only if needed
    let razorpayOrder = null;
    if (needsRazorpay) {
      try {
        razorpayOrder = await createRazorpayOrder(
          amountInPaise,
          "INR",
          orderNumber,
          {
            order_number: orderNumber,
            customer_email: customer.email,
            order_id: typedOrder.id,
          }
        );
      } catch (razorpayError: any) {
        console.error("Razorpay order creation failed:", razorpayError);
        // Rollback DB order
        await supabase.from("orders").delete().eq("id", typedOrder.id);
        return NextResponse.json(
          { error: "Failed to create Razorpay order", details: razorpayError.message },
          { status: 500 }
        );
      }
    }

    // Save razorpay_order_id and credits info (merge with existing payment_provider_response)
    const currentResponse = (typedOrder.payment_provider_response as Record<string, any>) || {};
    const updateData: any = {
      payment_provider_response: {
        ...currentResponse,
        credits_applied: appliedCredits,
        credits_locked: appliedCredits > 0,
      },
    };

    if (razorpayOrder) {
      updateData.payment_provider_response.razorpay_order_id = razorpayOrder.id;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData as unknown as never)
      .eq("id", typedOrder.id);

    if (updateError) {
      console.error("Failed to update order with Razorpay ID:", updateError);
      // Don't fail the request, but log the error
    }

    // Create order items
    if (verifiedItems.length > 0) {
      const orderItems = verifiedItems.map((item) => ({
        order_id: typedOrder.id,
        product_uid: item.product_uid,
        variant_id: item.variant_id,
        sku: item.variant_sku,
        quantity: item.quantity,
        price: item.price || 0,
        subtotal: (item.price || 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems as unknown as never);

      if (itemsError) {
        console.error("Failed to save order items:", itemsError);
        // Log but don't fail - order is created
      }
    }

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder?.id || "credits_only", // Razorpay order ID or placeholder
      db_order_id: typedOrder.id, // Database order ID
      order_number: orderNumber,
      amount: amountInPaise,
      currency: "INR",
      key_id: needsRazorpay ? (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID) : null,
      credits_applied: appliedCredits,
      credits_only: !needsRazorpay,
    });
  } catch (error: any) {
    console.error("Unexpected error in create-order:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
