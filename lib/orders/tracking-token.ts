/**
 * Order Tracking Token Service
 * Phase 4.1: Manages temporary read-only access tokens for order tracking
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

export interface TrackingTokenResult {
  success: boolean;
  order_id?: string;
  error?: string;
}

/**
 * Validate tracking token and return order_id
 */
export async function validateTrackingToken(token: string): Promise<TrackingTokenResult> {
  const supabase = createServiceRoleClient();
  
  // Find token
  const { data: tokenRecord, error: tokenError } = await supabase
    .from("order_tracking_tokens")
    .select("order_id, expires_at, used, access_count")
    .eq("token", token)
    .single();
  
  if (tokenError || !tokenRecord) {
    return { success: false, error: "Invalid token" };
  }
  
  const typedTokenRecord = tokenRecord as {
    order_id: string;
    expires_at: string;
    used: boolean;
    access_count: number;
  };
  
  // Check expiration
  const expiresAt = new Date(typedTokenRecord.expires_at);
  if (expiresAt < new Date()) {
    return { success: false, error: "Token has expired" };
  }
  
  // Check if used (single-use)
  if (typedTokenRecord.used) {
    return { success: false, error: "Token has already been used" };
  }
  
  // Update access count and timestamp
  await supabase
    .from("order_tracking_tokens")
    .update({
      accessed_at: new Date().toISOString(),
      access_count: typedTokenRecord.access_count + 1,
    } as unknown as never)
    .eq("token", token);
  
  return {
    success: true,
    order_id: typedTokenRecord.order_id,
  };
}

/**
 * Check if order can be tracked (within 7 days of delivery)
 */
export async function canTrackOrder(orderId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createServiceRoleClient();
  
  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("shipping_status, metadata, updated_at")
    .eq("id", orderId)
    .single();
  
  if (orderError || !order) {
    return { allowed: false, reason: "Order not found" };
  }
  
  const typedOrder = order as {
    shipping_status: string | null;
    metadata: any;
    updated_at: string;
  };
  
  // Check if order is cancelled
  if (typedOrder.shipping_status === "cancelled") {
    return { allowed: false, reason: "Order has been cancelled" };
  }
  
  // Check if delivered
  if (typedOrder.shipping_status === "delivered") {
    // Check if delivered more than 7 days ago
    const metadata = (typedOrder.metadata as Record<string, any>) || {};
    const shippingTimeline = metadata.shipping_timeline || [];
    
    // Find delivered event
    const deliveredEvent = shippingTimeline.find(
      (event: any) => event.status === "delivered"
    );
    
    if (deliveredEvent) {
      const deliveredAt = new Date(deliveredEvent.timestamp);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      if (deliveredAt < sevenDaysAgo) {
        return { allowed: false, reason: "Tracking expired" };
      }
    }
  }
  
  return { allowed: true };
}










