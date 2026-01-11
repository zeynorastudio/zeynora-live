import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getBalance, getTransactions, addCredits, deductCredits } from "@/lib/wallet";
import WalletManagerClient from "./WalletManagerClient";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export const dynamic = "force-dynamic";

export default async function AdminWalletPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const resolvedParams = await params;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  // Only Super Admin can manage wallets
  await requireSuperAdmin();

  const userId = resolvedParams.user;
  const supabase = createServiceRoleClient();

  // Get user info
  const { data: userRecord } = await supabase
    .from("users")
    .select("id, email, full_name, phone")
    .eq("id", userId)
    .single();

  const typedUserRecord = userRecord as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
  } | null;

  if (!typedUserRecord) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">User not found</p>
        </div>
      </div>
    );
  }

  // Get wallet balance and transactions
  let balance;
  let transactions: Array<{
    id: string;
    type: "credit" | "debit";
    amount: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
  }> = [];
  
  try {
    balance = await getBalance(userId);
    const transactionsData = await getTransactions(userId, 100);
    transactions = transactionsData.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      reference: tx.reference,
      notes: tx.notes,
      created_at: tx.created_at,
    }));
  } catch (error: any) {
    console.error("Error loading wallet data:", error);
    balance = { balance: 0, expiring_soon: [] };
    transactions = [];
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="serif-display text-3xl text-night mb-2">Wallet Manager</h1>
        <div className="text-silver-dark">
          <p className="font-medium">{typedUserRecord.full_name || "User"}</p>
          <p className="text-sm">{typedUserRecord.email}</p>
          {typedUserRecord.phone && <p className="text-sm">{typedUserRecord.phone}</p>}
        </div>
      </div>

      <WalletManagerClient
        userId={userId}
        userName={typedUserRecord.full_name || typedUserRecord.email || "User"}
        initialBalance={balance.balance}
        initialTransactions={transactions}
        adminUserId={session.user.id}
      />
    </div>
  );
}
