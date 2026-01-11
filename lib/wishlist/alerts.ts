/**
 * ZEYNORA Wishlist Alerts Module
 * 
 * Provides helpers to check if wishlist-related emails should be sent.
 * Does NOT send emails - only checks preferences.
 * 
 * Used by:
 * - Restock alerts (when wishlist item comes back in stock)
 * - Sale alerts (when wishlist item goes on sale)
 */

import { shouldSendEmail } from "@/lib/email-preferences";

/**
 * Check if restock alert should be sent for a wishlist item
 * 
 * @param userId - User ID who has the item in wishlist
 * @returns true if restock alert email should be sent
 */
export async function shouldSendWishlistRestock(userId: string): Promise<boolean> {
  // Check both restock_alerts and wishlist_alerts preferences
  const restockAllowed = await shouldSendEmail(userId, "restock");
  const wishlistAllowed = await shouldSendEmail(userId, "wishlist");

  // Send if either preference allows it (user wants restock OR wishlist alerts)
  return restockAllowed || wishlistAllowed;
}

/**
 * Check if sale alert should be sent for a wishlist item
 * 
 * @param userId - User ID who has the item in wishlist
 * @returns true if sale alert email should be sent
 */
export async function shouldSendWishlistSale(userId: string): Promise<boolean> {
  // Check wishlist_alerts preference
  return shouldSendEmail(userId, "wishlist");
}

/**
 * Check if any wishlist-related email should be sent
 * 
 * @param userId - User ID to check
 * @returns true if any wishlist email type is allowed
 */
export async function shouldSendAnyWishlistEmail(userId: string): Promise<boolean> {
  const restock = await shouldSendWishlistRestock(userId);
  const sale = await shouldSendWishlistSale(userId);

  return restock || sale;
}




















