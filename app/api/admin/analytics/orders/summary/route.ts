/**
 * Phase 3.3 — Admin Analytics: Orders Summary API
 * 
 * GET /api/admin/analytics/orders/summary
 * 
 * Returns aggregated order statistics:
 * - Total revenue (total_amount)
 * - Total shipping fees (shipping_fee)
 * - Total profit (calculated from cost_price)
 * - Order count
 * - Average margin
 * 
 * Supports date filtering via startDate and endDate query params.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = createServiceRoleClient();
    
    // Build query with correct column names
    let query = supabase
      .from("orders")
      .select("total_amount, shipping_fee, subtotal, internal_shipping_cost, created_at");
    
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate);

    const { data: orders, error } = await query;
    if (error) throw error;

    // Calculate profit from order items (cost_price)
    let totalCost = 0;
    if (orders && orders.length > 0) {
      const orderIds = (orders as any[]).map((o: any) => {
        // We need to get order IDs - fetch orders with IDs first
        return null; // Will fetch separately
      });

      // Fetch all orders with IDs for the date range
      let orderQuery = supabase
        .from("orders")
        .select("id");
      if (startDate) orderQuery = orderQuery.gte("created_at", startDate);
      if (endDate) orderQuery = orderQuery.lte("created_at", endDate);
      
      const { data: orderRows } = await orderQuery;
      const orderIdList = (orderRows || []).map((o: { id: string }) => o.id);

      if (orderIdList.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, quantity, cost_price")
          .in("order_id", orderIdList);

        if (items) {
          totalCost = items.reduce((sum, item) => 
            sum + ((item.cost_price || 0) * (item.quantity || 0)), 0
          );
        }
      }
    }

    const summary = (orders || []).reduce((acc: any, curr: any) => {
      acc.revenue += parseFloat(curr.total_amount || 0);
      acc.shipping_fee += parseFloat(curr.shipping_fee || 0);
      acc.count += 1;
      return acc;
    }, { revenue: 0, shipping_fee: 0, count: 0 });

    // Calculate profit: revenue - cost - internal shipping
    const totalInternalShipping = (orders || []).reduce((sum: number, curr: any) => 
      sum + parseFloat(curr.internal_shipping_cost || 0), 0
    );
    
    summary.profit = summary.revenue - totalCost - totalInternalShipping;
    summary.avg_margin = summary.revenue > 0 ? (summary.profit / summary.revenue) * 100 : 0;
    summary.avg_order_value = summary.count > 0 ? summary.revenue / summary.count : 0;

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("[ANALYTICS] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

