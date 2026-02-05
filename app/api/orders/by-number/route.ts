/**
 * Public API Route: Get Order by Order Number
 * 
 * Used by confirmation page to fetch order details.
 * Supports both guest and logged-in orders.
 * Uses service role client to bypass RLS.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("order_number");

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: "order_number is required" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    // This allows fetching orders for both guest and logged-in users
    const supabase = createServiceRoleClient();

    // Fetch order by order_number
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        subtotal,
        shipping_fee,
        total_amount,
        payment_status,
        created_at,
        metadata
      `
      )
      .eq("order_number", orderNumber)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API_ORDERS_BY_NUMBER] Error:", errorMessage);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
