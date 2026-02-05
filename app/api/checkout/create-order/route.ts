/**
 * Phase 3.1 — Checkout Order Creation API (ARCHITECTURAL RESET)
 * 
 * POST /api/checkout/create-order
 * 
 * DETERMINISTIC PAYMENT FLOW:
 * 1. Validate stock (read-only) → 409 if insufficient
 * 2. Create Razorpay order FIRST → 500 if fails
 * 3. Create DB order WITH razorpay_order_id (single insert)
 * 
 * INVARIANT: No DB order exists without razorpay_order_id
 * 
 * Key behaviors:
 * - Guest and logged-in users follow SAME backend flow
 * - Order is created with status='created', payment_status='pending'
 * - Razorpay order is ALWAYS created before DB order
 * - Customer snapshot is stored in metadata (immutable)
 * - Links to customers table if user is logged in
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import Razorpay from "razorpay";
import { getDefaultWeight } from "@/lib/shipping/config";

// Zod validation schema - ALL fields required for order creation
const checkoutSchema = z.object({
  // Customer information - REQUIRED (no validate_only mode)
  customer: z.object({
    name: z.string().min(1, "Full name is required"),
    phone: z.string().min(10, "Mobile number is required").max(15),
    email: z.string().email().optional().or(z.literal("")),
  }),
  
  // Shipping address - REQUIRED (no validate_only mode)
  address: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional().or(z.literal("")),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().length(6, "Pincode must be 6 digits"),
    country: z.string().default("India"),
  }),
  
  // Cart items (SKU-level) - REQUIRED
  items: z.array(z.object({
    sku: z.string().min(1),
    product_uid: z.string().min(1),
    name: z.string().min(1),
    size: z.string().min(1),
    quantity: z.number().int().min(1),
    price: z.number().min(0), // Selling price from cart
  })).min(1, "Cart cannot be empty"),
  
  // Optional: Customer ID from OTP-verified checkout
  customer_id: z.string().uuid().optional(),
  
  // Optional: Guest session ID for guest checkout
  guest_session_id: z.string().optional(),
  
  // Optional: Checkout source for tracking
  checkout_source: z.enum(["otp_verified", "guest", "direct", "logged_in"]).optional(),
});

type CheckoutInput = z.infer<typeof checkoutSchema>;

// Stock validation error types
type StockValidationReason = "INSUFFICIENT_STOCK" | "VARIANT_NOT_FOUND";

interface StockValidationError {
  sku: string;
  requested_quantity: number;
  available_quantity: number;
  reason: StockValidationReason;
}

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

    const { customer, address, items, customer_id: providedCustomerId, guest_session_id, checkout_source } = validation.data;
    
    console.log("[FLOW] Order creation started - single deterministic flow");
    
    // Service role client for DB operations
    const supabase = createServiceRoleClient();

    // PART 1: Stock validation (read-only, no mutations)
    // STRICT DETERMINISTIC VALIDATION - Fail-fast BEFORE authentication and order creation
    
    // Step 1: Extract SKUs from cart
    const skus = items.map(i => i.sku);
    
    // Step 2: Fetch variants from database (fetch full data for reuse in order creation)
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, sku, stock, price, cost, product_uid")
      .in("sku", skus);

    if (variantsError) {
      return NextResponse.json(
        { success: false, error: "Failed to validate stock", details: variantsError.message },
        { status: 500 }
      );
    }

    // Type definition for variant data
    type VariantData = {
      id: string;
      sku: string;
      price: number | null;
      cost: number | null;
      stock: number | null;
      product_uid: string;
    };

    const typedVariants = (variants || []) as VariantData[];

    // Step 3A: HARD VALIDATION - Check if all SKUs exist
    // Get unique SKUs to compare count (handles duplicate SKUs in cart)
    const uniqueSkus = Array.from(new Set(skus));
    
    if (typedVariants.length !== uniqueSkus.length) {
      // Find missing SKUs
      const foundSkus = new Set(typedVariants.map(v => v.sku));
      const missingSkus = uniqueSkus.filter(sku => !foundSkus.has(sku));
      
      const errors: StockValidationError[] = missingSkus.map(sku => {
        // Aggregate quantity for this SKU across all cart items
        const totalQuantity = items
          .filter(item => item.sku === sku)
          .reduce((sum, item) => sum + item.quantity, 0);
        
        return {
          sku,
          requested_quantity: totalQuantity,
          available_quantity: 0,
          reason: "VARIANT_NOT_FOUND",
        };
      });
      
      return NextResponse.json(
        {
          success: false,
          error: "Stock validation failed",
          invalid_items: errors,
        },
        { status: 409 }
      );
    }

    // Step 3B: Build Map<string, number> of sku → stock
    const stockMap = new Map<string, number>();
    for (const variant of typedVariants) {
      // Treat null stock as 0
      const stock = variant.stock ?? 0;
      stockMap.set(variant.sku, stock);
    }

    // Step 3C: Validate each unique SKU (aggregate quantities for duplicates)
    const errors: StockValidationError[] = [];
    
    for (const sku of uniqueSkus) {
      // Aggregate requested quantity for this SKU (handles duplicate SKUs in cart)
      const requestedQuantity = items
        .filter(item => item.sku === sku)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const stock = stockMap.get(sku) ?? 0; // Should never be undefined, but safe fallback
      
      // Fail if requested quantity exceeds available stock
      if (requestedQuantity > stock) {
        errors.push({
          sku,
          requested_quantity: requestedQuantity,
          available_quantity: stock,
          reason: "INSUFFICIENT_STOCK",
        });
      }
    }

    // Step 4: If any errors exist, return 409 immediately
    // NO order creation, NO Razorpay call when stock is insufficient
    if (errors.length > 0) {
      console.log("[FLOW] Stock validation FAILED - blocking checkout");
      return NextResponse.json(
        {
          success: false,
          error: "Stock validation failed",
          invalid_items: errors,
        },
        { status: 409 }
      );
    }
    
    console.log("[FLOW] Stock validated");

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

    // Step 7: All validations passed - continue with order creation
    // Create variant map for order creation (reuse data from validation)
    const variantMap = new Map<string, VariantData>();
    for (const variant of typedVariants) {
      variantMap.set(variant.sku, {
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        cost: variant.cost,
        stock: variant.stock,
        product_uid: variant.product_uid,
      });
    }

    // PART 2: Calculate totals and build order items snapshot
    // All items are valid, proceed with order creation
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

    // Build order items snapshot (all variants are already validated and fetched)
    for (const item of items) {
      const variant = variantMap.get(item.sku);
      
      // This should never happen since we validated above, but TypeScript needs this check
      if (!variant) {
        return NextResponse.json(
          { success: false, error: `Variant ${item.sku} not found` },
          { status: 400 }
        );
      }

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
        cost_price: variant.cost || 0,
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
    // Priority: 1) Provided customer_id (OTP-verified), 2) Logged-in user, 3) Guest
    let customerId: string | null = null;
    let resolvedGuestSessionId: string | null = guest_session_id || null;
    let checkoutSourceType = checkout_source || "direct";

    if (providedCustomerId) {
      // Customer ID provided from OTP-verified checkout
      // Verify the customer exists
      const { data: verifiedCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("id", providedCustomerId)
        .single();

      if (verifiedCustomer) {
        customerId = providedCustomerId;
        checkoutSourceType = "otp_verified";
      }
    } else if (user) {
      // User is logged in via Supabase Auth - find or create customer record
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_uid", user.id)
        .single();

      if (existingCustomer) {
        customerId = (existingCustomer as { id: string }).id;
        checkoutSourceType = "logged_in";
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
          } as unknown as never)
          .select("id")
          .single();

        if (newCustomer) {
          customerId = (newCustomer as { id: string }).id;
          checkoutSourceType = "logged_in";
        }
      }
    }
    // For guests: customerId remains null, guest_session_id is used for tracking

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
      checkout_source: checkoutSourceType,
      guest_session_id: resolvedGuestSessionId,
    };

    // =========================================================================
    // ARCHITECTURAL INVARIANT: Razorpay order MUST be created BEFORE DB order
    // This guarantees no orphan orders exist without payment capability
    // =========================================================================
    
    // STEP 1: Validate amount before calling Razorpay
    const amountInPaise = Math.round(totalPayable * 100);
    
    if (amountInPaise < 100) {
      console.error("[FLOW] Amount too small for payment:", amountInPaise, "paise");
      return NextResponse.json(
        {
          success: false,
          error: "Order amount is too small for payment processing"
        },
        { status: 400 }
      );
    }

    // STEP 2: Create Razorpay order FIRST (before any DB mutation)
    // If this fails, we return 500 immediately - NO database order is created
    let razorpayOrderId: string;
    
    try {
      console.log("[FLOW] Creating Razorpay order FIRST (amount:", totalPayable, "INR)");

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: orderNumber, // Use order_number as receipt (generated earlier)
        notes: {
          order_number: orderNumber,
          customer_name: customer.name,
          customer_phone: normalizedPhone,
        },
      });

      if (!razorpayOrder || !razorpayOrder.id) {
        console.error("[FLOW] Razorpay returned invalid response:", razorpayOrder);
        throw new Error("Invalid Razorpay response - missing order ID");
      }

      razorpayOrderId = razorpayOrder.id;
      console.log("[FLOW] Razorpay order created:", razorpayOrderId);

    } catch (err) {
      console.error("[FLOW] Razorpay order creation FAILED:", err);
      // NO database rollback needed - we never created a DB order
      return NextResponse.json(
        {
          success: false,
          error: "Payment gateway initialization failed"
        },
        { status: 500 }
      );
    }

    // STEP 3: Create DB order WITH razorpay_order_id in single atomic insert
    // INVARIANT: Every order in DB has a valid razorpay_order_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        razorpay_order_id: razorpayOrderId, // CRITICAL: Set in initial insert
        customer_id: customerId,
        user_id: null,
        guest_phone: !customerId ? normalizedPhone : null,
        guest_email: !customerId ? (customer.email || null) : null,
        order_status: "created",
        payment_status: "pending",
        shipping_status: "pending",
        currency: "INR",
        subtotal: subtotal,
        shipping_fee: 0,
        internal_shipping_cost: internalShippingCost,
        assumed_weight: assumedWeight,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: totalPayable,
        payment_provider: "razorpay",
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
      console.error("[FLOW] DB order creation failed:", orderError);
      // Note: Razorpay order exists but DB order failed
      // This is acceptable - Razorpay order will expire and no webhook will fire
      return NextResponse.json(
        { success: false, error: "Failed to create order", details: orderError?.message },
        { status: 500 }
      );
    }

    const typedOrder = order as { id: string; order_number: string };
    console.log("[FLOW] Order persisted with Razorpay ID");

    // STEP 4: Create order_items records
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
      console.error("[FLOW] Order items creation failed (non-fatal):", itemsError);
    }

    // Log successful order creation
    console.log("[FLOW] Order creation complete:", {
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      razorpay_order_id: razorpayOrderId,
      customer_type: customerId ? "verified" : "guest",
      total_payable: totalPayable,
    });

    // Return success with all required fields for Razorpay popup
    return NextResponse.json({
      success: true,
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      subtotal: subtotal,
      shipping_fee: 0,
      total_payable: totalPayable,
      payment_gateway: "razorpay",
      razorpay_order_id: razorpayOrderId,
      razorpay_key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || undefined,
      created_at: new Date().toISOString(),
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

