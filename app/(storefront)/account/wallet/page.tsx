"use client";

import { useState, useEffect } from "react";
import { Wallet, History, Copy, Check, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { format } from "date-fns";

interface WalletBalance {
  balance: number;
  expiring_soon: Array<{
    amount: number;
    expires_at: string;
  }>;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeAmount, setCodeAmount] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceRes, transactionsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions"),
      ]);

      if (!balanceRes.ok) {
        throw new Error("Failed to load wallet balance");
      }

      if (!transactionsRes.ok) {
        throw new Error("Failed to load transactions");
      }

      const balanceData = await balanceRes.json();
      const transactionsData = await transactionsRes.json();

      if (balanceData.success) {
        setBalance({
          balance: balanceData.balance || 0,
          expiring_soon: balanceData.expiring_soon || [],
        });
      }

      if (transactionsData.success) {
        setTransactions(transactionsData.transactions || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    const amount = parseFloat(codeAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (balance && balance.balance < amount) {
      setError(`Insufficient balance. Available: ₹${balance.balance}`);
      return;
    }

    try {
      setGeneratingCode(true);
      setError(null);

      const response = await fetch("/api/wallet/code/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate code");
      }

      if (data.success) {
        setGeneratedCode(data.code);
        setCodeAmount("");
        // Reload balance
        loadWalletData();
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-offwhite py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-silver-dark">Loading wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="serif-display text-3xl text-night mb-2">Store Credit Wallet</h1>
          <p className="text-silver-dark">Manage your store credits and view transaction history</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-cream border border-silver rounded-xl p-6 mb-8 shadow-luxury">
          <div className="flex items-center gap-3 mb-4">
            <Wallet className="w-6 h-6 text-gold" />
            <h2 className="serif-display text-2xl text-night">Current Balance</h2>
          </div>
          <div className="mb-6">
            <p className="serif-display text-5xl text-night font-medium">
              ₹{balance?.balance.toLocaleString() || "0"}
            </p>
          </div>

          {/* Expiring Soon Warning */}
          {balance && balance.expiring_soon.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    Credits Expiring Soon
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {balance.expiring_soon.map((exp, idx) => (
                      <li key={idx}>
                        ₹{exp.amount.toLocaleString()} expires on{" "}
                        {format(new Date(exp.expires_at), "MMM dd, yyyy")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Generate One-Time Code */}
          <div className="border-t border-silver pt-6">
            <h3 className="sans-base font-medium text-night mb-4">
              Generate In-Store Redemption Code
            </h3>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="Enter amount"
                value={codeAmount}
                onChange={(e) => setCodeAmount(e.target.value)}
                className="flex-1 px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                min="1"
                step="0.01"
              />
              <Button
                onClick={handleGenerateCode}
                disabled={generatingCode || !codeAmount}
                variant="default"
              >
                {generatingCode ? "Generating..." : "Generate Code"}
              </Button>
            </div>

            {generatedCode && (
              <div className="mt-4 p-4 bg-white border-2 border-gold rounded-lg">
                <p className="text-sm text-silver-dark mb-2">Your redemption code:</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-2xl font-mono font-bold text-night bg-offwhite px-4 py-2 rounded">
                    {generatedCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generatedCode)}
                    className="p-2 hover:bg-offwhite rounded-lg transition-colors"
                    aria-label="Copy code"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-silver-dark" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-silver-dark mt-2">
                  This code expires in 15 minutes. Show it to store staff for redemption.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white border border-silver rounded-xl p-6 shadow-luxury">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-5 h-5 text-night" />
            <h2 className="serif-display text-xl text-night">Transaction History</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-silver-dark">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-4 border-b border-silver-light last:border-0"
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
                        <span className="text-xs text-silver-dark">
                          ({tx.reference})
                        </span>
                      )}
                    </div>
                    {tx.notes && (
                      <p className="text-xs text-silver-dark">{tx.notes}</p>
                    )}
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
    </div>
  );
}




















