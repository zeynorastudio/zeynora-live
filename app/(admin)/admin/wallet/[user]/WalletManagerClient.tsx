"use client";

import { useState } from "react";
import { Plus, Minus, History, AlertCircle, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

interface WalletManagerClientProps {
  userId: string;
  userName: string;
  initialBalance: number;
  initialTransactions: Transaction[];
  adminUserId: string;
}

export default function WalletManagerClient({
  userId,
  userName,
  initialBalance,
  initialTransactions,
  adminUserId,
}: WalletManagerClientProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add credits form
  const [addAmount, setAddAmount] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addReference, setAddReference] = useState("");

  // Deduct credits form
  const [deductAmount, setDeductAmount] = useState("");
  const [deductNotes, setDeductNotes] = useState("");
  const [deductReference, setDeductReference] = useState("");

  // Redeem code form
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemingCode, setRedeemingCode] = useState(false);

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/admin/wallet/transactions?user_id=${userId}`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to reload transactions:", err);
    }
  };

  const handleAddCredits = async () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/wallet/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount,
          notes: addNotes || null,
          reference: addReference || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add credits");
      }

      if (data.success) {
        setBalance(data.new_balance);
        setAddAmount("");
        setAddNotes("");
        setAddReference("");
        setSuccess(`Successfully added ₹${amount.toLocaleString()}. New balance: ₹${data.new_balance.toLocaleString()}`);
        await loadTransactions();
      }
    } catch (err: any) {
      setError(err.message || "Failed to add credits");
    } finally {
      setLoading(false);
    }
  };

  const handleDeductCredits = async () => {
    const amount = parseFloat(deductAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (balance < amount) {
      setError(`Insufficient balance. Current balance: ₹${balance.toLocaleString()}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/wallet/deduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          amount,
          notes: deductNotes || null,
          reference: deductReference || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deduct credits");
      }

      if (data.success) {
        setBalance(data.new_balance);
        setDeductAmount("");
        setDeductNotes("");
        setDeductReference("");
        setSuccess(`Successfully deducted ₹${amount.toLocaleString()}. New balance: ₹${data.new_balance.toLocaleString()}`);
        await loadTransactions();
      }
    } catch (err: any) {
      setError(err.message || "Failed to deduct credits");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCode || redeemCode.trim().length === 0) {
      setError("Please enter a code");
      return;
    }

    try {
      setRedeemingCode(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/wallet/code/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to redeem code");
      }

      if (data.success) {
        setRedeemCode("");
        setSuccess(`Code redeemed successfully. Amount: ₹${data.amount.toLocaleString()}. Remaining balance: ₹${data.remaining_balance.toLocaleString()}`);
        setBalance(data.remaining_balance);
        await loadTransactions();
      }
    } catch (err: any) {
      setError(err.message || "Failed to redeem code");
    } finally {
      setRedeemingCode(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-cream border border-silver rounded-xl p-6 shadow-luxury">
        <div className="flex items-center justify-between mb-4">
          <h2 className="serif-display text-2xl text-night">Current Balance</h2>
          <span className="serif-display text-4xl text-night font-medium">
            ₹{balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Credits */}
        <div className="bg-white border border-silver rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-lg text-night">Add Credits</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-silver-dark mb-1">Amount (₹)</label>
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm text-silver-dark mb-1">Reference (optional)</label>
              <input
                type="text"
                value={addReference}
                onChange={(e) => setAddReference(e.target.value)}
                className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="Order ID, Return ID, etc."
              />
            </div>
            <div>
              <label className="block text-sm text-silver-dark mb-1">Notes (optional)</label>
              <textarea
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            <Button
              onClick={handleAddCredits}
              disabled={loading || !addAmount}
              variant="default"
              className="w-full"
            >
              {loading ? "Processing..." : "Add Credits"}
            </Button>
          </div>
        </div>

        {/* Deduct Credits */}
        <div className="bg-white border border-silver rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Minus className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-lg text-night">Deduct Credits</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-silver-dark mb-1">Amount (₹)</label>
              <input
                type="number"
                value={deductAmount}
                onChange={(e) => setDeductAmount(e.target.value)}
                className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm text-silver-dark mb-1">Reference (optional)</label>
              <input
                type="text"
                value={deductReference}
                onChange={(e) => setDeductReference(e.target.value)}
                className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                placeholder="Order ID, etc."
              />
            </div>
            <div>
              <label className="block text-sm text-silver-dark mb-1">Notes (optional)</label>
              <textarea
                value={deductNotes}
                onChange={(e) => setDeductNotes(e.target.value)}
                className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            <Button
              onClick={handleDeductCredits}
              disabled={loading || !deductAmount}
              variant="outline"
              className="w-full"
            >
              {loading ? "Processing..." : "Deduct Credits"}
            </Button>
          </div>
        </div>
      </div>

      {/* Redeem In-Store Code */}
      <div className="bg-white border border-silver rounded-lg p-6">
        <h3 className="font-bold text-lg text-night mb-4">Redeem In-Store Code</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold font-mono"
            placeholder="Enter redemption code"
          />
          <Button
            onClick={handleRedeemCode}
            disabled={redeemingCode || !redeemCode}
            variant="default"
          >
            {redeemingCode ? "Processing..." : "Redeem Code"}
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white border border-silver rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-night" />
          <h3 className="font-bold text-lg text-night">Transaction History</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-silver-dark">
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-silver-light last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-medium ${
                        tx.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                    </span>
                    {tx.reference && (
                      <span className="text-xs text-silver-dark">({tx.reference})</span>
                    )}
                  </div>
                  {tx.notes && <p className="text-xs text-silver-dark">{tx.notes}</p>}
                  <p className="text-xs text-silver-dark mt-1">
                    {format(new Date(tx.created_at), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}




















