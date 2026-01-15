/**
 * Shipment Creation Service
 * Phase 3.3: Creates shipments in Shiprocket only after payment confirmation
 * 
 * Requirements:
 * - Only create shipment when order_status = PAID
 * - Idempotent (no duplicate shipments)
 * - Never expose tokens to frontend
 * - Handle failures gracefully
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createShiprocketOrder,
  ShiprocketOrderPayload,
  ShiprocketOrderResponse,
} from "./shiprocket-client";
import { prepareFulfillmentPayload } from "./fulfillment";

interface OrderWithItems {
  id: string;
  order_number: string;
  order_status: string | null;
  payment_status: string | null;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  shiprocket_shipment_id: string | null;
  shipment_status: string | null;
  courier_name: string | null;
  metadata: any;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_uid: string;
  variant_id: string | null;
  sku: string | null;
  name: string | null;
  quantity: number;
  price: number;
}

interface Address {
  id: string;
  full_name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
}

interface CreateShipmentResult {
  success: boolean;
  shipment_id?: string;
  courier_name?: string;
  error?: string;
  already_exists?: boolean;
}

/**
 * Create shipment in Shiprocket for a paid order
 * Phase 3.3: Only creates shipment when order_status = PAID
 */
export async function createShipmentForPaidOrder(
  orderId: string
): Promise<CreateShipmentResult> {
  const supabase = createServiceRoleClient();

  // Fetch order with full details
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_status, payment_status, shipping_address_id, billing_address_id, shiprocket_shipment_id, shipment_status, courier_name, metadata, created_at"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    console.error("[SHIPMENT] Order not found:", {
      order_id: orderId,
      error: orderError?.message || "No data returned",
    });
    return { success: false, error: "Order not found" };
  }

  const order = orderData as OrderWithItems;

  // CRITICAL: Only create shipment for PAID orders
  if (order.order_status !== "paid" || order.payment_status !== "paid") {
    console.warn("[SHIPMENT] Order not paid - skipping shipment creation:", {
      order_id: orderId,
      order_status: order.order_status,
      payment_status: order.payment_status,
    });
    return {
      success: false,
      error: `Order status is ${order.order_status}/${order.payment_status}, not paid`,
    };
  }

  // STEP 2: Add start log
  console.log("SHIPMENT_START", order.id);

  // Enforce SHIPROCKET_ENABLED flag (fail loud, not silent)
  if (process.env.SHIPROCKET_ENABLED !== "true") {
    const errorMessage = "Shiprocket disabled: paid order requires manual fulfillment";
    console.error("[SHIPMENT] Shiprocket disabled:", {
      order_id: orderId,
      order_number: order.order_number,
    });
    // This error MUST be caught by the caller
    // Payment webhook MUST NOT fail
    // Order MUST remain PAID
    throw new Error(errorMessage);
  }

  // Idempotency check: if shipment already exists and is not failed, return existing data
  // Allow retry if shipment_status is "failed" or if no shipment_id exists
  if (order.shiprocket_shipment_id && order.shipment_status && order.shipment_status !== "failed") {
    console.log("[SHIPMENT] Shipment already exists:", {
      order_id: orderId,
      shipment_id: order.shiprocket_shipment_id,
      status: order.shipment_status,
    });
    return {
      success: true,
      shipment_id: order.shiprocket_shipment_id,
      courier_name: order.courier_name || undefined,
      already_exists: true,
    };
  }

  // Validate required fields
  if (!order.shipping_address_id) {
    return { success: false, error: "Shipping address missing" };
  }

  // Fetch addresses
  const { data: shippingAddress } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", order.shipping_address_id)
    .single();

  if (!shippingAddress) {
    return { success: false, error: "Shipping address not found" };
  }

  const billingAddressId = order.billing_address_id || order.shipping_address_id;
  const { data: billingAddress } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", billingAddressId)
    .single();

  // Fetch order items
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, product_uid, variant_id, sku, name, quantity, price")
    .eq("order_id", orderId);

  if (!orderItems || orderItems.length === 0) {
    return { success: false, error: "Order has no items" };
  }

  try {
    // Prepare fulfillment payload (includes weight, dimensions, address details)
    const fulfillmentPayload = await prepareFulfillmentPayload(
      order as any,
      orderItems as OrderItem[],
      shippingAddress as Address,
      billingAddress as Address | null
    );

    // STEP 2: Log payload before calling Shiprocket
    console.log("SHIPMENT_PAYLOAD", fulfillmentPayload.shiprocketPayload);

    // Create shipment in Shiprocket (auth happens inside createShiprocketOrder)
    const response = await createShiprocketOrder(fulfillmentPayload.shiprocketPayload);

    // STEP 2: Log after API call success
    console.log("SHIPMENT_BOOKED", {
      shipment_id: response.shipment_id,
      awb_code: response.awb_code,
      courier_name: response.courier_name,
      status: response.status,
    });

    // STEP 6: Store shipment details in database
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shiprocket_shipment_id: String(response.shipment_id),
        shipment_status: "BOOKED", // STEP 6: Use "BOOKED" status
        courier_name: response.courier_name || null,
        shipping_status: "processing",
        metadata: {
          ...(order.metadata as Record<string, any> || {}),
          shipping: {
            ...((order.metadata as Record<string, any>)?.shipping || {}),
            shipment_id: response.shipment_id,
            awb_code: response.awb_code || null, // STEP 6: Store awb_code
            awb: response.awb_code || null, // Keep for backward compatibility
            courier: response.courier_name || null,
            courier_company_id: response.courier_company_id || null,
            tracking_url: response.tracking_url || null,
            expected_delivery: response.expected_delivery_date || null,
            updated_at: new Date().toISOString(),
          },
        },
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", orderId);

    if (updateError) {
      console.error("[SHIPMENT] Failed to update order after shipment creation:", {
        order_id: orderId,
        error: updateError.message,
      });
      // Shipment was created in Shiprocket but DB update failed
      // Return success but log error for manual review
      return {
        success: true,
        shipment_id: String(response.shipment_id),
        courier_name: response.courier_name || undefined,
        error: "Shipment created but database update failed",
      };
    }

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "shipment_created",
        target_resource: "orders",
        target_id: orderId,
        details: {
          shipment_id: response.shipment_id,
          courier_name: response.courier_name,
          awb_code: response.awb_code,
          order_number: order.order_number,
        },
      } as unknown as never);
    } catch (auditError) {
      // Non-fatal - log but don't fail
      console.error("[SHIPMENT] Audit log write failed (non-fatal):", {
        order_id: orderId,
        error: auditError instanceof Error ? auditError.message : "Unknown error",
      });
    }

    return {
      success: true,
      shipment_id: String(response.shipment_id),
      courier_name: response.courier_name || undefined,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // STEP 2: Log failure with detailed error info
    console.error("SHIPMENT_FAILED", {
      order_id: orderId,
      error: errorMessage,
      error_details: (error as any)?.response?.data || error,
    });
    
    console.error("[SHIPMENT] Shipment creation failed:", {
      order_id: orderId,
      order_number: order.order_number,
      error: errorMessage,
    });

    // STEP 6: Mark order as FAILED (but don't cancel order)
    try {
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED", // STEP 6: Use "FAILED" status
          metadata: {
            ...(order.metadata as Record<string, any> || {}),
            shipment_error: errorMessage,
            shipment_failed_at: new Date().toISOString(),
            shipment_error_details: (error as any)?.response?.data || null,
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);

      // Write audit log for failure
      await supabase.from("admin_audit_logs").insert({
        action: "shipment_creation_failed",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: order.order_number,
          error: errorMessage,
          requires_attention: true,
        },
      } as unknown as never);
    } catch (updateError) {
      console.error("[SHIPMENT] Failed to mark order as SHIPMENT_FAILED:", {
        order_id: orderId,
        error: updateError instanceof Error ? updateError.message : "Unknown error",
      });
    }

    return {
      success: false,
      error: errorMessage || "Shipment creation failed",
    };
  }
}










