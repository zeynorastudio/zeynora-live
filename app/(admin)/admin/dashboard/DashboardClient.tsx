"use client";

/**
 * Phase 3.3 — Admin Dashboard Client Component
 * 
 * Displays real-time dashboard metrics:
 * - Order statistics (total, today, this month)
 * - Revenue metrics
 * - Order status breakdown
 * - Recent orders
 */

import { useEffect, useState } from "react";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminCard } from "@/components/admin/AdminCard";
import { ShoppingBag, TrendingUp, DollarSign, Package, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface DashboardData {
  overview: {
    total_orders: number;
    total_revenue: number;
    today_orders: number;
    today_revenue: number;
    month_orders: number;
    month_revenue: number;
    avg_order_value: number;
  };
  status_breakdown: Record<string, number>;
  payment_breakdown: Record<string, number>;
  recent_orders: Array<{
    id: string;
    order_number: string;
    total_amount?: number; // Optional for staff role
    order_status: string;
    payment_status: string;
    shipping_status?: string;
    created_at: string;
  }>;
  role: string;
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/admin/analytics/dashboard");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to fetch dashboard data");
        }

        setData(result.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Payment status label mapping (STEP 4)
  const getPaymentStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
      pending: "Payment Pending",
      paid: "Paid",
      failed: "Payment Failed",
      refunded: "Refunded",
    };
    return labelMap[status.toLowerCase()] || status;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { variant: "default" },
      pending: { variant: "outline" },
      failed: { variant: "destructive" },
      refunded: { variant: "destructive" },
    };

    const config = statusColors[status.toLowerCase()] || { variant: "outline" as const };
    return <Badge variant={config.variant}>{getPaymentStatusLabel(status)}</Badge>;
  };

  const getOrderStatusBadge = (status: string) => {
    const statusColors: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      "in progress": { variant: "secondary", label: "In Progress" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      confirmed: { variant: "default", label: "Confirmed" },
      processing: { variant: "secondary", label: "Processing" },
      paid: { variant: "default", label: "Paid" },
      created: { variant: "outline", label: "Created" },
    };

    const config = statusColors[status.toLowerCase()] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-silver-light animate-pulse">
              <div className="h-4 bg-silver-light rounded w-24 mb-2"></div>
              <div className="h-8 bg-silver-light rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-800">{error || "Failed to load dashboard data"}</p>
      </div>
    );
  }

  const { overview, status_breakdown, payment_breakdown, recent_orders, role } = data;
  const isStaff = role === "staff";

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isStaff ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-6`}>
        <AdminStatCard
          title="Total Orders"
          value={overview.total_orders.toLocaleString()}
          icon={ShoppingBag}
        />
        {!isStaff && (
          <>
            <AdminStatCard
              title="Total Revenue"
              value={formatCurrency(overview.total_revenue)}
              icon={DollarSign}
            />
            <AdminStatCard
              title="Today's Orders"
              value={overview.today_orders}
              icon={Clock}
              trend={overview.today_revenue > 0 ? formatCurrency(overview.today_revenue) : undefined}
              trendUp={overview.today_orders > 0}
            />
            <AdminStatCard
              title="Avg Order Value"
              value={formatCurrency(overview.avg_order_value)}
              icon={TrendingUp}
            />
          </>
        )}
        {isStaff && (
          <AdminStatCard
            title="Today's Orders"
            value={overview.today_orders}
            icon={Clock}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown (STEP 3) */}
        <AdminCard title="Order Status Breakdown">
          <div className="space-y-3">
            {Object.entries(status_breakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getOrderStatusBadge(status)}
                </div>
                <span className="text-night font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(status_breakdown).length === 0 && (
              <p className="text-silver-dark text-sm text-center py-4">No orders yet</p>
            )}
          </div>
        </AdminCard>

        {/* Payment Status Breakdown (STEP 4) */}
        <AdminCard title="Payment Status Breakdown">
          <div className="space-y-3">
            {Object.entries(payment_breakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status === "paid" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : status === "failed" ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm text-night">{getPaymentStatusLabel(status)}</span>
                </div>
                <span className="text-night font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(payment_breakdown).length === 0 && (
              <p className="text-silver-dark text-sm text-center py-4">No payment data yet</p>
            )}
          </div>
        </AdminCard>
      </div>

      {/* Recent Orders */}
      <AdminCard 
        title="Recent Orders"
        action={
          <Link href="/admin/orders" className="text-sm text-gold hover:text-gold-darker">
            View All →
          </Link>
        }
      >
        {recent_orders.length > 0 ? (
          <div className="space-y-4">
            {recent_orders.map((order) => {
              // Determine if order is cancelled (STEP 5)
              const isCancelled = 
                order.order_status?.toLowerCase() === "cancelled" ||
                order.shipping_status?.toLowerCase() === "cancelled";
              
              // Determine derived order status for display
              const getDerivedOrderStatus = () => {
                const orderStatus = order.order_status?.toLowerCase() || "";
                const shippingStatus = order.shipping_status?.toLowerCase() || "";
                
                if (orderStatus === "completed" || shippingStatus === "delivered") {
                  return "Completed";
                }
                if (orderStatus === "cancelled" || shippingStatus === "cancelled") {
                  return "Cancelled";
                }
                if (
                  ["confirmed", "processing", "paid"].includes(orderStatus) ||
                  ["processing", "shipped", "in_transit", "out_for_delivery"].includes(shippingStatus)
                ) {
                  return "In Progress";
                }
                return order.order_status || "Created";
              };

              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className={`block p-4 border rounded-lg transition-colors ${
                    isCancelled
                      ? "border-silver-light bg-silver-light/30 opacity-75 hover:border-silver-dark"
                      : "border-silver-light hover:border-gold/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-mono text-sm font-medium ${
                          isCancelled ? "text-silver-dark" : "text-night"
                        }`}>
                          {order.order_number}
                        </span>
                        {getOrderStatusBadge(getDerivedOrderStatus())}
                        {getPaymentStatusBadge(order.payment_status)}
                      </div>
                      <p className={`text-xs ${
                        isCancelled ? "text-silver-dark" : "text-silver-dark"
                      }`}>
                        {new Date(order.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!isStaff && order.total_amount !== undefined && (
                      <div className="text-right">
                        <p className={`font-semibold ${
                          isCancelled ? "text-silver-dark" : "text-night"
                        }`}>
                          {formatCurrency(parseFloat(order.total_amount.toString()))}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-silver-dark text-sm text-center py-8">No recent orders</p>
        )}
      </AdminCard>
    </div>
  );
}

