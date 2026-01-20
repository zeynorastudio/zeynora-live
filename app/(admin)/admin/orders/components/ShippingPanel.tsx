"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Truck, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface ShippingPanelProps {
  order: any;
  userRole?: "super_admin" | "admin" | "staff";
}

/**
 * Shipping Panel Component
 * Phase 3.3: Shows shipment information based on user role
 * 
 * Super Admin: Sees shipment ID, courier, shipping cost analytics
 * Admin: Sees shipment ID, shipment status, shipping cost
 * Staff: Sees Order ID, Shipment ID, Shipment status (can update Packed/Ready to ship)
 */
export default function ShippingPanel({ order, userRole = "admin" }: ShippingPanelProps) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToastWithCompat();

  // Extract shipment details from order
  const shipmentId = order.shiprocket_shipment_id;
  const shipmentStatus = order.shipment_status || "pending";
  const courierName = order.courier_name;
  const shippingStatus = order.shipping_status || "pending";
  
  // Extract from metadata (fallback)
  const metadata = (order.metadata as Record<string, any>) || {};
  const shippingMetadata = metadata.shipping || {};
  const awbCode = shippingMetadata.awb || null;
  const trackingUrl = shippingMetadata.tracking_url || null;

  // Check if shipment creation failed
  const shipmentFailed = shipmentStatus === "failed" || metadata.shipment_error;

  // CRITICAL: Check for invalid booking - BOOKED status but no shipment_id
  const isInvalidBooking = shipmentStatus === "BOOKED" && !shipmentId;

  const handleRetryShipment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create shipment");
      addToast("Shipment created successfully!", "success");
      window.location.reload();
    } catch (e: any) {
      addToast(e.message || "Failed to create shipment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShippingStatus = async (newStatus: string) => {
    // Only staff can update shipping status to Packed/Ready to ship
    if (userRole !== "staff" && userRole !== "admin" && userRole !== "super_admin") {
      addToast("You don't have permission to update shipping status", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shipping/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          new_shipping_status: newStatus,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      addToast("Shipping status updated!", "success");
      window.location.reload();
    } catch (e: any) {
      addToast(e.message || "Failed to update status", "error");
    } finally {
      setLoading(false);
    }
  };

  const getShipmentStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Pending</Badge>;
    const statusLower = status.toLowerCase();
    if (statusLower === "created") return <Badge variant="default">Created</Badge>;
    if (statusLower === "shipped") return <Badge variant="vine">Shipped</Badge>;
    if (statusLower === "delivered") return <Badge variant="success">Delivered</Badge>;
    if (statusLower === "failed") return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="bg-white border p-6 rounded-lg shadow-sm">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Truck className="w-5 h-5 text-gold" /> Shipping
      </h3>

      {/* Invalid Booking Warning - BOOKED but no shipment_id */}
      {isInvalidBooking && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">
              Invalid booking – retry required
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Order is marked as BOOKED but has no shipment ID. This indicates a booking error.
            </p>
            {userRole === "super_admin" && (
              <AdminButton
                size="sm"
                variant="outline"
                onClick={handleRetryShipment}
                disabled={loading}
                className="mt-2"
              >
                {loading ? "Retrying..." : "Retry Shipment Creation"}
              </AdminButton>
            )}
          </div>
        </div>
      )}

      {/* Shipment Failed Warning */}
      {shipmentFailed && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              Shipment not created – requires attention
            </p>
            {metadata.shipment_error && (
              <p className="text-xs text-red-700 mt-1">{metadata.shipment_error}</p>
            )}
            {userRole === "super_admin" && (
              <AdminButton
                size="sm"
                variant="outline"
                onClick={handleRetryShipment}
                disabled={loading}
                className="mt-2"
              >
                {loading ? "Retrying..." : "Retry Shipment Creation"}
              </AdminButton>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {/* Shipping Status */}
        <div className="flex justify-between items-center">
          <span className="text-silver-dark">Shipping Status</span>
          <span className="font-medium capitalize">{shippingStatus}</span>
        </div>

        {/* Shipment Status */}
        <div className="flex justify-between items-center">
          <span className="text-silver-dark">Shipment Status</span>
          {/* Hide BOOKED badge if shipment_id is missing (invalid booking) */}
          {isInvalidBooking ? (
            <Badge variant="destructive">Invalid Booking</Badge>
          ) : (
            getShipmentStatusBadge(shipmentStatus)
          )}
        </div>

        {/* Shipment ID - Visible to all roles */}
        {shipmentId && (
          <div className="flex justify-between">
            <span className="text-silver-dark">Shipment ID</span>
            <span className="font-mono text-sm">{shipmentId}</span>
          </div>
        )}

        {/* Courier Name - Visible to super_admin and admin */}
        {(userRole === "super_admin" || userRole === "admin") && courierName && (
          <div className="flex justify-between">
            <span className="text-silver-dark">Courier</span>
            <span>{courierName}</span>
          </div>
        )}

        {/* AWB Code */}
        {awbCode && (
          <div className="flex justify-between">
            <span className="text-silver-dark">AWB Code</span>
            <span className="font-mono text-sm">{awbCode}</span>
          </div>
        )}

        {/* Shipping Cost - Only visible to super_admin and admin */}
        {(userRole === "super_admin" || userRole === "admin") && order.internal_shipping_cost !== undefined && (
          <div className="flex justify-between">
            <span className="text-silver-dark">Shipping Cost</span>
            <span>₹{(order.internal_shipping_cost || 0).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {/* Staff: Can update shipping status to Packed/Ready to ship */}
        {userRole === "staff" && (
          <>
            {shippingStatus === "processing" && (
              <AdminButton
                onClick={() => handleUpdateShippingStatus("processing")}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Mark as Packed
              </AdminButton>
            )}
            {shippingStatus === "processing" && (
              <AdminButton
                onClick={() => handleUpdateShippingStatus("processing")}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Ready to Ship
              </AdminButton>
            )}
          </>
        )}

        {/* Super Admin: Retry shipment creation if failed */}
        {userRole === "super_admin" && shipmentFailed && (
          <AdminButton
            onClick={handleRetryShipment}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Retrying..." : "Retry Shipment Creation"}
          </AdminButton>
        )}

        {/* Track Shipment - If AWB available */}
        {awbCode && trackingUrl && (
          <AdminButton
            variant="outline"
            className="w-full"
            onClick={() => window.open(trackingUrl, "_blank")}
          >
            Track Shipment
          </AdminButton>
        )}
      </div>
    </div>
  );
}

