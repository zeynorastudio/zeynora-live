/**
 * Phase 3.1 — Admin Orders List API with Role-Based Visibility
 * 
 * GET /api/admin/orders/list
 * 
 * Returns orders filtered by user role:
 * - Super Admin: All fields visible
 * - Admin: Sees selling price, cost price, shipping cost, margin
 * - Staff: Sees order_id, SKU, quantity, address, shipment status only
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { filterOrdersByRole, OrderRole } from "@/lib/orders/role-visibility";

export const dynamic = "force-dynamic";

interface QueryParams {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  payment_status?: string;
  shipping_status?: string;
  from_date?: string;
  to_date?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin session
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.role as OrderRole;
    
    // Validate role has access to orders
    if (!["super_admin", "admin", "staff"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";
    const paymentStatusFilter = searchParams.get("payment_status") || "";
    const shippingStatusFilter = searchParams.get("shipping_status") || "";
    const fromDate = searchParams.get("from_date") || "";
    const toDate = searchParams.get("to_date") || "";

    const supabase = createServiceRoleClient();

    // Build query with all fields (we'll filter by role later)
    let query = supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_id,
        user_id,
        guest_phone,
        guest_email,
        order_status,
        payment_status,
        shipping_status,
        currency,
        subtotal,
        shipping_fee,
        internal_shipping_cost,
        assumed_weight,
        tax_amount,
        discount_amount,
        total_amount,
        coupon_code,
        shiprocket_shipment_id,
        payment_provider,
        metadata,
        created_at,
        updated_at
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,guest_phone.ilike.%${search}%,guest_email.ilike.%${search}%`);
    }

    // Apply status filters
    if (statusFilter) {
      query = query.eq("order_status", statusFilter);
    }
    if (paymentStatusFilter) {
      query = query.eq("payment_status", paymentStatusFilter);
    }
    if (shippingStatusFilter) {
      query = query.eq("shipping_status", shippingStatusFilter);
    }

    // Apply date filters
    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }
    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    const { data: orders, count, error } = await query;

    if (error) {
      console.error("[ADMIN_ORDERS] Query error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch orders", details: error.message },
        { status: 500 }
      );
    }

    // Fetch order items for each order
    const orderIds = (orders || []).map((o: { id: string }) => o.id);
    
    let itemsMap: Record<string, Array<{
      id: string;
      sku: string;
      product_uid: string;
      name: string;
      quantity: number;
      price: number;
      cost_price?: number;
      subtotal: number;
    }>> = {};

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("id, order_id, sku, product_uid, name, quantity, price, cost_price, subtotal")
        .in("order_id", orderIds);

      // Group items by order_id
      if (items) {
        for (const item of items as Array<{ id: string; order_id: string; sku: string; product_uid: string; name: string; quantity: number; price: number; cost_price?: number; subtotal: number }>) {
          if (!itemsMap[item.order_id]) {
            itemsMap[item.order_id] = [];
          }
          itemsMap[item.order_id].push({
            id: item.id,
            sku: item.sku,
            product_uid: item.product_uid,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            cost_price: item.cost_price,
            subtotal: item.subtotal,
          });
        }
      }
    }

    // Attach items to orders
    const ordersWithItems = (orders || []).map((order: Record<string, unknown>) => ({
      ...order,
      items: itemsMap[order.id as string] || [],
    }));

    // Apply role-based field filtering
    const filteredOrders = filterOrdersByRole(ordersWithItems as any, role);

    // Return filtered response
    return NextResponse.json({
      success: true,
      data: filteredOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
      role: role,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ADMIN_ORDERS] Unexpected error:", {
      route: "/api/admin/orders/list",
      error: errorMessage,
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}



