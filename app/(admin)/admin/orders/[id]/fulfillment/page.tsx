"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Package, RefreshCw, Truck, AlertCircle, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function FulfillmentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { addToast } = useToastWithCompat();

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [shiprocketPayload, setShiprocketPayload] = useState<any>(null);
  const [webhookHistory, setWebhookHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) throw new Error("Failed to fetch order");
      const data = await response.json();
      setOrder(data.order);

      // Extract Shiprocket payload and webhook history
      const metadata = data.order?.metadata || {};
      setShiprocketPayload(metadata.shiprocket_payload || metadata.shipping?.shiprocket_response);
      
      // Fetch webhook history from audit logs
      const auditResponse = await fetch(`/api/admin/orders/${orderId}/audit-logs`);
      if (auditResponse.ok) {
        const auditData = await auditResponse.json();
        const webhooks = auditData.logs?.filter(
          (log: any) => log.action === "shiprocket_webhook"
        ) || [];
        setWebhookHistory(webhooks);
      }
    } catch (error: any) {
      addToast(error.message || "Failed to load order details", "error");
    }
  };

  const handleCreateAWB = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fulfillment/on-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create AWB");
      }

      addToast("AWB created successfully!", "success");
      fetchOrderDetails();
    } catch (error: any) {
      addToast(error.message || "Failed to create AWB", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAWB = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fulfillment/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh AWB");
      }

      addToast("AWB status refreshed!", "success");
      fetchOrderDetails();
    } catch (error: any) {
      addToast(error.message || "Failed to refresh AWB", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFulfillment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fulfillment/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to retry fulfillment");
      }

      if (data.results?.[0]?.success) {
        addToast("Fulfillment retried successfully!", "success");
      } else {
        addToast(data.results?.[0]?.error || "Fulfillment retry failed", "error");
      }

      fetchOrderDetails();
    } catch (error: any) {
      addToast(error.message || "Failed to retry fulfillment", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="p-6">
        <p>Loading order details...</p>
      </div>
    );
  }

  const metadata = order.metadata || {};
  const shippingMetadata = metadata.shipping || {};
  const awb = shippingMetadata.awb || null;
  const courier = shippingMetadata.courier || null;
  const trackingUrl = shippingMetadata.tracking_url || null;
  const shipmentId = order.shiprocket_shipment_id;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gold hover:text-gold-dark mb-4 inline-block"
        >
          ← Back to Order
        </button>
        <h1 className="serif-display text-3xl mb-2">
          Fulfillment Controls - {order.order_number}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fulfillment Actions */}
        <Card className="p-6" shadowVariant="warm-sm">
          <h2 className="serif-display text-xl mb-4">Fulfillment Actions</h2>
          <div className="space-y-4">
            {!awb && order.payment_status === "paid" && (
              <AdminButton
                onClick={handleCreateAWB}
                disabled={loading}
                icon={Package}
                className="w-full"
              >
                {loading ? "Creating..." : "Create AWB (Auto-Fulfillment)"}
              </AdminButton>
            )}

            {shipmentId && (
              <AdminButton
                onClick={handleRefreshAWB}
                disabled={loading}
                icon={RefreshCw}
                variant="outline"
                className="w-full"
              >
                {loading ? "Refreshing..." : "Refresh AWB Status"}
              </AdminButton>
            )}

            {order.shipping_status === "fulfillment_failed" && (
              <AdminButton
                onClick={handleRetryFulfillment}
                disabled={loading}
                icon={AlertCircle}
                variant="outline"
                className="w-full"
              >
                {loading ? "Retrying..." : "Retry Failed Fulfillment"}
              </AdminButton>
            )}

            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <AdminButton icon={Truck} variant="outline" className="w-full">
                  View Tracking on Shiprocket
                </AdminButton>
              </a>
            )}
          </div>
        </Card>

        {/* Shipping Status */}
        <Card className="p-6" shadowVariant="warm-sm">
          <h2 className="serif-display text-xl mb-4">Shipping Status</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                Status
              </p>
              <Badge variant={order.shipping_status === "delivered" ? "gold" : "bronze"}>
                {order.shipping_status || "Pending"}
              </Badge>
            </div>

            {awb && (
              <div>
                <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                  AWB Number
                </p>
                <p className="text-sm font-mono text-night">{awb}</p>
              </div>
            )}

            {courier && (
              <div>
                <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                  Courier
                </p>
                <p className="text-sm text-night">{courier}</p>
              </div>
            )}

            {shipmentId && (
              <div>
                <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                  Shipment ID
                </p>
                <p className="text-sm font-mono text-night">{shipmentId}</p>
              </div>
            )}

            {shippingMetadata.expected_delivery && (
              <div>
                <p className="text-xs text-silver-dark uppercase tracking-wide mb-1">
                  Expected Delivery
                </p>
                <p className="text-sm text-night">
                  {new Date(shippingMetadata.expected_delivery).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Shiprocket Payload */}
        {shiprocketPayload && (
          <Card className="p-6 lg:col-span-2" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Last Shiprocket Response</h2>
            <details className="cursor-pointer">
              <summary className="text-sm text-silver-dark hover:text-night mb-2">
                View Raw Payload
              </summary>
              <pre className="mt-2 p-4 bg-night text-offwhite rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(shiprocketPayload, null, 2)}
              </pre>
            </details>
          </Card>
        )}

        {/* Webhook History */}
        {webhookHistory.length > 0 && (
          <Card className="p-6 lg:col-span-2" shadowVariant="warm-sm">
            <h2 className="serif-display text-xl mb-4">Webhook History</h2>
            <div className="space-y-3">
              {webhookHistory.map((webhook: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-offwhite rounded border border-silver-light"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-night">
                        {webhook.details?.event_type || "Unknown Event"}
                      </p>
                      <p className="text-xs text-silver-dark">
                        {new Date(webhook.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {webhook.details?.status || "N/A"}
                    </Badge>
                  </div>
                  <details className="mt-2">
                    <summary className="text-xs text-silver-dark cursor-pointer">
                      View Payload
                    </summary>
                    <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(webhook.details?.payload || webhook.details, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}






