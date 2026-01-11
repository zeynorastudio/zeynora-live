"use client";

/**
 * Phase 4.1 — Order Tracking View Page
 * Displays read-only order tracking information using token
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Package, Truck, MapPin, AlertCircle, CheckCircle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { getShippingStatusLabel, getShippingStatusBadgeVariant } from "@/lib/shipping/timeline";
import { getPublicUrl } from "@/lib/utils/images";

interface OrderTrackingData {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  shipping_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    product_image: string | null;
  }>;
  shipping: {
    courier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    status: string;
    timeline: Array<{
      label: string;
      status: string;
      timestamp: string;
      completed: boolean;
      icon: string;
      courier?: string | null;
      awb?: string | null;
      notes?: string | null;
    }>;
  };
  address_masked: {
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
}

export default function TrackOrderViewPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid tracking link");
      setLoading(false);
      return;
    }

    fetchOrderData();
  }, [token]);

  const fetchOrderData = async () => {
    try {
      const response = await fetch(`/api/orders/track/view?token=${encodeURIComponent(token)}`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Unable to fetch order details");
        setLoading(false);
        return;
      }

      setOrderData(data.order);
      setLoading(false);
    } catch (err: any) {
      console.error("[TRACK_ORDER_VIEW] Error:", err);
      setError("Unable to fetch order details. Please try again.");
      setLoading(false);
    }
  };

  const getStatusIcon = (icon: string) => {
    switch (icon) {
      case "check":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "clock":
        return <Clock className="w-5 h-5 text-silver-dark" />;
      case "package":
        return <Package className="w-5 h-5 text-bronze" />;
      case "truck":
        return <Truck className="w-5 h-5 text-bronze" />;
      case "alert":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "x":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-silver-dark" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-silver-light mx-auto mb-4 animate-spin" />
            <p className="text-silver-dark">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center" shadowVariant="warm-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="serif-display text-xl text-night mb-2">
              {error || "Order not found"}
            </h2>
            <p className="text-silver-dark mb-6 text-sm">
              {error === "Tracking expired"
                ? "This order tracking link has expired. Please contact support for assistance."
                : "Unable to load order details. Please check your tracking link and try again."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/track-order">
                <Button variant="outline">Track Another Order</Button>
              </Link>
              <Link href="/support/shipping">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4 md:py-12 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-silver-dark hover:text-night transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
          <h1 className="serif-display text-3xl md:text-4xl text-night mb-2">
            Order Tracking
          </h1>
          <p className="text-silver-dark text-sm md:text-base">
            Order #{orderData.order_number}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card className="p-6" shadowVariant="warm-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="serif-display text-xl text-night">Order Status</h2>
                <Badge variant={getShippingStatusBadgeVariant(orderData.shipping_status)}>
                  {getShippingStatusLabel(orderData.shipping_status)}
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-silver-dark">Order Number</span>
                  <span className="font-mono font-semibold text-night">{orderData.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver-dark">Order Date</span>
                  <span className="text-night">
                    {format(new Date(orderData.created_at), "MMM dd, yyyy 'at' h:mm a")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver-dark">Payment Status</span>
                  <Badge
                    variant={
                      orderData.payment_status === "paid"
                        ? "gold"
                        : orderData.payment_status === "pending"
                        ? "bronze"
                        : "vine"
                    }
                  >
                    {orderData.payment_status.charAt(0).toUpperCase() + orderData.payment_status.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-silver-dark">Total Amount</span>
                  <span className="serif-display text-xl text-gold font-semibold">
                    {orderData.currency} {orderData.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Shipping Timeline */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h2 className="serif-display text-xl text-night mb-6">Shipping Timeline</h2>
              {orderData.shipping.timeline.length > 0 ? (
                <div className="space-y-4">
                  {orderData.shipping.timeline.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0 pt-1">
                        {getStatusIcon(event.icon)}
                      </div>
                      <div className="flex-1 pb-4 border-b border-silver-light last:border-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-medium text-night">{event.label}</h3>
                          <span className="text-xs text-silver-dark">
                            {format(new Date(event.timestamp), "MMM dd, h:mm a")}
                          </span>
                        </div>
                        {event.courier && (
                          <p className="text-sm text-silver-dark">Courier: {event.courier}</p>
                        )}
                        {event.awb && (
                          <p className="text-sm text-silver-dark font-mono">AWB: {event.awb}</p>
                        )}
                        {event.notes && (
                          <p className="text-sm text-silver-dark mt-1">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-silver-light mx-auto mb-4" />
                  <p className="text-silver-dark">No shipping updates yet</p>
                </div>
              )}
            </Card>

            {/* Order Items */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h2 className="serif-display text-xl text-night mb-6">
                Order Items ({orderData.items.length})
              </h2>
              <div className="space-y-4">
                {orderData.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-silver-light last:border-0">
                    {item.product_image && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-offwhite">
                        <img
                          src={getPublicUrl(item.product_image)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-night mb-1">{item.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-silver-dark">
                          Quantity: {item.quantity}
                        </span>
                        <span className="text-sm font-semibold text-night">
                          {orderData.currency} {(item.subtotal / item.quantity).toFixed(2)} × {item.quantity} = {orderData.currency} {item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipping Details */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h2 className="serif-display text-xl text-night mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gold" />
                Shipping Details
              </h2>
              <div className="space-y-3">
                {orderData.shipping.courier && (
                  <div>
                    <span className="text-xs text-silver-dark uppercase tracking-wide">Courier</span>
                    <p className="text-sm font-medium text-night mt-1">{orderData.shipping.courier}</p>
                  </div>
                )}
                {orderData.shipping.tracking_number && (
                  <div>
                    <span className="text-xs text-silver-dark uppercase tracking-wide">Tracking Number</span>
                    <p className="text-sm font-mono text-night mt-1">{orderData.shipping.tracking_number}</p>
                  </div>
                )}
                {orderData.shipping.tracking_url && (
                  <div className="pt-2">
                    <a
                      href={orderData.shipping.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-darker"
                    >
                      <Truck className="w-4 h-4" />
                      Track on Courier Website
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Delivery Address (Masked) */}
            {(orderData.address_masked.city ||
              orderData.address_masked.state ||
              orderData.address_masked.pincode) && (
              <Card className="p-6" shadowVariant="warm-sm">
                <h2 className="serif-display text-xl text-night mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gold" />
                  Delivery Location
                </h2>
                <div className="space-y-1">
                  {orderData.address_masked.city && (
                    <p className="text-sm text-night">{orderData.address_masked.city}</p>
                  )}
                  {orderData.address_masked.state && (
                    <p className="text-sm text-night">{orderData.address_masked.state}</p>
                  )}
                  {orderData.address_masked.pincode && (
                    <p className="text-sm text-night">{orderData.address_masked.pincode}</p>
                  )}
                </div>
              </Card>
            )}

            {/* Help */}
            <Card className="p-6" shadowVariant="warm-sm">
              <h2 className="serif-display text-xl text-night mb-4">Need Help?</h2>
              <p className="text-sm text-silver-dark mb-4">
                If you have any questions about your order, please contact our support team.
              </p>
              <Link href="/support/shipping">
                <Button variant="outline" className="w-full">
                  Contact Support
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}










