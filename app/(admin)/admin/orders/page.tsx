import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { filterOrdersByRole, OrderRole } from "@/lib/orders/role-visibility";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const role = session.role as OrderRole;
  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = 20;
  const search = resolvedSearchParams.search || "";

  // Use service role client to fetch orders (bypasses RLS for admin panel)
  const supabase = createServiceRoleClient();
  
  // Build query with correct schema fields
  let query = supabase
    .from("orders")
    .select(`
      id,
      order_number,
      customer_id,
      guest_phone,
      guest_email,
      order_status,
      payment_status,
      shipping_status,
      total_amount,
      subtotal,
      internal_shipping_cost,
      created_at
    `, { count: 'exact' })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`order_number.ilike.%${search}%,guest_phone.ilike.%${search}%,guest_email.ilike.%${search}%`);
  }

  const { data: ordersData, count, error } = await query;

  if (error) {
    console.error("[ADMIN_ORDERS] Error fetching orders:", error);
  }

  // Fetch order items for margin calculation
  const orderIds = (ordersData || []).map((o: { id: string }) => o.id);
  let itemsMap: Record<string, Array<{ cost_price?: number; quantity: number }>> = {};

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, cost_price, quantity")
      .in("order_id", orderIds);

    if (items) {
      for (const item of items) {
        if (!itemsMap[item.order_id]) {
          itemsMap[item.order_id] = [];
        }
        itemsMap[item.order_id].push(item);
      }
    }
  }

  // Fetch customer data for orders with customer_id
  const customerIds = (ordersData || [])
    .map((o: { customer_id: string | null }) => o.customer_id)
    .filter((id: string | null): id is string => id !== null);
  
  let customersMap: Record<string, { name: string; email: string }> = {};
  
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, first_name, last_name, email")
      .in("id", customerIds);

    if (customers) {
      for (const customer of customers) {
        customersMap[customer.id] = {
          name: `${customer.first_name} ${customer.last_name}`.trim(),
          email: customer.email || "",
        };
      }
    }
  }

  // Calculate profit percent and attach customer data
  const orders = (ordersData || []).map((order: any) => {
    const items = itemsMap[order.id] || [];
    const costTotal = items.reduce((sum: number, item: { cost_price?: number; quantity: number }) => 
      sum + ((item.cost_price || 0) * item.quantity), 0
    );
    const profitAmount = (order.subtotal || 0) - costTotal - (order.internal_shipping_cost || 0);
    const profitPercent = order.subtotal > 0 
      ? (profitAmount / order.subtotal) * 100 
      : 0;

    const customer = order.customer_id ? customersMap[order.customer_id] : null;

    return {
      ...order,
      customer: customer || (order.guest_email ? { name: "Guest", email: order.guest_email } : null),
      profit_percent: profitPercent,
    };
  });

  // Apply role-based filtering
  const filteredOrders = filterOrdersByRole(orders, role);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="serif-display text-3xl text-night">Orders</h1>
        <p className="text-silver-dark">{count} orders found</p>
      </div>

      {/* Search */}
      <form className="mb-6 relative max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
         <input name="search" defaultValue={search} placeholder="Search Order # or Name..." className="w-full pl-10 pr-4 py-2 border rounded-full" />
      </form>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-offwhite text-silver-darker uppercase text-xs font-bold border-b">
            <tr>
              <th className="px-6 py-3">Order #</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Total</th>
              <th className="px-6 py-3">Profit %</th>
              <th className="px-6 py-3">Payment</th>
              <th className="px-6 py-3">Shipping</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders?.map((order: any) => (
              <tr key={order.id} className="hover:bg-offwhite/50">
                <td className="px-6 py-4 font-mono font-medium">{order.order_number}</td>
                <td className="px-6 py-4">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">{order.customer?.name || order.guest_email || "Guest"}</td>
                <td className="px-6 py-4">
                  {order.total_amount !== undefined ? `₹${order.total_amount.toLocaleString()}` : "—"}
                </td>
                <td className="px-6 py-4">
                  {order.profit_percent !== undefined ? (
                    <span className={order.profit_percent < 5 ? "text-red-600 font-bold" : "text-green-600"}>
                      {order.profit_percent.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-silver-dark">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={order.payment_status === "paid" ? "vine" : "secondary"}>
                    {order.payment_status === "pending"
                      ? "Payment Pending"
                      : order.payment_status === "paid"
                        ? "Paid"
                        : order.payment_status === "failed"
                          ? "Payment Failed"
                          : order.payment_status === "refunded"
                            ? "Refunded"
                            : order.payment_status}
                  </Badge>
                </td>
                <td className="px-6 py-4"><Badge variant="outline">{order.shipping_status}</Badge></td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/orders/${order.id}`}>
                    <AdminButton size="sm" variant="outline" icon={Eye}>View</AdminButton>
                  </Link>
                </td>
              </tr>
            ))}
            {filteredOrders?.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-silver-dark">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

