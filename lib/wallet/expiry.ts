/**
 * ZEYNORA Store Credit Expiry Handler
 * 
 * Credits expire after 12 months from the date they were added
 * This module provides helpers to check and process expired credits
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface ExpiredCredit {
  transaction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  expires_at: string;
}

/**
 * Check if a credit transaction is expired
 * Credits expire 12 months after creation
 */
export function isCreditExpired(createdAt: string): boolean {
  const created = new Date(createdAt);
  const expiresAt = new Date(created);
  expiresAt.setMonth(expiresAt.getMonth() + 12);
  return new Date() > expiresAt;
}

/**
 * Get expiration date for a credit transaction
 */
export function getExpirationDate(createdAt: string): Date {
  const created = new Date(createdAt);
  const expiresAt = new Date(created);
  expiresAt.setMonth(expiresAt.getMonth() + 12);
  return expiresAt;
}

/**
 * Find all expired credits that haven't been deducted yet
 * Returns list of expired credit transactions
 */
export async function getExpiredCredits(): Promise<ExpiredCredit[]> {
  const supabase = createServiceRoleClient();

  // Get all credit transactions from the last 13 months (to catch expiring ones)
  const thirteenMonthsAgo = new Date();
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

  const { data: creditTransactions, error } = await supabase
    .from("store_credit_transactions")
    .select("*")
    .eq("type", "credit")
    .gte("created_at", thirteenMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch credit transactions: ${error.message}`);
  }

  const expired: ExpiredCredit[] = [];

  const typedCreditTransactions = (creditTransactions || []) as Array<{
    id: string;
    user_id: string;
    amount: number | null;
    created_at: string;
  }>;
  for (const tx of typedCreditTransactions) {
    if (isCreditExpired(tx.created_at)) {
      expired.push({
        transaction_id: tx.id,
        user_id: tx.user_id,
        amount: Number(tx.amount),
        created_at: tx.created_at,
        expires_at: getExpirationDate(tx.created_at).toISOString(),
      });
    }
  }

  return expired;
}

/**
 * Process expired credits for a specific user
 * Deducts expired credits from balance
 * Creates debit transaction logs
 * 
 * Note: This should be called periodically (e.g., via cron job or scheduled endpoint)
 */
export async function processExpiredCreditsForUser(
  userId: string,
  performedBy: string | null = null
): Promise<{ deducted: number; new_balance: number }> {
  const expired = await getExpiredCredits();
  const userExpired = expired.filter((e) => e.user_id === userId);

  if (userExpired.length === 0) {
    // Get current balance
    const { getBalance } = await import("./index");
    const balance = await getBalance(userId);
    return {
      deducted: 0,
      new_balance: balance.balance,
    };
  }

  // Calculate total expired amount
  const totalExpired = userExpired.reduce((sum, e) => sum + e.amount, 0);

  // Deduct expired credits
  const { deductCredits } = await import("./index");
  const result = await deductCredits(
    userId,
    totalExpired,
    null,
    `Expired credits from ${userExpired.length} transaction(s)`,
    performedBy
  );

  return {
    deducted: totalExpired,
    new_balance: result.new_balance,
  };
}

/**
 * Process expired credits for all users
 * Should be called via scheduled job
 */
export async function processAllExpiredCredits(
  performedBy: string | null = null
): Promise<{ users_processed: number; total_deducted: number }> {
  const expired = await getExpiredCredits();

  // Group by user
  const userMap: Record<string, ExpiredCredit[]> = {};
  for (const credit of expired) {
    if (!userMap[credit.user_id]) {
      userMap[credit.user_id] = [];
    }
    userMap[credit.user_id].push(credit);
  }

  let totalDeducted = 0;
  const userIds = Object.keys(userMap);

  for (const userId of userIds) {
    try {
      const result = await processExpiredCreditsForUser(userId, performedBy);
      totalDeducted += result.deducted;
    } catch (error) {
      console.error(`Failed to process expired credits for user ${userId}:`, error);
      // Continue with other users
    }
  }

  return {
    users_processed: userIds.length,
    total_deducted: totalDeducted,
  };
}




