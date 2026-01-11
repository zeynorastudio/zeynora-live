"use client";

import { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import Button from "@/components/ui/Button";

interface UseCreditsProps {
  cartTotal: number;
  shippingFee: number;
  onCreditsApplied: (amount: number) => void;
  appliedCredits: number;
}

export default function UseCredits({
  cartTotal,
  shippingFee,
  onCreditsApplied,
  appliedCredits,
}: UseCreditsProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useCredits, setUseCredits] = useState(false);

  const grandTotal = cartTotal + shippingFee;

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/wallet/balance");
      const data = await response.json();

      if (data.success) {
        setBalance(data.balance || 0);
      } else {
        setError("Failed to load wallet balance");
      }
    } catch (err) {
      setError("Failed to load wallet balance");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCredits = () => {
    if (!useCredits) {
      // Apply credits
      const maxCredits = Math.min(balance || 0, grandTotal);
      if (maxCredits > 0) {
        setUseCredits(true);
        onCreditsApplied(maxCredits);
      }
    } else {
      // Remove credits
      setUseCredits(false);
      onCreditsApplied(0);
    }
  };

  const handleMaxCredits = () => {
    if (balance && balance > 0) {
      const maxCredits = Math.min(balance, grandTotal);
      setUseCredits(true);
      onCreditsApplied(maxCredits);
    }
  };

  if (loading) {
    return (
      <div className="mb-4 p-4 bg-offwhite border border-silver-light rounded-lg">
        <p className="text-sm text-silver-dark">Loading wallet balance...</p>
      </div>
    );
  }

  if (error || balance === null) {
    return null; // Don't show credits option if balance can't be loaded
  }

  if (balance === 0) {
    return null; // Don't show if no credits available
  }

  const availableCredits = Math.min(balance, grandTotal);
  const remainingAfterCredits = grandTotal - appliedCredits;

  return (
    <div className="mb-6 pb-6 border-b border-silver">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-5 h-5 text-gold" />
        <h3 className="sans-base font-medium text-night">Store Credits</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-night">Available Credits</p>
            <p className="text-xs text-silver-dark">
              ₹{balance.toLocaleString()} available
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-night">
              ₹{availableCredits.toLocaleString()} can be used
            </p>
          </div>
        </div>

        {appliedCredits > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-800">
                Credits Applied: ₹{appliedCredits.toLocaleString()}
              </span>
              <button
                onClick={() => {
                  setUseCredits(false);
                  onCreditsApplied(0);
                }}
                className="text-xs text-green-700 hover:text-green-900 underline"
              >
                Remove
              </button>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Remaining to pay: ₹{remainingAfterCredits.toLocaleString()}
            </p>
          </div>
        )}

        {appliedCredits === 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleToggleCredits}
              variant="outline"
              className="flex-1"
              disabled={availableCredits === 0}
            >
              Use ₹{availableCredits.toLocaleString()} Credits
            </Button>
            {balance > grandTotal && (
              <Button
                onClick={handleMaxCredits}
                variant="subtle"
                className="text-xs"
              >
                Use Max
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




















