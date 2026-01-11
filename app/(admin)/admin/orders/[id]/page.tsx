import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import ShippingPanel from "../components/ShippingPanel";
import { ShippingUpdateForm } from "@/components/admin/orders/ShippingUpdateForm";
import { Badge } from "@/components/ui/Badge";
import { Download } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import Link from "next/link";
import { format } from "date-fns";
import {
  getShippingStatusLabel,
  getShippingStatusBadgeVariant,
  formatTimelineEvents,
  type TimelineEvent,
} from "@/lib/shipping/timeline";
import ReleaseCreditsButton from "./ReleaseCreditsButton";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  // Get user role for role-based visibility
  const userRole = session.user?.role || "admin";

  const supabase = createServiceRoleClient();
  const orderId = resolvedParams.id;

  // Log the id being used for lookup
  console.log("[ADMIN_ORDERS] Order detail page - fetching order by id:", orderId);

  // Validate that id looks like a UUID (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    console.error("[ADMIN_ORDERS] Invalid UUID format in order detail page:", orderId);
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Invalid Order Identifier</h2>
          <p className="text-red-700">
            The order identifier format is invalid. Expected UUID format.
          </p>
          <p className="text-sm text-red-600 mt-2">ID used: {orderId}</p>
        </div>
      </div>
    );
  }

  // STEP 1: Fetch order by primary key (UUID id field) - WITHOUT audit logs join
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    console.error("[ADMIN_ORDERS] Order not found:", {
      id: orderId,
      error: orderError?.message,
      code: orderError?.code
    });
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Order Not Found</h2>
          <p className="text-red-700">
            The order you're looking for could not be found.
          </p>
          <p className="text-sm text-red-600 mt-2">ID used for lookup: {orderId}</p>
          {orderError && (
            <p className="text-xs text-red-500 mt-1">Error: {orderError.message}</p>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: Fetch customer data if customer_id exists
  let customer: { name: string; email: string; phone?: string } | null = null;
  if (orderData.customer_id) {
    const { data: customerData } = await supabase
      .from("customers")
      .select("first_name, last_name, email, phone")
      .eq("id", orderData.customer_id)
      .single();
    
    if (customerData) {
      customer = {
        name: `${customerData.first_name} ${customerData.last_name}`.trim(),
        email: customerData.email || "",
        phone: customerData.phone || undefined,
      };
    }
  }

  // STEP 3: Fetch audit logs SEPARATELY (optional, must not break if fails)
  let auditLogs: Array<{
    action: string;
    created_at: string;
    details: any;
    performed_by: string | null;
  }> = [];

  try {
    // Query audit logs by target_id and target_resource
    // Using target_id as string match since it might be stored as text
    const { data: auditLogsData, error: auditLogsError } = await supabase
      .from("admin_audit_logs")
      .select("action, created_at, details, performed_by")
      .eq("target_id", orderId)
      .eq("target_resource", "orders")
      .order("created_at", { ascending: false });

    if (!auditLogsError && auditLogsData) {
      auditLogs = auditLogsData;
    } else if (auditLogsError) {
      // Log warning but don't fail the request
      console.warn("[ADMIN_ORDERS] Failed to fetch audit logs (non-blocking):", {
        order_id: orderId,
        error: auditLogsError?.message,
        code: auditLogsError?.code
      });
    }
  } catch (auditLogsException) {
    // Catch any unexpected errors in audit log fetching
    console.warn("[ADMIN_ORDERS] Exception fetching audit logs (non-blocking):", {
      order_id: orderId,
      error: auditLogsException instanceof Error ? auditLogsException.message : String(auditLogsException)
    });
  }

  // Calculate profit metrics for admin/super_admin
  let profitAmount: number | undefined;
  let profitPercent: number | undefined;
  
  if (userRole === "admin" || userRole === "super_admin") {
    const items = orderData.items || [];
    const costTotal = items.reduce((sum: number, item: any) => 
      sum + ((item.cost_price || 0) * (item.quantity || 1)), 0
    );
    profitAmount = (orderData.subtotal || 0) - costTotal - (orderData.internal_shipping_cost || 0);
    profitPercent = orderData.subtotal > 0 
      ? (profitAmount / orderData.subtotal) * 100 
      : 0;
  }

  // Defensive check: ensure payment_status is present
  if (!orderData.payment_status) {
    console.warn("[ADMIN_ORDERS] Order missing payment_status in page component:", {
      order_id: orderId,
      order_number: orderData.order_number
    });
  }

  const order: any = {
    ...orderData,
    customer,
    profit_amount: profitAmount,
    profit_percent: profitPercent,
    audit_logs: auditLogs, // Attach audit logs to order object for compatibility
    // Explicitly ensure payment_status is present (fallback to null if missing)
    payment_status: orderData.payment_status || null,
  };

  // Extract shipping details from metadata
  const metadata = (order.metadata as Record<string, any>) || {};
  const shippingMetadata = metadata.shipping || {};
  const shippingTimelineRaw = metadata.shipping_timeline || [];
  const shippingTimelineEvents = shippingTimelineRaw as TimelineEvent[];

  const currentCourier = shippingMetadata.courier || null;
  const currentAwb = shippingMetadata.awb || null;
  const currentExpectedDelivery = shippingMetadata.expected_delivery || null;

  // Filter audit logs for shipping-related actions (now safe since audit_logs is always an array)
  const shippingAuditLogs = auditLogs.filter(
    (log: any) =>
      log.action === "shipping_status_updated" ||
      log.action === "shiprocket_create_order" ||
      log.action === "shiprocket_webhook_update"
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="serif-display text-3xl">{order.order_number}</h1>
            {/* Payment Status - Always displayed, independent of shipment */}
            {(() => {
              const paymentStatus = order.payment_status || "UNKNOWN";
              const normalizedStatus = paymentStatus.toLowerCase();
              
              // Handle UNKNOWN status explicitly
              if (normalizedStatus === "unknown") {
                console.warn("[ADMIN_ORDERS] Payment status is UNKNOWN for order:", order.order_number);
              }
              
              return (
                <Badge
                  variant={
                    normalizedStatus === "paid" 
                      ? "vine" 
                      : normalizedStatus === "failed"
                      ? "destructive"
                      : normalizedStatus === "refunded"
                      ? "secondary"
                      : normalizedStatus === "unknown"
                      ? "secondary" // Use secondary variant for UNKNOWN
                      : "secondary" // Default for pending and others
                  }
                  className={normalizedStatus === "unknown" ? "border-dashed" : ""}
                >
                  {paymentStatus.toUpperCase()}
                </Badge>
              );
            })()}
            {/* Shipping Status - Independent of payment status */}
            <Badge variant={getShippingStatusBadgeVariant(order.shipping_status)}>
              {getShippingStatusLabel(order.shipping_status)}
            </Badge>
          </div>
          <p className="text-silver-dark">
            {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/api/admin/orders/${order.id}/invoice`} target="_blank">
            <AdminButton variant="outline" icon={Download}>
              Invoice
            </AdminButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border p-6 rounded-lg shadow-sm">
            <h3 className="font-bold text-lg mb-4">Items</h3>
            <div className="space-y-4">
              {order.items?.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between items-center border-b last:border-0 pb-4 last:pb-0"
                >
                  <div>
                    <p className="font-medium text-night">
                      {item.name || item.product_uid}
                    </p>
                    <p className="text-sm text-silver-dark">
                      SKU: {item.sku || "N/A"} • Qty: {item.quantity || item.qty || 1}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ₹{((item.price || 0) * (item.quantity || item.qty || 1)).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>₹{(order.shipping_fee || order.shipping_cost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span>₹{(order.total_amount || order.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          {(order.customer_id || order.guest_email) && (
            <div className="bg-white border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg mb-4">Customer</h3>
              {order.customer ? (
                <>
                  <p className="font-medium">{order.customer.name}</p>
                  {order.customer.email && <p>{order.customer.email}</p>}
                  {order.customer.phone && <p>{order.customer.phone}</p>}
                </>
              ) : order.guest_email ? (
                <>
                  <p className="font-medium">Guest Customer</p>
                  <p>{order.guest_email}</p>
                  {order.guest_phone && <p>{order.guest_phone}</p>}
                </>
              ) : (
                <p className="text-silver-dark">Customer data not available</p>
              )}
              {/* Shipping address from metadata */}
              {order.metadata && typeof order.metadata === 'object' && (order.metadata as any).shipping_address && (
                <div className="mt-4 text-sm text-silver-dark bg-offwhite p-3 rounded">
                  {(order.metadata as any).shipping_address.line1}
                  {(order.metadata as any).shipping_address.line2 && `, ${(order.metadata as any).shipping_address.line2}`}
                  <br />
                  {(order.metadata as any).shipping_address.city}, {(order.metadata as any).shipping_address.state} -{" "}
                  {(order.metadata as any).shipping_address.pincode}
                </div>
              )}
            </div>
          )}

          {/* Shipping Timeline */}
          {(shippingTimelineEvents.length > 0 || shippingAuditLogs.length > 0) && (
            <div className="bg-white border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg mb-4">Shipping Timeline & Audit Logs</h3>
              <div className="space-y-4">
                {/* Shipping Timeline Events */}
                {shippingTimelineEvents.length > 0 &&
                  formatTimelineEvents(shippingTimelineEvents)
                    .reverse()
                    .map((event, index) => (
                      <div
                        key={`shipping_${event.status}_${event.timestamp}`}
                        className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              event.completed
                                ? "bg-gold text-night"
                                : "bg-silver-light text-silver-dark"
                            }`}
                          >
                            {event.completed ? (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-night">{event.label}</p>
                          <p className="text-xs text-silver-dark mt-1">
                            {format(new Date(event.timestamp), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                          {event.notes && (
                            <p className="text-xs text-silver-dark mt-1 italic">{event.notes}</p>
                          )}
                          {event.awb && (
                            <p className="text-xs font-mono text-silver-dark mt-1">
                              AWB: {event.awb}
                            </p>
                          )}
                          {event.courier && (
                            <p className="text-xs text-silver-dark mt-1">
                              Courier: {event.courier}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                {/* Audit Logs */}
                {shippingAuditLogs.map((log: any, index: number) => (
                  <div
                    key={`audit_${log.created_at}_${index}`}
                    className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-silver-light text-silver-dark">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-night">
                        {log.action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-silver-dark mt-1">
                        {format(new Date(log.created_at), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                      {log.details && typeof log.details === "object" && (
                        <div className="text-xs text-silver-dark mt-1 space-y-1">
                          {log.details.old_status && log.details.new_status && (
                            <p>
                              Status: {log.details.old_status} → {log.details.new_status}
                            </p>
                          )}
                          {log.details.awb && <p className="font-mono">AWB: {log.details.awb}</p>}
                          {log.details.courier && <p>Courier: {log.details.courier}</p>}
                          {log.details.notes && <p className="italic">{log.details.notes}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shipping Update Form */}
          <div className="bg-white border p-6 rounded-lg shadow-sm">
            <h3 className="font-bold text-lg mb-4">Update Shipping Status</h3>
            <ShippingUpdateForm
              orderId={order.id}
              currentStatus={order.shipping_status}
              currentCourier={currentCourier}
              currentAwb={currentAwb}
              currentExpectedDelivery={currentExpectedDelivery}
            />
          </div>

          <ShippingPanel order={order} userRole={userRole as "super_admin" | "admin" | "staff"} />

          {/* Release Credits for Returns (Super Admin only) */}
          {order.shipping_status === "returned" && order.payment_status === "paid" && (
            <ReleaseCreditsButton orderId={order.id} orderNumber={order.order_number} />
          )}

          {/* Profit Analysis (Admin only) */}
          {(order.profit_amount !== undefined || order.profit_percent !== undefined) && (
            <div className="bg-white border p-6 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg mb-4">Profit Analysis</h3>
              <div className="flex justify-between mb-2">
                <span className="text-silver-dark">Net Profit</span>
                <span
                  className={
                    (order.profit_amount || 0) > 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  ₹{(order.profit_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-silver-dark">Margin</span>
                <span
                  className={
                    (order.profit_percent || 0) > 5
                      ? "text-green-600"
                      : "text-red-600 font-bold"
                  }
                >
                  {(order.profit_percent || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
