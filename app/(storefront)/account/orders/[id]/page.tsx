import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getPublicUrl } from "@/lib/utils/images";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import OrderDetailClient from "@/components/account/OrderDetailClient";
import SupportModal from "@/components/support/SupportModal";
import {
  getShippingStatusLabel,
  getShippingStatusBadgeVariant,
  formatTimelineEvents,
  type TimelineEvent,
} from "@/lib/shipping/timeline";

export const dynamic = "force-dynamic";

interface OrderItem {
  id: string;
  product_uid: string;
  sku: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  name: string | null;
  product_name?: string;
  product_image?: string;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user record
  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", user.id)
    .single();

  const typedUserRecord = userRecord as { id: string } | null;
  if (!typedUserRecord) {
    redirect("/login");
  }

  // Use service-level client for secure reads
  const serviceSupabase = createServiceRoleClient();

  // Fetch order with all necessary fields
  const { data: order, error: orderError } = await serviceSupabase
    .from("orders")
    .select(
      "id, order_number, user_id, payment_status, shipping_status, total_amount, subtotal, shipping_fee, tax_amount, discount_amount, currency, created_at, updated_at, payment_provider, payment_provider_response, metadata, shiprocket_shipment_id"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // Type assertion for order
  const typedOrder = order as {
    id: string;
    order_number: string;
    user_id: string;
    payment_status: string;
    shipping_status: string;
    total_amount: number | null;
    subtotal: number | null;
    shipping_fee: number | null;
    tax_amount: number | null;
    discount_amount: number | null;
    currency: string | null;
    created_at: string;
    updated_at: string;
    payment_provider: string | null;
    payment_provider_response: any;
    metadata: any;
    shiprocket_shipment_id: string | null;
  };

  // Verify order belongs to user
  if (typedOrder.user_id !== typedUserRecord.id) {
    notFound();
  }

  // Fetch order items with product details
  const { data: orderItemsRaw } = await serviceSupabase
    .from("order_items")
    .select("id, product_uid, sku, quantity, price, subtotal, name")
    .eq("order_id", typedOrder.id);

  // Type assertion for order items
  const typedOrderItemsRaw = (orderItemsRaw || []) as Array<{
    id: string;
    product_uid: string | null;
    sku: string | null;
    quantity: number;
    price: number;
    subtotal: number;
    name: string | null;
  }>;

  // Fetch product details for items
  const productUids = typedOrderItemsRaw
    .map((item) => item.product_uid)
    .filter(Boolean) as string[];

  let productDetails: Record<string, { name: string; main_image_path: string | null }> = {};
  if (productUids.length > 0) {
    const { data: products } = await serviceSupabase
      .from("products")
      .select("uid, name, main_image_path")
      .in("uid", productUids);

    const typedProducts = (products || []) as Array<{
      uid: string;
      name: string;
      main_image_path: string | null;
    }>;

    typedProducts.forEach((p) => {
      productDetails[p.uid] = {
        name: p.name,
        main_image_path: p.main_image_path,
      };
    });
  }

  // Map order items with product details
  const orderItems: OrderItem[] = typedOrderItemsRaw.map((item) => ({
    id: item.id,
    product_uid: item.product_uid || "",
    sku: item.sku,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
    name: item.name,
    product_name: productDetails[item.product_uid || ""]?.name || item.name || "Product",
    product_image: productDetails[item.product_uid || ""]?.main_image_path || undefined,
  }));

  // Fetch payment logs (last 10) for timeline
  const { data: paymentLogs } = await serviceSupabase
    .from("payment_logs")
    .select("id, status, created_at, provider_response")
    .eq("order_id", typedOrder.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Type assertion for payment logs
  const typedPaymentLogs = (paymentLogs || []) as Array<{
    id: string;
    status: string;
    created_at: string;
    provider_response: any;
  }>;

  // Fetch support queries count and last open ticket
  const { data: supportQueries } = await serviceSupabase
    .from("shipping_queries")
    .select("id, status, message, created_at")
    .eq("order_id", typedOrder.id)
    .order("created_at", { ascending: false })
    .limit(1);

  // Type assertion for support queries
  const typedSupportQueries = (supportQueries || []) as Array<{
    id: string;
    status: string;
    message: string;
    created_at: string;
  }>;

  const supportCount = typedSupportQueries.length;
  const lastSupportTicket = typedSupportQueries[0] || null;

  // Parse JSONB fields
  const paymentResponse = (typedOrder.payment_provider_response as Record<string, any>) || {};
  const metadata = (typedOrder.metadata as Record<string, any>) || {};
  const shiprocketResponse = metadata.shiprocket_response || {};

  // Extract payment details
  const razorpayOrderId = paymentResponse.razorpay_order_id || null;
  const razorpayPaymentId = paymentResponse.razorpay_payment_id || null;
  const razorpaySignature = paymentResponse.razorpay_signature || null;
  const paidAt = paymentResponse.paid_at || null;
  const paymentAttempts = paymentResponse.payment_attempts || 0;
  const pendingExpiresAt = paymentResponse.pending_expires_at
    ? new Date(paymentResponse.pending_expires_at)
    : null;

  // Extract shipping details from metadata or shiprocket_response
  const shippingMetadata = metadata.shipping || {};
  const awb =
    shiprocketResponse.awb_code ||
    shiprocketResponse.awb ||
    shippingMetadata.awb ||
    metadata.awb ||
    null;
  const courier =
    shiprocketResponse.courier_name ||
    shiprocketResponse.courier ||
    shippingMetadata.courier ||
    metadata.courier ||
    null;
  const trackingUrl =
    shippingMetadata.tracking_url ||
    shiprocketResponse.tracking_url ||
    (awb ? `https://shiprocket.co/tracking/${awb}` : null);
  const expectedDelivery =
    shiprocketResponse.expected_delivery_date ||
    shippingMetadata.expected_delivery ||
    metadata.expected_delivery ||
    null;

  // Extract shipping timeline from metadata
  const shippingTimelineRaw = metadata.shipping_timeline || [];
  const shippingTimelineEvents = shippingTimelineRaw as TimelineEvent[];

  // Check fulfillment state
  const fulfillmentFailed = typedOrder.shipping_status === "fulfillment_failed";
  const fulfillmentError = metadata.fulfillment_error || null;
  
  // CRITICAL: Check for invalid booking - BOOKED status but no shipment_id
  const isInvalidBooking = typedOrder.shipment_status === "BOOKED" && !typedOrder.shiprocket_shipment_id;

  // Extract package details (may be in metadata)
  const packageWeightKg = metadata.package_weight_kg || null;
  const packageLengthCm = metadata.package_length_cm || null;
  const packageBreadthCm = metadata.package_breadth_cm || null;
  const packageHeightCm = metadata.package_height_cm || null;

  // Check admin access
  const adminSession = await getAdminSession();
  const isAdmin = adminSession !== null;

  // Build timeline from payment logs and shipping events
  const timeline: Array<{
    id: string;
    label: string;
    date: string;
    completed: boolean;
    icon: string;
    details?: string | null;
    type?: "payment" | "shipping";
  }> = [
    {
      id: "order_created",
      label: "Order Created",
      date: typedOrder.created_at,
      completed: true,
      icon: "check",
      type: "payment",
    },
  ];

  // Add payment events
  if (typedPaymentLogs.length > 0) {
    typedPaymentLogs.forEach((log) => {
      const logResponse = (log.provider_response as Record<string, any>) || {};
      const event = logResponse.event || log.status;
      
      timeline.push({
        id: log.id,
        label:
          event === "razorpay_order_regenerated"
            ? "Payment Retry (Regenerated)"
            : event === "retry_reuse"
            ? "Payment Retry (Reused)"
            : event === "payment.captured"
            ? "Payment Captured"
            : event === "payment.failed"
            ? "Payment Failed"
            : log.status === "paid"
            ? "Payment Confirmed"
            : log.status === "pending"
            ? "Payment Initiated"
            : log.status === "failed"
            ? "Payment Failed"
            : `Payment ${log.status}`,
        date: log.created_at,
        completed: log.status === "paid" || log.status === "captured",
        icon: log.status === "paid" || log.status === "captured" ? "check" : "clock",
        details: logResponse.note || logResponse.idempotency_key || null,
        type: "payment",
      });
    });
  }

  // Add shipping timeline events
  if (shippingTimelineEvents && shippingTimelineEvents.length > 0) {
    const formattedShippingEvents = formatTimelineEvents(shippingTimelineEvents);
    formattedShippingEvents.forEach((event) => {
      timeline.push({
        id: `shipping_${event.status}_${event.timestamp}`,
        label: event.label,
        date: event.timestamp,
        completed: event.completed,
        icon: event.icon,
        details: event.notes || (event.awb ? `AWB: ${event.awb}` : null) || null,
        type: "shipping",
      });
    });
  }

  // Sort timeline by date
  timeline.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const now = new Date();
  const canRetryPayment =
    typedOrder.payment_status === "pending" &&
    pendingExpiresAt &&
    pendingExpiresAt > now &&
    razorpayOrderId;

  const canCancel =
    typedOrder.payment_status === "pending" &&
    typedOrder.shipping_status !== "shipped" &&
    typedOrder.shipping_status !== "delivered";

  const canReturn =
    (typedOrder.payment_status === "paid" || typedOrder.shipping_status === "delivered") &&
    typedOrder.shipping_status !== "cancelled" &&
    typedOrder.shipping_status !== "returned";

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account/orders"
            className="text-gold hover:text-gold-dark mb-4 inline-block transition-colors"
          >
            ← Back to Orders
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
                Order #{typedOrder.order_number}
              </h1>
              <p className="text-silver-dark text-sm md:text-base">
                Placed on {format(new Date(typedOrder.created_at), "MMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
            <Badge
              variant={
                typedOrder.payment_status === "paid"
                  ? "gold"
                  : typedOrder.payment_status === "failed" || typedOrder.payment_status === "refunded"
                  ? "vine"
                  : "bronze"
              }
              className="text-sm px-4 py-2"
            >
              {typedOrder.payment_status?.toUpperCase() || "PENDING"}
            </Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
          {/* Left Column: Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card className="p-6 md:p-8" shadowVariant="warm-sm">
              <h2 className="serif-display text-xl md:text-2xl text-night mb-6">
                Order Items
              </h2>
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b border-silver-light last:border-0 last:pb-0"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-silver-light">
                      {item.product_image ? (
                        <img
                          src={getPublicUrl("products", item.product_image)}
                          alt={item.product_name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-silver-dark text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-night mb-1">
                        {item.product_name}
                      </h3>
                      {item.sku && (
                        <p className="text-xs text-silver-dark mb-2">SKU: {item.sku}</p>
                      )}
                      <p className="text-sm text-silver-dark">Quantity: {item.quantity}</p>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-semibold text-night">
                        ₹{item.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-silver-dark">
                        Subtotal: ₹{item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t border-silver-light space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-silver-dark">Subtotal</span>
                  <span className="text-night">₹{typedOrder.subtotal?.toFixed(2) || "0.00"}</span>
                </div>
                {typedOrder.shipping_fee && typedOrder.shipping_fee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-silver-dark">Shipping</span>
                    <span className="text-night">₹{typedOrder.shipping_fee.toFixed(2)}</span>
                  </div>
                )}
                {typedOrder.tax_amount && typedOrder.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-silver-dark">Tax</span>
                    <span className="text-night">₹{typedOrder.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                {typedOrder.discount_amount && typedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-silver-dark">Discount</span>
                    <span className="text-green-600">-₹{typedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-4 border-t border-silver-light">
                  <span className="serif-display text-lg font-semibold text-night">Total</span>
                  <span className="serif-display text-xl font-semibold text-gold">
                    ₹{typedOrder.total_amount?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-6 md:p-8" shadowVariant="warm-sm">
              <h2 className="serif-display text-xl md:text-2xl text-night mb-6">
                Order Timeline
              </h2>
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.completed
                            ? "bg-gold text-night"
                            : "bg-silver-light text-silver-dark"
                        }`}
                      >
                        {item.completed ? (
                          <svg
                            className="w-5 h-5"
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
                            className="w-5 h-5"
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
                      {index < timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-8 ml-4 ${
                            item.completed ? "bg-gold/30" : "bg-silver-light"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-night">{item.label}</p>
                      {item.date && (
                        <p className="text-sm text-silver-dark mt-1">
                          {format(new Date(item.date), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      )}
                      {item.details && (
                        <p className="text-xs text-silver-dark mt-1 font-mono">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Summary & Actions */}
          <div className="space-y-6">
            {/* Payment Block */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h3 className="serif-display text-lg text-night mb-4">Payment</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                    Status
                  </p>
                  <Badge
                    variant={
                      typedOrder.payment_status === "paid"
                        ? "gold"
                        : typedOrder.payment_status === "failed" || typedOrder.payment_status === "refunded"
                        ? "vine"
                        : "bronze"
                    }
                  >
                    {typedOrder.payment_status?.toUpperCase() || "PENDING"}
                  </Badge>
                </div>
                {razorpayPaymentId && (
                  <div>
                    <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                      Transaction ID
                    </p>
                    <p className="text-sm font-mono text-night break-all">
                      {razorpayPaymentId}
                    </p>
                  </div>
                )}
                {paidAt && (
                  <div>
                    <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                      Paid At
                    </p>
                    <p className="text-sm text-night">
                      {format(new Date(paidAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
                {canRetryPayment && (
                  <OrderDetailClient
                    orderId={typedOrder.id}
                    razorpayOrderId={razorpayOrderId!}
                    amount={typedOrder.total_amount || 0}
                    currency={typedOrder.currency || "INR"}
                  />
                )}
              </div>
            </Card>

            {/* Shipping Block */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h3 className="serif-display text-lg text-night mb-4">Shipping</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                    Status
                  </p>
                  <Badge variant={getShippingStatusBadgeVariant(typedOrder.shipping_status)}>
                    {getShippingStatusLabel(typedOrder.shipping_status)}
                  </Badge>
                </div>
                {isInvalidBooking && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-900 font-medium mb-1">
                      Invalid booking – retry required
                    </p>
                    <p className="text-xs text-orange-700">
                      There was an issue with your shipment booking. Please contact support for assistance.
                    </p>
                  </div>
                )}
                {fulfillmentFailed && (
                  <div className="p-3 bg-vine/10 border border-vine/30 rounded-lg">
                    <p className="text-sm text-vine font-medium mb-1">
                      Fulfillment Failed
                    </p>
                    <p className="text-xs text-silver-dark">
                      There was an issue processing your shipment. Please contact support for assistance.
                    </p>
                  </div>
                )}
                {typedOrder.payment_status === "paid" && !awb && !fulfillmentFailed && !isInvalidBooking && typedOrder.shipping_status !== "delivered" && (
                  <p className="text-sm text-silver-dark">
                    {typedOrder.shipping_status === "processing" || typedOrder.shipping_status === "packed"
                      ? "Preparing shipment"
                      : typedOrder.shipping_status === "fulfillment_retry"
                      ? "Retrying fulfillment"
                      : "Auto-fulfillment queued"}
                  </p>
                )}
                {courier && (
                  <div>
                    <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                      Courier
                    </p>
                    <p className="text-sm text-night">{courier}</p>
                  </div>
                )}
                {awb && (
                  <div>
                    <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                      AWB Number
                    </p>
                    <p className="text-sm font-mono text-night">{awb}</p>
                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gold hover:text-gold-dark mt-2 inline-block transition-colors font-medium"
                      >
                        Track Shipment →
                      </a>
                    )}
                    {!trackingUrl && awb && (
                      <a
                        href={`https://shiprocket.co/tracking/${awb}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gold hover:text-gold-dark mt-2 inline-block transition-colors font-medium"
                      >
                        Track Shipment →
                      </a>
                    )}
                  </div>
                )}
                {expectedDelivery && (
                  <div>
                    <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                      Expected Delivery
                    </p>
                    <p className="text-sm text-night">
                      {format(new Date(expectedDelivery), "MMM dd, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {/* Shipping Timeline */}
              {shippingTimelineEvents && shippingTimelineEvents.length > 0 && (
                <div className="mt-6 pt-6 border-t border-silver-light">
                  <h4 className="text-sm font-semibold text-night mb-4">Shipping Timeline</h4>
                  <div className="space-y-3">
                    {formatTimelineEvents(shippingTimelineEvents)
                      .reverse()
                      .map((event, index) => (
                        <div key={`${event.status}_${event.timestamp}`} className="flex items-start gap-3">
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
                            {index < shippingTimelineEvents.length - 1 && (
                              <div
                                className={`w-0.5 h-6 ml-3 ${
                                  event.completed ? "bg-gold/30" : "bg-silver-light"
                                }`}
                              />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
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
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Package Specs */}
            {(packageWeightKg || packageLengthCm || packageBreadthCm || packageHeightCm) && (
              <Card className="p-6" shadowVariant="warm-sm">
                <h3 className="serif-display text-lg text-night mb-4">Package Details</h3>
                <div className="space-y-2 text-sm">
                  {packageWeightKg ? (
                    <div className="flex justify-between">
                      <span className="text-silver-dark">Weight</span>
                      <span className="text-night">{packageWeightKg} kg</span>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-silver-dark">Weight</span>
                      <span className="text-silver-dark italic">
                        Packaging weight not provided
                      </span>
                    </div>
                  )}
                  {packageLengthCm && packageBreadthCm && packageHeightCm && (
                    <div className="flex justify-between">
                      <span className="text-silver-dark">Dimensions</span>
                      <span className="text-night">
                        {packageLengthCm} × {packageBreadthCm} × {packageHeightCm} cm
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-silver-dark mt-3 italic">
                    Final shipping weight charged may vary.
                  </p>
                </div>
              </Card>
            )}

            {/* Support Actions */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h3 className="serif-display text-lg text-night mb-4">Support</h3>
              <div className="space-y-3">
                {lastSupportTicket && (
                  <div className="p-3 bg-cream/30 rounded-lg border border-silver-light">
                    <p className="text-xs text-silver-dark mb-1">Last Ticket</p>
                    <p className="text-sm text-night line-clamp-2">
                      {lastSupportTicket.message}
                    </p>
                    <Badge
                      variant={
                        lastSupportTicket.status === "resolved"
                          ? "gold"
                          : lastSupportTicket.status === "open"
                          ? "bronze"
                          : "outline"
                      }
                      className="mt-2"
                    >
                      {lastSupportTicket.status}
                    </Badge>
                  </div>
                )}
                <SupportModal orderId={typedOrder.id} orderNumber={typedOrder.order_number} />
                {canCancel && (
                  <form action={`/api/orders/cancel?order_id=${typedOrder.id}`} method="POST">
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full text-sm"
                    >
                      Cancel Order
                    </Button>
                  </form>
                )}
                {canReturn && (
                  <form action={`/api/orders/return?order_id=${typedOrder.id}`} method="POST">
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full text-sm"
                    >
                      Request Return
                    </Button>
                  </form>
                )}
              </div>
            </Card>

            {/* Admin Debug Panel */}
            {isAdmin && (
              <Card className="p-6 border-2 border-gold" shadowVariant="warm-sm">
                <h3 className="serif-display text-lg text-night mb-4">Admin Debug</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-silver-dark uppercase tracking-wide mb-1">
                      Payment Attempts
                    </p>
                    <p className="text-night font-mono">{paymentAttempts}</p>
                  </div>
                  {pendingExpiresAt && (
                    <div>
                      <p className="text-silver-dark uppercase tracking-wide mb-1">
                        Pending Expires At
                      </p>
                      <p className="text-night font-mono">
                        {format(pendingExpiresAt, "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  )}
                  {razorpayOrderId && (
                    <div>
                      <p className="text-silver-dark uppercase tracking-wide mb-1">
                        Razorpay Order ID
                      </p>
                      <p className="text-night font-mono break-all">{razorpayOrderId}</p>
                    </div>
                  )}
                  {razorpaySignature && (
                    <div>
                      <p className="text-silver-dark uppercase tracking-wide mb-1">
                        Signature
                      </p>
                      <p className="text-night font-mono break-all text-[10px]">
                        {razorpaySignature.substring(0, 50)}...
                      </p>
                    </div>
                  )}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-silver-dark hover:text-night">
                      View Raw Webhook Payload
                    </summary>
                    <pre className="mt-2 p-3 bg-night text-offwhite rounded text-[10px] overflow-auto max-h-48">
                      {JSON.stringify(paymentResponse, null, 2)}
                    </pre>
                  </details>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
