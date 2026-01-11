/**
 * Phase 4.3 — Returns Validation Helpers
 * Validates return eligibility and business rules
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/otp/service";

export interface ReturnEligibilityResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if order is eligible for return
 * Rules:
 * - Order must be delivered
 * - Delivery must be within 7 days
 * - Order must not be cancelled
 * - Payment must be paid
 * - No existing active return for same order_item
 */
export async function checkReturnEligibility(
  orderId: string,
  orderItemIds: string[]
): Promise<ReturnEligibilityResult> {
  const supabase = createServiceRoleClient();

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_status, payment_status, shipping_status, metadata")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { allowed: false, reason: "Order not found" };
  }

  const typedOrder = order as {
    id: string;
    order_status: string | null;
    payment_status: string | null;
    shipping_status: string | null;
    metadata: any;
  };

  // Check if order is cancelled
  if (typedOrder.order_status === "cancelled" || typedOrder.shipping_status === "cancelled") {
    return { allowed: false, reason: "Order has been cancelled" };
  }

  // Check payment status
  if (typedOrder.payment_status !== "paid") {
    return { allowed: false, reason: "Order payment is not completed" };
  }

  // Check if order is delivered
  if (typedOrder.shipping_status !== "delivered") {
    return { allowed: false, reason: "Order must be delivered before return" };
  }

  // Check 7-day window from delivery
  const metadata = (typedOrder.metadata as Record<string, any>) || {};
  const shippingTimeline = metadata.shipping_timeline || [];

  // Find delivered event
  const deliveredEvent = shippingTimeline.find(
    (event: any) => event.status === "delivered" || event.status === "DELIVERED"
  );

  if (!deliveredEvent) {
    // Fallback: use order updated_at if no timeline
    const { data: orderData } = await supabase
      .from("orders")
      .select("updated_at")
      .eq("id", orderId)
      .single();

    if (orderData) {
      const deliveredAt = new Date((orderData as any).updated_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      if (deliveredAt < sevenDaysAgo) {
        return { allowed: false, reason: "Return window expired (7 days from delivery)" };
      }
    }
  } else {
    const deliveredAt = new Date(deliveredEvent.timestamp || deliveredEvent.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (deliveredAt < sevenDaysAgo) {
      return { allowed: false, reason: "Return window expired (7 days from delivery)" };
    }
  }

  // Check for existing active returns for these order items
  for (const orderItemId of orderItemIds) {
    const { data: existingReturns } = await supabase
      .from("return_items")
      .select("return_request_id, return_requests!inner(status)")
      .eq("order_item_id", orderItemId);

    if (existingReturns && existingReturns.length > 0) {
      // Check if any return is still active (not cancelled/rejected/credited)
      const activeStatuses = ["requested", "approved", "pickup_scheduled", "in_transit", "received"];
      const hasActiveReturn = existingReturns.some((item: any) => {
        const returnRequest = item.return_requests;
        return returnRequest && activeStatuses.includes(returnRequest.status);
      });

      if (hasActiveReturn) {
        return { allowed: false, reason: "Active return already exists for this item" };
      }
    }
  }

  return { allowed: true };
}

/**
 * Verify mobile matches order (for guest returns)
 */
export async function verifyMobileMatchesOrder(
  orderId: string,
  mobile: string
): Promise<{ valid: boolean; reason?: string }> {
  const supabase = createServiceRoleClient();
  const normalizedMobile = normalizePhone(mobile);

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, guest_phone, customer_id")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return { valid: false, reason: "Order not found" };
  }

  const typedOrder = order as {
    id: string;
    guest_phone: string | null;
    customer_id: string | null;
  };

  // For guest orders, check phone match
  if (!typedOrder.customer_id && typedOrder.guest_phone) {
    const orderPhone = normalizePhone(typedOrder.guest_phone);
    if (orderPhone !== normalizedMobile) {
      return { valid: false, reason: "Mobile number does not match order" };
    }
  }

  // For logged-in customers, we'll verify via session/auth
  // This function is mainly for guest verification

  return { valid: true };
}









