/**
 * Phase 3.1 — Guest Checkout Order Creation API
 * 
 * POST /api/checkout/create-order
 * 
 * Creates an order BEFORE payment gateway is triggered.
 * Supports both guest and logged-in users.
 * 
 * Key behaviors:
 * - Order is created with status='created', payment_status='pending'
 * - Guest checkout is allowed (no login required)
 * - Customer snapshot is stored in metadata (immutable)
 * - Shipping cost is calculated via Shiprocket but NOT charged to customer
 * - Links to customers table if user is logged in
 * - Order is traceable by order_id and phone number
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { getDefaultWeight } from "@/lib/shipping/config";

// Zod validation schema
const checkoutSchema = z.object({
  // Customer information
  customer: z.object({
    name: z.string().min(1, "Full name is required"),
    phone: z.string().min(10, "Mobile number is required").max(15),
    email: z.string().email().optional().or(z.literal("")),
  }),
  
  // Shipping address
  address: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional().or(z.literal("")),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().length(6, "Pincode must be 6 digits"),
    country: z.string().default("India"),
  }),
  
  // Cart items (SKU-level)
  items: z.array(z.object({
    sku: z.string().min(1),
    product_uid: z.string().min(1),
    name: z.string().min(1),
    size: z.string().min(1),
    quantity: z.number().int().min(1),
    price: z.number().min(0), // Selling price from cart
  })).min(1, "Cart cannot be empty"),
});

type CheckoutInput = z.infer<typeof checkoutSchema>;

// Generate unique order number
function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ZYN-${date}-${random}`;
}

// Format phone number (normalize to 10 digits)
function normalizePhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, remove 91
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // Return last 10 digits
  return digits.slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Validation failed", 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { customer, address, items } = validation.data;
    const normalizedPhone = normalizePhone(customer.phone);

    // Validate phone format (must be exactly 10 digits)
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone format - must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // Validate pincode format (must be exactly 6 digits)
    const cleanPincode = address.pincode.replace(/\D/g, "");
    if (!/^\d{6}$/.test(cleanPincode)) {
      return NextResponse.json(
        { success: false, error: "Invalid pincode format - must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Validate address line1 is not empty
    if (!address.line1 || !address.line1.trim()) {
      return NextResponse.json(
        { success: false, error: "Shipping address line 1 is required" },
        { status: 400 }
      );
    }

    // Check if user is logged in (optional)
    const authSupabase = await createServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    // Service role client for DB operations
    const supabase = createServiceRoleClient();

    // PART 2: Calculate totals and build order items snapshot
    let subtotal = 0;
    const orderItemsSnapshot: Array<{
      sku: string;
      product_uid: string;
      product_name: string;
      size: string;
      quantity: number;
      selling_price: number;
      cost_price: number;
      subtotal: number;
    }> = [];

    // Verify each item and fetch cost price for margin calculation
    for (const item of items) {
      // Fetch variant data (cost price for margin calculation)
      const { data: variant, error: variantError } = await supabase
        .from("product_variants")
        .select("id, sku, price, cost, stock, product_uid")
        .eq("sku", item.sku)
        .single();

      if (variantError || !variant) {
        return NextResponse.json(
          { success: false, error: `Variant ${item.sku} not found` },
          { status: 400 }
        );
      }

      const typedVariant = variant as {
        id: string;
        sku: string;
        price: number | null;
        cost: number | null;
        stock: number | null;
        product_uid: string;
      };

      // NOTE: Per Phase 3.1 requirements, we do NOT deduct inventory here
      // Just validate the item exists and capture price
      
      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;

      orderItemsSnapshot.push({
        sku: item.sku,
        product_uid: item.product_uid,
        product_name: item.name,
        size: item.size,
        quantity: item.quantity,
        selling_price: item.price,
        cost_price: typedVariant.cost || 0,
        subtotal: itemSubtotal,
      });
    }

    // PART 4: Calculate shipping cost (internal only, not charged)
    // Phase 3.4: Use global default weight and dimensions
    const assumedWeight = getDefaultWeight();
    
    // FINAL FIX: Checkout must NOT call Shiprocket - skip rate calculation
    // Shipping cost will be calculated later when order is paid
    const internalShippingCost = 0;
    const shippingResult = { success: false, shipping_cost: 0 };

    // Customer sees FREE shipping, so total_payable = subtotal
    const totalPayable = subtotal;

    // PART 3: Customer handling
    let customerId: string | null = null;

    if (user) {
      // User is logged in - find or create customer record
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_uid", user.id)
        .single();

      if (existingCustomer) {
        customerId = (existingCustomer as { id: string }).id;
      } else {
        // Create customer record for logged-in user
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            auth_uid: user.id,
            email: customer.email || user.email || "",
            first_name: customer.name.split(" ")[0] || "",
            last_name: customer.name.split(" ").slice(1).join(" ") || "",
            phone: normalizedPhone,
          } as any)
          .select("id")
          .single();

        if (newCustomer) {
          customerId = (newCustomer as { id: string }).id;
        }
      }
    }
    // For guests: customerId remains null (per Phase 3.1 requirements)

    // Generate unique order number
    const orderNumber = generateOrderNumber();

    // Build customer snapshot (immutable record for order)
    const customerSnapshot = {
      name: customer.name,
      phone: normalizedPhone,
      email: customer.email || null,
      address: {
        line1: address.line1,
        line2: address.line2 || null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      },
      snapshot_taken_at: new Date().toISOString(),
    };

    // Build metadata with full order context
    const metadata = {
      customer_snapshot: customerSnapshot,
      items_snapshot: orderItemsSnapshot,
      shipping: {
        cost_calculated: internalShippingCost,
        courier_name: null,
        estimated_days: null,
        calculation_success: false,
        note: "Shipping cost will be calculated after payment",
      },
      checkout_source: user ? "logged_in" : "guest",
    };

    // PART 2: Create the order record
    // Initial state: order_status='created', payment_status='pending'
    // Include shipping address fields directly in order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId, // Nullable for guests
        user_id: null, // Not using legacy user_id
        guest_phone: !user ? normalizedPhone : null, // For guest order tracking
        guest_email: !user ? (customer.email || null) : null,
        order_status: "created",
        payment_status: "pending",
        shipping_status: "pending",
        currency: "INR",
        subtotal: subtotal,
        shipping_fee: 0, // Free shipping for customers
        internal_shipping_cost: internalShippingCost, // What we pay to carrier
        assumed_weight: assumedWeight, // Phase 3.4: Global default weight (1.5 kg)
        tax_amount: 0,
        discount_amount: 0,
        total_amount: totalPayable,
        payment_provider: "razorpay",
        // Shipping address fields - stored directly in order record
        shipping_name: customer.name,
        shipping_phone: normalizedPhone,
        shipping_email: customer.email || null,
        shipping_address1: address.line1,
        shipping_address2: address.line2 || null,
        shipping_city: address.city,
        shipping_state: address.state,
        shipping_pincode: cleanPincode,
        shipping_country: address.country || "India",
        metadata: metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .select()
      .single();

    if (orderError || !order) {
      console.error("[CHECKOUT] Order creation failed:", orderError);
      return NextResponse.json(
        { success: false, error: "Failed to create order", details: orderError?.message },
        { status: 500 }
      );
    }

    const typedOrder = order as { id: string; order_number: string };

    // PART 3.2: Create Razorpay order server-side
    let razorpayOrderId: string | null = null;
    try {
      // Convert amount to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(totalPayable * 100);
      
      // Minimum amount check (Razorpay requires at least 1 INR = 100 paise)
      if (amountInPaise < 100) {
        console.warn("[CHECKOUT] Amount too small for Razorpay:", amountInPaise);
        // Still create order, but skip Razorpay order creation
      } else {
        // Create Razorpay order
        const razorpayOrder = await createRazorpayOrder(
          amountInPaise,
          "INR",
          typedOrder.order_number, // Receipt ID
          {
            order_id: typedOrder.id,
            order_number: typedOrder.order_number,
            customer_name: customer.name,
            customer_phone: normalizedPhone,
          }
        );

        razorpayOrderId = razorpayOrder.id;

        // Update order with Razorpay order ID
        const { error: razorpayUpdateError } = await supabase
          .from("orders")
          .update({
            razorpay_order_id: razorpayOrderId,
            payment_provider: "razorpay",
            payment_status: "pending",
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", typedOrder.id);

        if (razorpayUpdateError) {
          console.error("[CHECKOUT] Failed to update order with Razorpay ID:", razorpayUpdateError);
          // Don't fail the order creation, but log the error
        }
      }
    } catch (razorpayError: any) {
      console.error("[CHECKOUT] Razorpay order creation failed:", razorpayError);
      // Per Phase 3.2 requirements: Order must remain in DB even if Razorpay fails
      // We'll still return success, but without razorpay_order_id
      // Frontend can handle this case
    }

    // Create order_items records (normalized)
    const orderItemsForDb = orderItemsSnapshot.map((item) => ({
      order_id: typedOrder.id,
      product_uid: item.product_uid,
      sku: item.sku,
      name: item.product_name,
      quantity: item.quantity,
      price: item.selling_price,
      cost_price: item.cost_price,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsForDb as unknown as never);

    if (itemsError) {
      console.error("[CHECKOUT] Order items creation failed:", itemsError);
      // Don't fail the order, just log
    }

    // Log for analytics/audit
    console.log("[CHECKOUT] Order created successfully:", {
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      customer_type: user ? "logged_in" : "guest",
      customer_id: customerId,
      phone: normalizedPhone,
      subtotal,
      internal_shipping_cost: internalShippingCost,
      total_payable: totalPayable,
    });

    // Return success with order details (Phase 3.2)
    // Includes Razorpay order ID for frontend checkout
    return NextResponse.json({
      success: true,
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      subtotal: subtotal,
      shipping_fee: 0, // Free for customer
      total_payable: totalPayable,
      payment_gateway: "razorpay",
      razorpay_order_id: razorpayOrderId || undefined,
      razorpay_key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || undefined,
      created_at: new Date().toISOString(),
      // For frontend to proceed to payment
      next_step: razorpayOrderId ? "proceed_to_payment" : "payment_error",
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CHECKOUT] Unexpected error:", {
      route: "/api/checkout/create-order",
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { success: false, error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

