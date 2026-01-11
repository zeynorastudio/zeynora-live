/**
 * ZEYNORA Store Credit Wallet Engine
 * 
 * Core wallet operations: balance, credits, debits, transactions
 * All operations use service-level Supabase client for writes
 * Enforces: balance never goes negative
 * Writes transaction logs and audit logs
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface WalletBalance {
  balance: number;
  expiring_soon: Array<{
    amount: number;
    expires_at: string;
  }>;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: "credit" | "debit";
  amount: number;
  reference: string | null; // order_id or return_id
  notes: string | null;
  created_at: string;
}

/**
 * Get wallet balance for a user
 * Returns current balance and credits expiring soon (within 30 days)
 */
export async function getBalance(userId: string): Promise<WalletBalance> {
  const supabase = createServiceRoleClient();

  // Get or create wallet record
  let { data: wallet, error: walletError } = await supabase
    .from("store_credits")
    .select("balance, updated_at")
    .eq("user_id", userId)
    .single();

  if (walletError && walletError.code === "PGRST116") {
    // Wallet doesn't exist, create it
    const { data: newWallet, error: createError } = await supabase
      .from("store_credits")
      .insert({
        user_id: userId,
        balance: 0,
      } as unknown as never)
      .select()
      .single();

    if (createError || !newWallet) {
      throw new Error(`Failed to create wallet: ${createError?.message}`);
    }

    wallet = newWallet;
  } else if (walletError) {
    throw new Error(`Failed to fetch wallet: ${walletError.message}`);
  }

  const typedWallet = (wallet || null) as {
    balance: number | null;
    updated_at: string;
  } | null;

  // Get credits expiring soon (within 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data: expiringCredits } = await supabase
    .from("store_credit_transactions")
    .select("amount, created_at")
    .eq("user_id", userId)
    .eq("type", "credit")
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) // Last 12 months
    .order("created_at", { ascending: true });

  const typedExpiringCredits = (expiringCredits || []) as Array<{
    amount: number;
    created_at: string;
  }>;

  const expiring_soon: Array<{ amount: number; expires_at: string }> = [];
  for (const tx of typedExpiringCredits) {
    const createdAt = new Date(tx.created_at);
    const expiresAt = new Date(createdAt);
    expiresAt.setMonth(expiresAt.getMonth() + 12);

    if (expiresAt <= thirtyDaysFromNow && expiresAt > new Date()) {
      expiring_soon.push({
        amount: Number(tx.amount),
        expires_at: expiresAt.toISOString(),
      });
    }
  }

  return {
    balance: Number(typedWallet?.balance) || 0,
    expiring_soon,
  };
}

/**
 * Add credits to user wallet
 * Creates transaction log and audit log
 */
export async function addCredits(
  userId: string,
  amount: number,
  reference: string | null = null,
  notes: string | null = null,
  performedBy: string | null = null,
  returnRequestId: string | null = null
): Promise<{ success: boolean; new_balance: number }> {
  if (amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  const supabase = createServiceRoleClient();

  // Get or create wallet
  let { data: wallet, error: walletError } = await supabase
    .from("store_credits")
    .select("id, balance")
    .eq("user_id", userId)
    .single();

  if (walletError && walletError.code === "PGRST116") {
    // Create wallet
    const { data: newWallet, error: createError } = await supabase
      .from("store_credits")
      .insert({
        user_id: userId,
        balance: amount,
      } as unknown as never)
      .select()
      .single();

    if (createError || !newWallet) {
      throw new Error(`Failed to create wallet: ${createError?.message}`);
    }

    wallet = newWallet;
  } else if (walletError) {
    throw new Error(`Failed to fetch wallet: ${walletError.message}`);
  }

  const typedWallet = (wallet || null) as {
    id: string;
    balance: number | null;
  } | null;

  // Update balance
  const currentBalance = Number(typedWallet?.balance) || 0;
  const newBalance = currentBalance + amount;

  const { error: updateError } = await supabase
    .from("store_credits")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", typedWallet?.id || "");

  if (updateError) {
    throw new Error(`Failed to update wallet balance: ${updateError.message}`);
  }

  // Create transaction log
  const { error: txError } = await supabase
    .from("store_credit_transactions")
    .insert({
      user_id: userId,
      type: "credit",
      amount: amount,
      reference: reference,
      notes: notes,
      return_request_id: returnRequestId,
    } as unknown as never);

  if (txError) {
    console.error("Failed to create transaction log:", txError);
    // Don't fail the operation, but log the error
  }

  // Create audit log
  if (performedBy) {
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "store_credit_added",
        target_resource: "store_credits",
        target_id: userId,
        performed_by: performedBy,
        details: {
          amount: amount,
          reference: reference,
          notes: notes,
          new_balance: newBalance,
        },
      } as unknown as never);
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Non-fatal
    }
  }

  return {
    success: true,
    new_balance: newBalance,
  };
}

/**
 * Deduct credits from user wallet
 * Enforces: balance never goes negative
 * Creates transaction log and audit log
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reference: string | null = null,
  notes: string | null = null,
  performedBy: string | null = null
): Promise<{ success: boolean; new_balance: number }> {
  if (amount <= 0) {
    throw new Error("Debit amount must be positive");
  }

  const supabase = createServiceRoleClient();

  // Get wallet
  const { data: wallet, error: walletError } = await supabase
    .from("store_credits")
    .select("id, balance")
    .eq("user_id", userId)
    .single();

  if (walletError) {
    if (walletError.code === "PGRST116") {
      throw new Error("Insufficient credits: Wallet does not exist");
    }
    throw new Error(`Failed to fetch wallet: ${walletError.message}`);
  }

  const typedWallet = wallet as {
    id: string;
    balance: number | null;
  };

  const currentBalance = Number(typedWallet.balance) || 0;

  // Enforce: balance must never go negative
  if (currentBalance < amount) {
    throw new Error(`Insufficient credits: Current balance is ₹${currentBalance}, requested ₹${amount}`);
  }

  const newBalance = currentBalance - amount;

  // Update balance
  const { error: updateError } = await supabase
    .from("store_credits")
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", typedWallet?.id || "");

  if (updateError) {
    throw new Error(`Failed to update wallet balance: ${updateError.message}`);
  }

  // Create transaction log
  const { error: txError } = await supabase
    .from("store_credit_transactions")
    .insert({
      user_id: userId,
      type: "debit",
      amount: amount,
      reference: reference,
      notes: notes,
    } as unknown as never);

  if (txError) {
    console.error("Failed to create transaction log:", txError);
    // Don't fail the operation
  }

  // Create audit log
  if (performedBy) {
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "store_credit_deducted",
        target_resource: "store_credits",
        target_id: userId,
        performed_by: performedBy,
        details: {
          amount: amount,
          reference: reference,
          notes: notes,
          new_balance: newBalance,
        },
      } as unknown as never);
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Non-fatal
    }
  }

  return {
    success: true,
    new_balance: newBalance,
  };
}

/**
 * Get transaction history for a user
 * Returns last N transactions (default 50)
 */
export async function getTransactions(
  userId: string,
  limit: number = 50
): Promise<CreditTransaction[]> {
  const supabase = createServiceRoleClient();

  const { data: transactions, error } = await supabase
    .from("store_credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  const typedTransactions = (transactions || []) as Array<{
    id: string;
    user_id: string;
    type: string;
    amount: number;
    reference: string | null;
    notes: string | null;
    created_at: string;
  }>;

  return typedTransactions.map((tx) => ({
    id: tx.id,
    user_id: tx.user_id,
    type: tx.type as "credit" | "debit",
    amount: Number(tx.amount),
    reference: tx.reference,
    notes: tx.notes,
    created_at: tx.created_at,
  }));
}
