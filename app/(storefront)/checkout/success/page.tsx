/**
 * Order Confirmation Page (ASYNC-STABLE)
 * 
 * Production-grade implementation with webhook timing resilience.
 * 
 * KEY PRINCIPLES:
 * - Uses order.metadata snapshots ONLY (no live product queries)
 * - Supports both guest and logged-in users
 * - No authentication dependency
 * - No price recalculation
 * - Race-condition immune (uses pre-captured data)
 * - Handles async webhook timing with polling
 * - Never redirects (shows appropriate state instead)
 */

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import type {
  OrderMetadata,
  CustomerSnapshot,
  OrderItemSnapshot,
} from "@/types/orders";

// Types for order data fetched from DB
interface OrderConfirmationData {
  id: string;
  order_number: string;
  subtotal: number | null;
  shipping_fee: number | null;
  total_amount: number | null;
  payment_status: string | null;
  created_at: string;
  metadata: OrderMetadata | null;
}

// Fallback component for missing order
function OrderNotFound() {
  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h1 className="serif-display text-2xl text-night mb-4">
            Order Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            We couldn&apos;t find the order you&apos;re looking for. This may happen if
            the order ID is invalid or the order doesn&apos;t exist.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/track-order"
              className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors font-medium"
            >
              Track an Order
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gold text-gold rounded-lg hover:bg-gold/5 transition-colors font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fallback component for missing metadata
function MetadataMissing({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
              <svg
                className="w-10 h-10 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h1 className="serif-display text-2xl text-night mb-4">
            Order Details Unavailable
          </h1>
          <p className="text-gray-600 mb-4">
            Your order <span className="font-semibold">{orderNumber}</span> was
            placed successfully, but detailed information is temporarily
            unavailable.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Please contact our support team for assistance with your order.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/track-order?order_number=${orderNumber}`}
              className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors font-medium"
            >
              Track Order
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-gold text-gold rounded-lg hover:bg-gold/5 transition-colors font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Order item row component
function OrderItemRow({ item }: { item: OrderItemSnapshot }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-silver/50 last:border-b-0">
      <div className="flex-1">
        <p className="font-medium text-night">{item.product_name}</p>
        <div className="text-sm text-gray-500 mt-1 space-x-3">
          <span>SKU: {item.sku}</span>
          <span>•</span>
          <span>Size: {item.size}</span>
          <span>•</span>
          <span>Qty: {item.quantity}</span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          ₹{item.selling_price.toLocaleString("en-IN")} × {item.quantity}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-night">
          ₹{item.subtotal.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

// Shipping address component
function ShippingAddress({ address }: { address: CustomerSnapshot["address"] }) {
  return (
    <div className="bg-cream rounded-lg p-6 text-left">
      <h2 className="font-semibold text-night mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Shipping Address
      </h2>
      <div className="text-sm text-gray-700 space-y-1">
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}, {address.state} {address.pincode}
        </p>
        <p>{address.country}</p>
      </div>
    </div>
  );
}

// Payment status badge
function PaymentStatusBadge({ status }: { status: string }) {
  const isPaid = status === "paid";
  const isPending = status === "pending";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
        isPaid
          ? "bg-green-100 text-green-700"
          : isPending
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {isPaid ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ) : isPending ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {isPaid ? "Paid" : isPending ? "Processing" : status}
    </span>
  );
}

// Main confirmation content component
function ConfirmationContent({ order }: { order: OrderConfirmationData }) {
  const metadata = order.metadata;

  // Handle missing metadata gracefully
  if (!metadata || !metadata.customer_snapshot || !metadata.items_snapshot) {
    return <MetadataMissing orderNumber={order.order_number} />;
  }

  const customerSnapshot = metadata.customer_snapshot;
  const itemsSnapshot = metadata.items_snapshot;
  const shippingMetadata = metadata.shipping;
  const checkoutSource = metadata.checkout_source;

  // Use stored values (no recalculation)
  const subtotal = order.subtotal ?? 0;
  const shippingCost = order.shipping_fee ?? 0;
  const total = order.total_amount ?? 0;

  const isPaid = order.payment_status === "paid";
  const isPending = order.payment_status === "pending";
  const isGuest = checkoutSource === "guest";

  return (
    <div className="min-h-screen bg-offwhite py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Status Icon */}
          <div className="text-center mb-6">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                isPaid ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              {isPaid ? (
                <svg
                  className="w-10 h-10 text-green-600"
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
                  className="w-10 h-10 text-yellow-600"
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

          {/* Title */}
          <h1 className="serif-display text-3xl text-night text-center mb-2">
            {isPaid ? "Order Confirmed" : "Payment Processing"}
          </h1>

          {/* Order Number */}
          <p className="text-center text-gray-600 mb-6">
            Order Number:{" "}
            <span className="font-semibold text-night">
              {order.order_number}
            </span>
          </p>

          {/* Payment Status */}
          <div className="flex justify-center mb-6">
            <PaymentStatusBadge status={order.payment_status ?? "unknown"} />
          </div>

          {/* Status Message */}
          <p className="text-center text-gray-600 max-w-md mx-auto">
            {isPaid
              ? `Thank you, ${customerSnapshot.name}! Your order has been confirmed and is being prepared for shipment.`
              : isPending
              ? "We're confirming your payment. This may take a few seconds."
              : "Your order status is being verified. Please check back later."}
          </p>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="font-semibold text-night mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            Order Items ({itemsSnapshot.length})
          </h2>

          <div className="divide-y divide-silver/30">
            {itemsSnapshot.map((item, idx) => (
              <OrderItemRow key={`${item.sku}-${idx}`} item={item} />
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="font-semibold text-night mb-4">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-night">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">
                Shipping
                {shippingMetadata?.courier_name && (
                  <span className="text-gray-400 ml-1">
                    ({shippingMetadata.courier_name})
                  </span>
                )}
              </span>
              <span className="text-night">
                {shippingCost === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  `₹${shippingCost.toLocaleString("en-IN")}`
                )}
              </span>
            </div>

            <div className="flex justify-between pt-3 border-t border-silver">
              <span className="font-semibold text-night">Total</span>
              <span className="font-bold text-night text-lg">
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Address Section */}
        {customerSnapshot.address && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <ShippingAddress address={customerSnapshot.address} />
          </div>
        )}

        {/* Order Details Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="font-semibold text-night mb-4">Order Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Customer Name</span>
              <p className="font-medium text-night">{customerSnapshot.name}</p>
            </div>
            <div>
              <span className="text-gray-600">Contact</span>
              <p className="font-medium text-night">{customerSnapshot.phone}</p>
              {customerSnapshot.email && (
                <p className="text-gray-500 text-xs">{customerSnapshot.email}</p>
              )}
            </div>
            <div>
              <span className="text-gray-600">Order Date</span>
              <p className="font-medium text-night">
                {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
              </p>
            </div>
            {shippingMetadata?.estimated_days && (
              <div>
                <span className="text-gray-600">Estimated Delivery</span>
                <p className="font-medium text-night">
                  {shippingMetadata.estimated_days} business days
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Conditional link based on checkout source */}
            {isGuest ? (
              <Link
                href={`/track-order?order_number=${order.order_number}`}
                className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors font-medium text-center"
              >
                Track Your Order
              </Link>
            ) : (
              <Link
                href={`/account/orders/${order.id}`}
                className="px-6 py-3 bg-gold text-white rounded-lg hover:bg-gold/90 transition-colors font-medium text-center"
              >
                View Order Details
              </Link>
            )}
            <Link
              href="/"
              className="px-6 py-3 border border-gold text-gold rounded-lg hover:bg-gold/5 transition-colors font-medium text-center"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Guest checkout info */}
          {isGuest && (
            <p className="text-center text-gray-500 text-sm mt-6">
              You can track your order anytime using the order number:{" "}
              <span className="font-mono font-medium">{order.order_number}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  const [order, setOrder] = useState<OrderConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch order function
  const fetchOrder = async () => {
    if (!orderNumber) {
      setError("No order number provided");
      setLoading(false);
      return;
    }

    try {
      // Use public API route that uses service role client
      // This bypasses RLS and works for both guest and logged-in orders
      const apiResponse = await fetch(`/api/orders/by-number?order_number=${orderNumber}`);
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setOrder(apiData as OrderConfirmationData);
        setError(null);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      console.error("[ORDER_CONFIRMATION] Fetch error:", err);
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  // Polling: Refetch every 3 seconds if payment is pending
  useEffect(() => {
    if (!order || order.payment_status === "paid") {
      return; // Stop polling if paid or no order
    }

    const intervalId = setInterval(() => {
      console.log("[ORDER_CONFIRMATION] Polling for payment status update");
      fetchOrder();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.payment_status, orderNumber]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - show OrderNotFound instead of redirecting
  if (error || !order) {
    return <OrderNotFound />;
  }

  // Render confirmation content
  return <ConfirmationContent order={order} />;
}
