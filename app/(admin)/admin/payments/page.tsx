/**
 * Phase 3 — Admin Payments Page (Read-Only)
 * 
 * Displays payment history and transaction details.
 * Read-only access for admin and super_admin roles.
 */

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Search, Eye, CreditCard } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  // Only admin and super_admin can access payments
  if (session.role !== "admin" && session.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = resolvedSearchParams.search || "";
  const statusFilter = resolvedSearchParams.status || "";

  const supabase = createServiceRoleClient();

  // Build query for orders with payment information
  let query = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      customer_id,
      guest_email,
      guest_phone,
      payment_status,
      payment_provider,
      payment_method,
      total_amount,
      paid_at,
      created_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,guest_email.ilike.%${search}%,guest_phone.ilike.%${search}%`
    );
  }

  if (statusFilter) {
    query = query.eq("payment_status", statusFilter);
  }

  const { data: payments, count, error } = await query;

  if (error) {
    console.error("[ADMIN_PAYMENTS] Error fetching payments:", error);
  }

  // Fetch customer names for orders with customer_id
  const customerIds = (payments || [])
    .map((p: { customer_id: string | null }) => p.customer_id)
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

  const paymentsWithCustomers = (payments || []).map((payment: any) => {
    const customer = payment.customer_id
      ? customersMap[payment.customer_id]
      : null;
    return {
      ...payment,
      customer: customer || (payment.guest_email ? { name: "Guest", email: payment.guest_email } : null),
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="serif-display text-3xl text-night">Payments</h1>
          <p className="text-silver-dark mt-1">Payment history and transaction details</p>
        </div>
        <p className="text-silver-dark">{count} payments found</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <form className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search Order #, Email, Phone..."
            className="w-full pl-10 pr-4 py-2 border rounded-full"
          />
        </form>
        <select
          name="status"
          defaultValue={statusFilter}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Payment Pending</option>
          <option value="failed">Payment Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-offwhite text-silver-darker uppercase text-xs font-bold border-b">
            <tr>
              <th className="px-6 py-3">Order #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Paid At</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paymentsWithCustomers?.map((payment: any) => (
              <tr key={payment.id} className="hover:bg-offwhite/50">
                <td className="px-6 py-4 font-mono font-medium">
                  {payment.order_number}
                </td>
                <td className="px-6 py-4">
                  {payment.customer?.name || "Guest"}
                  {payment.customer?.email && (
                    <div className="text-xs text-silver-dark">
                      {payment.customer.email}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  ₹{payment.total_amount?.toLocaleString() || "0"}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      payment.payment_status === "paid"
                        ? "vine"
                        : payment.payment_status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {payment.payment_status === "pending"
                      ? "Payment Pending"
                      : payment.payment_status === "paid"
                        ? "Paid"
                        : payment.payment_status === "failed"
                          ? "Payment Failed"
                          : payment.payment_status === "refunded"
                            ? "Refunded"
                            : payment.payment_status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-silver-dark">
                  {payment.payment_provider || "—"}
                </td>
                <td className="px-6 py-4 text-silver-dark">
                  {payment.payment_method || "—"}
                </td>
                <td className="px-6 py-4 text-silver-dark">
                  {payment.paid_at
                    ? new Date(payment.paid_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/orders/${payment.id}`}>
                    <AdminButton size="sm" variant="outline" icon={Eye}>
                      View Order
                    </AdminButton>
                  </Link>
                </td>
              </tr>
            ))}
            {paymentsWithCustomers?.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-silver-dark">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

