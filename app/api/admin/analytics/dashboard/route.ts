/**
 * Phase 3.3 — Admin Dashboard Analytics API
 * 
 * GET /api/admin/analytics/dashboard
 * 
 * Returns comprehensive dashboard statistics:
 * - Total orders (all time, today, this month)
 * - Revenue metrics
 * - Order status breakdown
 * - Payment status breakdown
 * - Recent orders
 * 
 * Respects role-based visibility (admin/staff/super_admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const role = session.role;
    const supabase = createServiceRoleClient();

    // Date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper function to get order stats (STEP 1-4: Only completed business outcomes)
    // Staff role: Only count, no revenue
    const getOrderStats = async (dateFilter?: { gte?: string; lte?: string }) => {
      // STEP 1 & 3: Count only delivered orders
      // Note: 'delivered' is in shipping_status field (not order_status)
      // STEP 2 & 4: Revenue only from delivered AND paid orders
      let query = supabase
        .from("orders")
        .select("id, total_amount, order_status, payment_status, shipping_status, created_at", { count: "exact" })
        .eq("shipping_status", "delivered"); // STEP 1: Only delivered orders (completed business outcomes)
      
      if (dateFilter?.gte) query = query.gte("created_at", dateFilter.gte);
      if (dateFilter?.lte) query = query.lte("created_at", dateFilter.lte);

      const { data, count, error } = await query;
      if (error) throw error;

      // STEP 2: Revenue only from delivered AND paid orders
      // Exclude: pending payments, failed payments, refunded orders
      // Only count orders where payment_status = 'paid'
      const revenue = role === "staff" 
        ? 0 
        : (data || []).reduce((sum, o) => {
            // STEP 2: Only count if payment_status = 'paid'
            // This excludes: pending, failed, refunded
            if (o.payment_status === "paid") {
              return sum + parseFloat(o.total_amount || 0);
            }
            return sum;
          }, 0);
      
      return {
        count: count || 0,
        revenue,
      };
    };

    // STEP 1: Total Orders - COUNT(*) WHERE shipping_status = 'delivered'
    // Excludes: created, confirmed, processing, shipped, cancelled
    const allTimeStats = await getOrderStats();

    // STEP 3: Today's Orders - COUNT(*) WHERE shipping_status = 'delivered' AND created_at::date = CURRENT_DATE
    // Only counts delivered orders created today
    const todayStats = await getOrderStats({ gte: todayStart.toISOString() });

    // This month's stats - Only delivered orders
    const monthStats = await getOrderStats({ gte: monthStart.toISOString() });

    // Get order status breakdown with derived groupings
    const { data: statusData } = await supabase
      .from("orders")
      .select("order_status, shipping_status")
      .not("order_status", "is", null);

    // Derived order status groupings (STEP 2)
    const derivedStatusBreakdown: Record<string, number> = {
      "Completed": 0,
      "In Progress": 0,
      "Cancelled": 0,
    };

    (statusData || []).forEach((o: { order_status: string; shipping_status?: string | null }) => {
      const orderStatus = o.order_status?.toLowerCase() || "";
      const shippingStatus = o.shipping_status?.toLowerCase() || "";

      // Completed Orders: order_status = 'completed' OR shipping_status = 'delivered'
      if (orderStatus === "completed" || shippingStatus === "delivered") {
        derivedStatusBreakdown["Completed"]++;
      }
      // Cancelled Orders: order_status = 'cancelled' OR shipping_status = 'cancelled'
      else if (orderStatus === "cancelled" || shippingStatus === "cancelled") {
        derivedStatusBreakdown["Cancelled"]++;
      }
      // In Progress Orders: order_status IN ('confirmed', 'processing', 'paid') OR shipping_status IN ('processing', 'shipped', 'in_transit', 'out_for_delivery')
      else if (
        ["confirmed", "processing", "paid"].includes(orderStatus) ||
        ["processing", "shipped", "in_transit", "out_for_delivery"].includes(shippingStatus)
      ) {
        derivedStatusBreakdown["In Progress"]++;
      }
      // Default: count as "In Progress" for any other status
      else {
        derivedStatusBreakdown["In Progress"]++;
      }
    });

    // Get payment status breakdown
    const { data: paymentData } = await supabase
      .from("orders")
      .select("payment_status")
      .not("payment_status", "is", null);

    const paymentBreakdown: Record<string, number> = {};
    (paymentData || []).forEach((o: { payment_status: string }) => {
      const status = o.payment_status || "unknown";
      paymentBreakdown[status] = (paymentBreakdown[status] || 0) + 1;
    });

    // Get recent orders (last 5) with priority sorting (STEP 5)
    // Staff: No total_amount
    const selectFields = role === "staff"
      ? "id, order_number, order_status, payment_status, shipping_status, created_at"
      : "id, order_number, total_amount, order_status, payment_status, shipping_status, created_at";
    
    const { data: allRecentOrders } = await supabase
      .from("orders")
      .select(selectFields)
      .order("created_at", { ascending: false })
      .limit(20); // Get more to sort properly

    // Sort orders by priority: Delivered > Confirmed/Processing/Shipped > Cancelled (last)
    const recentOrders = (allRecentOrders || []).sort((a: any, b: any) => {
      const getPriority = (order: any) => {
        const orderStatus = order.order_status?.toLowerCase() || "";
        const shippingStatus = order.shipping_status?.toLowerCase() || "";

        // Priority 1: Delivered/Completed (highest)
        if (orderStatus === "completed" || shippingStatus === "delivered") {
          return 1;
        }
        // Priority 2: In Progress (Confirmed, Processing, Shipped, etc.)
        if (
          ["confirmed", "processing", "paid"].includes(orderStatus) ||
          ["processing", "shipped", "in_transit", "out_for_delivery"].includes(shippingStatus)
        ) {
          return 2;
        }
        // Priority 3: Cancelled (lowest, displayed last)
        if (orderStatus === "cancelled" || shippingStatus === "cancelled") {
          return 3;
        }
        // Default: In Progress
        return 2;
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      // Sort by priority first, then by created_at (newest first within same priority)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, 5); // Take top 5 after sorting

    // STEP 4: Average Order Value - AVG(total_amount) WHERE shipping_status = 'delivered' AND payment_status = 'paid'
    // Calculate from delivered orders with paid status only
    let avgOrderValue = 0;
    if (role !== "staff" && allTimeStats.count > 0) {
      // Get count of delivered AND paid orders for accurate average
      // This ensures we divide revenue by the correct count (delivered + paid)
      const { count: deliveredPaidCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("shipping_status", "delivered") // STEP 4: Only delivered orders
        .eq("payment_status", "paid"); // STEP 4: Only paid orders
      
      if (deliveredPaidCount && deliveredPaidCount > 0) {
        avgOrderValue = allTimeStats.revenue / deliveredPaidCount;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_orders: allTimeStats.count,
          total_revenue: allTimeStats.revenue,
          today_orders: todayStats.count,
          today_revenue: todayStats.revenue,
          month_orders: monthStats.count,
          month_revenue: monthStats.revenue,
          avg_order_value: avgOrderValue,
        },
        status_breakdown: derivedStatusBreakdown,
        payment_breakdown: paymentBreakdown,
        recent_orders: recentOrders || [],
        role: role,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[DASHBOARD_ANALYTICS] Error:", errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

