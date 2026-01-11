"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Truck, Package, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface ShippingUpdateFormProps {
  orderId: string;
  currentStatus: string | null;
  currentCourier?: string | null;
  currentAwb?: string | null;
  currentExpectedDelivery?: string | null;
}

const SHIPPING_STATUSES = [
  { value: "not_shipped", label: "Not Shipped" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "packed", label: "Packed" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "shipped", label: "Shipped" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "delayed", label: "Delayed" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function ShippingUpdateForm({
  orderId,
  currentStatus,
  currentCourier,
  currentAwb,
  currentExpectedDelivery,
}: ShippingUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus || "pending");
  const [courier, setCourier] = useState(currentCourier || "");
  const [awb, setAwb] = useState(currentAwb || "");
  const [expectedDelivery, setExpectedDelivery] = useState(
    currentExpectedDelivery || ""
  );
  const [notes, setNotes] = useState("");
  const { addToast } = useToastWithCompat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate: if courier provided, AWB must also be provided
      if (courier && !awb) {
        addToast("AWB is required when courier is provided", "error");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/shipping/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          new_shipping_status: status,
          courier: courier || undefined,
          awb: awb || undefined,
          expected_delivery: expectedDelivery || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update shipping status");
      }

      addToast("Shipping status updated successfully", "success");
      // Reload page to show updated status
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      addToast(error.message || "Failed to update shipping status", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-night mb-2">
          Shipping Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none text-sm"
          disabled={loading}
        >
          {SHIPPING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-night mb-2">
          Courier Name (Optional)
        </label>
        <input
          type="text"
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          placeholder="e.g., Blue Dart, FedEx"
          className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none text-sm"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-night mb-2">
          AWB Number (Required if courier provided)
        </label>
        <input
          type="text"
          value={awb}
          onChange={(e) => setAwb(e.target.value)}
          placeholder="e.g., AWB123456789"
          className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none text-sm font-mono"
          disabled={loading}
        />
        {courier && !awb && (
          <p className="text-xs text-vine mt-1">
            AWB is required when courier is provided
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-night mb-2">
          Expected Delivery Date (Optional)
        </label>
        <input
          type="date"
          value={expectedDelivery}
          onChange={(e) => setExpectedDelivery(e.target.value)}
          className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none text-sm"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-night mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this shipping update..."
          rows={3}
          className="w-full px-3 py-2 border border-silver-light rounded-md bg-white focus:ring-1 focus:ring-gold/50 outline-none text-sm resize-none"
          disabled={loading}
        />
      </div>

      <AdminButton
        type="submit"
        disabled={loading}
        className="w-full"
        icon={Truck}
      >
        {loading ? "Updating..." : "Update Shipping Status"}
      </AdminButton>
    </form>
  );
}








