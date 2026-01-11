/**
 * Phase 4.3 — Returns Dashboard Client Component
 * Handles return requests display and actions
 */

"use client";

import { useState, useEffect } from "react";
import type { ReturnRequest } from "@/types/returns";

type ReturnStatus = ReturnRequest["status"];

export default function ReturnsClient() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ReturnStatus | "all">("all");
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);

  useEffect(() => {
    fetchReturns();
  }, [selectedStatus]);

  async function fetchReturns() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/returns/list${selectedStatus !== "all" ? `?status=${selectedStatus}` : ""}`
      );
      const data = await response.json();
      if (data.success) {
        setReturns(data.returns || []);
      }
    } catch (error) {
      console.error("Failed to fetch returns:", error);
    } finally {
      setLoading(false);
    }
  }

  const statusTabs: Array<{ value: ReturnStatus | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "requested", label: "Requested" },
    { value: "approved", label: "Approved" },
    { value: "pickup_scheduled", label: "Pickup Scheduled" },
    { value: "in_transit", label: "In Transit" },
    { value: "received", label: "Received" },
    { value: "credited", label: "Credited" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="border-b border-silver-light">
        <nav className="flex space-x-4">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                selectedStatus === tab.value
                  ? "border-night text-night font-medium"
                  : "border-transparent text-silver-dark hover:text-night"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="text-center py-12 text-silver-dark">Loading returns...</div>
      ) : returns.length === 0 ? (
        <div className="text-center py-12 text-silver-dark">No returns found</div>
      ) : (
        <div className="space-y-4">
          {returns.map((returnRequest) => (
            <div
              key={returnRequest.id}
              className="border border-silver-light rounded-lg p-4 hover:bg-silver-light/30 cursor-pointer transition-colors"
              onClick={() => setSelectedReturn(returnRequest)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-night">
                    Return #{returnRequest.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-silver-dark mt-1">
                    Order: {returnRequest.order?.order_number || returnRequest.order_id}
                  </p>
                  <p className="text-sm text-silver-dark">
                    Status: <span className="capitalize">{returnRequest.status}</span>
                  </p>
                  <p className="text-sm text-silver-dark mt-1">
                    Reason: {returnRequest.reason}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      returnRequest.status === "requested"
                        ? "bg-yellow-100 text-yellow-800"
                        : returnRequest.status === "approved"
                        ? "bg-blue-100 text-blue-800"
                        : returnRequest.status === "credited"
                        ? "bg-green-100 text-green-800"
                        : returnRequest.status === "rejected" || returnRequest.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {returnRequest.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Return Detail Modal */}
      {selectedReturn && (
        <ReturnDetailModal
          returnRequest={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onAction={() => {
            fetchReturns();
            setSelectedReturn(null);
          }}
        />
      )}
    </div>
  );
}

function ReturnDetailModal({
  returnRequest,
  onClose,
  onAction,
}: {
  returnRequest: ReturnRequest;
  onClose: () => void;
  onAction: () => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  async function handleApprove() {
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/returns/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_request_id: returnRequest.id,
          admin_notes: adminNotes || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        onAction();
      } else {
        alert(data.error || "Failed to approve return");
      }
    } catch (error) {
      alert("Failed to approve return");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!adminNotes.trim()) {
      alert("Admin notes are required for rejection");
      return;
    }
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/returns/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_request_id: returnRequest.id,
          admin_notes: adminNotes,
        }),
      });
      const data = await response.json();
      if (data.success) {
        onAction();
      } else {
        alert(data.error || "Failed to reject return");
      }
    } catch (error) {
      alert("Failed to reject return");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTriggerPickup() {
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/returns/trigger-pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_request_id: returnRequest.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        onAction();
      } else {
        alert(data.error || "Failed to trigger pickup");
      }
    } catch (error) {
      alert("Failed to trigger pickup");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmReceived() {
    try {
      setActionLoading(true);
      const response = await fetch("/api/admin/returns/confirm-received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_request_id: returnRequest.id,
          admin_notes: adminNotes || undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert(`Credit issued: ₹${data.credit_amount}`);
        onAction();
      } else {
        alert(data.error || "Failed to confirm receipt");
      }
    } catch (error) {
      alert("Failed to confirm receipt");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">Return Details</h2>
          <button onClick={onClose} className="text-silver-dark hover:text-night">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <strong>Return ID:</strong> {returnRequest.id}
          </div>
          <div>
            <strong>Order:</strong> {returnRequest.order?.order_number || returnRequest.order_id}
          </div>
          <div>
            <strong>Status:</strong> <span className="capitalize">{returnRequest.status}</span>
          </div>
          <div>
            <strong>Reason:</strong> {returnRequest.reason}
          </div>
          {returnRequest.admin_notes && (
            <div>
              <strong>Admin Notes:</strong> {returnRequest.admin_notes}
            </div>
          )}
          {returnRequest.pickup_retry_count > 0 && (
            <div>
              <strong>Pickup Retries:</strong> {returnRequest.pickup_retry_count}/2
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Admin Notes</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full border border-silver-light rounded p-2"
              rows={3}
              placeholder="Add notes..."
            />
          </div>

          <div className="flex gap-2 mt-6">
            {returnRequest.status === "requested" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {returnRequest.status === "approved" && (
              <button
                onClick={handleTriggerPickup}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Trigger Pickup
              </button>
            )}
            {(returnRequest.status === "in_transit" || returnRequest.status === "received") && (
              <button
                onClick={handleConfirmReceived}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                Confirm Received & Issue Credit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

