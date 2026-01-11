/**
 * Phase 3 — Admin Shipping / Shipments Page
 * 
 * Displays all shipments and shipping status.
 * Role-based visibility:
 * - Super Admin: All shipment details including costs
 * - Admin: Shipment details including costs
 * - Staff: Shipment status only (can update)
 */

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Search, Eye, Truck, Package } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { filterOrdersByRole, OrderRole } from "@/lib/orders/role-visibility";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const role = session.role as OrderRole;

  // Only admin, super_admin, and staff can access shipping
  if (!["admin", "super_admin", "staff"].includes(role)) {
    redirect("/admin/dashboard");
  }

  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = resolvedSearchParams.search || "";
  const statusFilter = resolvedSearchParams.status || "";

  const supabase = createServiceRoleClient();

  // Build query for orders with shipping information
  let query = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      customer_id,
      guest_email,
      guest_phone,
      shipping_status,
      shipment_status,
      shiprocket_shipment_id,
      courier_name,
      shipping_fee,
      internal_shipping_cost,
      shipped_at,
      created_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,shiprocket_shipment_id.ilike.%${search}%,guest_email.ilike.%${search}%,guest_phone.ilike.%${search}%`
    );
  }

  if (statusFilter) {
    query = query.eq("shipping_status", statusFilter);
  }

  const { data: shipments, count, error } = await query;

  if (error) {
    console.error("[ADMIN_SHIPPING] Error fetching shipments:", error);
  }

  // Fetch customer names for orders with customer_id
  const customerIds = (shipments || [])
    .map((s: { customer_id: string | null }) => s.customer_id)
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

  const shipmentsWithCustomers = (shipments || []).map((shipment: any) => {
    const customer = shipment.customer_id
      ? customersMap[shipment.customer_id]
      : null;
    return {
      ...shipment,
      customer:
        customer ||
        (shipment.guest_email ? { name: "Guest", email: shipment.guest_email } : null),
    };
  });

  // Apply role-based filtering
  const filteredShipments = filterOrdersByRole(shipmentsWithCustomers, role);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="serif-display text-3xl text-night">Shipping & Shipments</h1>
          <p className="text-silver-dark mt-1">Manage shipments and track delivery status</p>
        </div>
        <p className="text-silver-dark">{count} shipments found</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <form className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search Order #, Shipment ID, Email..."
            className="w-full pl-10 pr-4 py-2 border rounded-full"
          />
        </form>
        <select
          name="status"
          defaultValue={statusFilter}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="rto">RTO</option>
          <option value="returned">Returned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-offwhite text-silver-darker uppercase text-xs font-bold border-b">
            <tr>
              <th className="px-6 py-3">Order #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Shipment ID</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Courier</th>
              {role !== "staff" && (
                <>
                  <th className="px-6 py-3">Shipping Fee</th>
                  <th className="px-6 py-3">Cost</th>
                </>
              )}
              <th className="px-6 py-3">Shipped At</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredShipments?.map((shipment: any) => (
              <tr key={shipment.id} className="hover:bg-offwhite/50">
                <td className="px-6 py-4 font-mono font-medium">
                  {shipment.order_number}
                </td>
                <td className="px-6 py-4">
                  {shipment.customer?.name || "Guest"}
                  {shipment.customer?.email && (
                    <div className="text-xs text-silver-dark">
                      {shipment.customer.email}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs">
                  {shipment.shiprocket_shipment_id || "—"}
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline">{shipment.shipping_status || "pending"}</Badge>
                </td>
                <td className="px-6 py-4 text-silver-dark">
                  {shipment.courier_name || "—"}
                </td>
                {role !== "staff" && (
                  <>
                    <td className="px-6 py-4">
                      {shipment.shipping_fee !== undefined
                        ? `₹${shipment.shipping_fee.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {shipment.internal_shipping_cost !== undefined
                        ? `₹${shipment.internal_shipping_cost.toLocaleString()}`
                        : "—"}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 text-silver-dark">
                  {shipment.shipped_at
                    ? new Date(shipment.shipped_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/orders/${shipment.id}`}>
                    <AdminButton size="sm" variant="outline" icon={Eye}>
                      View
                    </AdminButton>
                  </Link>
                </td>
              </tr>
            ))}
            {filteredShipments?.length === 0 && (
              <tr>
                <td
                  colSpan={role !== "staff" ? 9 : 7}
                  className="text-center py-10 text-silver-dark"
                >
                  No shipments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}










