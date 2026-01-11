/**
 * ZEYNORA Email Preferences Check Module
 * Phase 7 Compatibility Hook
 * 
 * Provides helper functions to check if emails should be sent based on user preferences.
 * Used by email sending services to respect user preferences.
 */

import { shouldSendEmail } from "./index";

export type EmailType =
  | "mandatory"
  | "marketing"
  | "new_arrivals"
  | "restock"
  | "wishlist"
  | "abandoned_cart";

/**
 * Check if an email should be sent to a user
 * 
 * @param userId - User ID to check
 * @param emailType - Type of email
 * @returns true if email should be sent, false otherwise
 * 
 * Rules:
 * - Mandatory emails always return true
 * - Optional emails check user preferences
 * - Master toggle disables all optional emails
 */
export async function shouldSend(
  userId: string,
  emailType: EmailType
): Promise<boolean> {
  return shouldSendEmail(userId, emailType);
}

/**
 * Batch check multiple email types
 * Useful for checking multiple preferences at once
 * 
 * @param userId - User ID to check
 * @param emailTypes - Array of email types to check
 * @returns Object mapping email types to boolean (should send)
 */
export async function shouldSendBatch(
  userId: string,
  emailTypes: EmailType[]
): Promise<Record<EmailType, boolean>> {
  const results: Record<string, boolean> = {};

  // Check all types in parallel
  const checks = emailTypes.map(async (type) => {
    const should = await shouldSend(userId, type);
    return { type, should };
  });

  const resolved = await Promise.all(checks);

  for (const { type, should } of resolved) {
    results[type] = should;
  }

  return results as Record<EmailType, boolean>;
}




















