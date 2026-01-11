import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";

// Zod Schema
const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
    address: z.object({
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
      country: z.string().default("India"),
    }),
  }),
  items: z.array(z.object({
    product_uid: z.string(),
    variant_sku: z.string(),
    qty: z.number().min(1),
    price: z.number(), // Price at time of purchase
  })),
  payment_provider: z.string().optional(),
  payment_status: z.enum(["pending", "paid", "failed"]).default("pending"),
  payment_intent_id: z.string().optional(),
});

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ZYN-${date}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const { customer, items, payment_provider, payment_status, payment_intent_id } = validation.data;
    const supabase = createServiceRoleClient();

    // 1. Calculate Totals & Verify Stock
    let subtotal = 0;
    let totalCost = 0;
    const verifiedItems: Array<{
      product_uid: string;
      variant_sku: string;
      qty: number;
      price: number;
      cost: number;
    }> = [];

    // Fetch variant data to verify price/cost and check stock
    // Using a loop for Phase 4.9 simplicity; in prod, bulk fetch recommended.
    for (const item of items) {
      const { data: variant, error } = await supabase
        .from("product_variants")
        .select("stock, price, cost")
        .eq("sku", item.variant_sku)
        .single();

      if (error || !variant) {
        return NextResponse.json({ error: `Variant ${item.variant_sku} not found` }, { status: 400 });
      }

      const typedVariant = variant as {
        stock: number | null;
        price: number | null;
        cost: number | null;
      };

      if ((typedVariant.stock || 0) < item.qty) {
        return NextResponse.json({ error: `Insufficient stock for ${item.variant_sku}` }, { status: 400 });
      }

      const itemTotal = item.qty * item.price; // Use cart price, but could verify against DB price
      subtotal += itemTotal;
      totalCost += (typedVariant.cost || 0) * item.qty;

      verifiedItems.push({
        ...item,
        cost: typedVariant.cost || 0
      });
    }

    // 2. Reduce Stock atomically using RPC - NO FALLBACK
    // Stock is decremented at order creation (before payment)
    // This reserves stock for the order
    for (const item of verifiedItems) {
      const { error: stockError } = await supabase.rpc("decrement_stock_by_sku", { 
        sku_in: item.variant_sku, 
        qty_in: item.qty 
      } as unknown as Record<string, never>);
      
      if (stockError) {
        // Log critical error - DO NOT use fallback (race condition risk)
        console.error("[ORDER_CREATE] Stock decrement RPC failed:", {
          variant_sku: item.variant_sku,
          quantity: item.qty,
          error: stockError.message,
          hint: "Order creation will proceed but stock may need manual adjustment",
        });
        
        // Write to audit log for visibility
        await supabase.from("admin_audit_logs").insert({
          action: "stock_decrement_failed",
          target_resource: "product_variants",
          target_id: item.variant_sku,
          details: {
            variant_sku: item.variant_sku,
            quantity: item.qty,
            error: stockError.message,
            context: "order_creation",
            requires_manual_intervention: true,
          },
        } as unknown as never);
      }
    }

    // 3. Create Order
    const shipping_cost = 0; // Calculated later or standard
    const total = subtotal + shipping_cost;
    const profit_amount = subtotal - totalCost; // Gross profit excluding shipping initially
    const profit_percent = subtotal > 0 ? (profit_amount / subtotal) * 100 : 0;
    const order_number = generateOrderNumber();

    const { data: order, error: createError } = await supabase
      .from("orders")
      .insert({
        order_number,
        customer,
        items: verifiedItems,
        subtotal,
        shipping_cost,
        total,
        payment_status,
        payment_provider,
        payment_intent_id,
        profit_amount,
        profit_percent,
        pin_code: customer.address.pincode,
        delivery_zone: "Standard", // Logic to determine zone?
        shipping_status: "pending"
      } as unknown as never)
      .select()
      .single();

    if (createError || !order) {
      throw createError || new Error("Failed to create order");
    }

    const typedOrder = order as { id: string };

    // 4. Create Normalized Order Items (Optional)
    const lineItems = verifiedItems.map(i => ({
      order_id: typedOrder.id,
      product_uid: i.product_uid,
      variant_sku: i.variant_sku,
      qty: i.qty,
      price: i.price,
      cost: i.cost
    }));
    await supabase.from("order_items").insert(lineItems as unknown as never);

    return NextResponse.json({ success: true, order_id: typedOrder.id, order_number });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ORDER_CREATE] Unexpected error:", {
      route: "/api/orders/create",
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
