"use client";

import { useState } from "react";
import { Wallet, Check, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface ReleaseCreditsButtonProps {
  orderId: string;
  orderNumber: string;
}

export default function ReleaseCreditsButton({
  orderId,
  orderNumber,
}: ReleaseCreditsButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReleaseCredits = async () => {
    if (!confirm(`Release store credits for return of order ${orderNumber}?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/returns/release-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to release credits");
      }

      if (data.success) {
        setSuccess(`Credits released: ₹${data.refund_amount.toLocaleString()}`);
        // Reload page after 2 seconds to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to release credits");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border p-6 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-gold" />
        <h3 className="font-bold text-lg">Release Store Credits</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <p className="text-sm text-silver-dark mb-4">
        After warehouse verification, release store credits for this return. Credits will be
        calculated as: Product Price - Shipping Fee
      </p>

      <Button
        onClick={handleReleaseCredits}
        disabled={loading || !!success}
        variant="default"
        className="w-full"
      >
        {loading ? "Processing..." : success ? "Credits Released" : "Release Credits"}
      </Button>
    </div>
  );
}




















