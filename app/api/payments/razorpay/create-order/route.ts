import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getRazorpay } from "@/lib/razorpay/client";
import { z } from "zod";

// Request body schema
const createRazorpayOrderSchema = z.object({
  items: z.array(
    z.object({
      variant_id: z.string().uuid(), // product_variants.id
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
});

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ZYN-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createRazorpayOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { items, customer, address } = validation.data;
    const supabase = await createServerClient();

    // Fetch variant prices and compute total
    let totalAmount = 0;
    const verifiedItems: Array<{
      variant_id: string;
      variant_sku: string;
      product_uid: string;
      quantity: number;
      price: number | null;
    }> = [];

    for (const item of items) {
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("id, price, stock, product_uid, sku")
        .eq("id", item.variant_id)
        .single();

      if (variantError || !variant) {
        return NextResponse.json(
          { error: `Variant ${item.variant_id} not found` },
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
          { error: `Insufficient stock for variant ${item.variant_id}` },
          { status: 400 }
        );
      }

      // Use variant price if available, otherwise fallback to product price
      const variantPrice = typedVariant.price;
      if (variantPrice === null || variantPrice <= 0) {
        // Fetch product base price as fallback
        const { data: product } = await supabase
          .from("products")
          .select("price")
          .eq("uid", typedVariant.product_uid)
          .single();

        const typedProduct = product as { price: number } | null;
        if (!typedProduct || !typedProduct.price || typedProduct.price <= 0) {
          return NextResponse.json(
            { error: `No valid price found for variant ${item.variant_id}` },
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

    // Convert to paise (Razorpay amount is in smallest currency unit)
    const amountInPaise = Math.round(totalAmount * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: "Minimum order amount is ₹1.00" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create Razorpay order
    const razorpay = getRazorpay();
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: orderNumber,
        notes: {
          order_number: orderNumber,
          customer_email: customer.email,
        },
      });
    } catch (razorpayError: any) {
      console.error("Razorpay order creation failed:", razorpayError);
      return NextResponse.json(
        { error: "Failed to create Razorpay order", details: razorpayError.message },
        { status: 500 }
      );
    }

    // Save pending order in Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        payment_provider: "razorpay",
        payment_status: "pending",
        currency: "INR",
        subtotal: totalAmount,
        shipping_fee: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: totalAmount,
        payment_provider_response: {
          razorpay_order_id: razorpayOrder.id,
        },
        metadata: {
          customer_name: customer.name,
          email: customer.email,
          phone: customer.phone,
          shipping_address: address,
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

    const typedOrder = order as { id: string };

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
        // Order is created but items failed - log but don't fail the request
        // In production, consider rolling back the order
      }
    }

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: amountInPaise,
      order_number: orderNumber,
      currency: "INR",
    });
  } catch (error: any) {
    console.error("Unexpected error in create-order:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
