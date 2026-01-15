/**
 * Fulfillment Orchestrator
 * Computes weights, selects packaging, builds Shiprocket payload, and handles responses
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createShiprocketOrder,
  generateAWB,
  retryWithBackoff,
  ShiprocketOrderPayload,
  ShiprocketOrderResponse,
} from "./shiprocket-client";
import { getDefaultWeight, getDefaultDimensions } from "./config";
import { LOGISTICS_DEFAULTS } from "./logistics-defaults";

// Phase 3.4: Use global default weight and dimensions
// Do NOT use product/variant metadata - always use global defaults

interface OrderWithItems {
  id: string;
  order_number: string;
  user_id: string | null;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  payment_status: string | null;
  payment_provider: string | null;
  metadata: any;
  shiprocket_shipment_id: string | null;
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

interface ProductVariant {
  id: string;
  sku: string;
  metadata: any;
}

interface Product {
  uid: string;
  name: string;
  metadata: any;
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

interface FulfillmentPayload {
  chargeableWeight: number;
  packageDimensions: { length: number; breadth: number; height: number };
  shiprocketPayload: ShiprocketOrderPayload;
  fallbackUsed: boolean;
}

/**
 * Phase 3.4: Always return global default weight
 * Do NOT check product/variant metadata
 */
function getItemWeight(
  product: Product | null,
  variant: ProductVariant | null
): number {
  // Phase 3.4: Always use global default, ignore product data
  return getDefaultWeight();
}

/**
 * Phase 3.4: Always return global default dimensions
 * Do NOT check product/variant metadata
 */
function getItemDimensions(
  product: Product | null,
  variant: ProductVariant | null
): { length: number; breadth: number; height: number } | null {
  // Phase 3.4: Always use global default, ignore product data
  return getDefaultDimensions();
}

/**
 * Compute chargeable weight (max of physical and volumetric)
 */
function computeChargeableWeight(
  physicalWeight: number,
  dimensions: { length: number; breadth: number; height: number }
): number {
  // Volumetric weight formula: (L × B × H) / 5000 (for cm)
  const volumetricWeight =
    (dimensions.length * dimensions.breadth * dimensions.height) / 5000;

  return Math.max(physicalWeight, volumetricWeight);
}

/**
 * Phase 3.4: Removed selectPackagingBox function
 * Always use global default dimensions directly
 */

/**
 * Prepare fulfillment payload for Shiprocket
 */
export async function prepareFulfillmentPayload(
  order: OrderWithItems,
  orderItems: OrderItem[],
  shippingAddress: Address,
  billingAddress: Address | null
): Promise<FulfillmentPayload> {
  const supabase = createServiceRoleClient();

  // Fetch product and variant details
  const productUids = [...new Set(orderItems.map((item) => item.product_uid))];
  const variantIds = orderItems
    .map((item) => item.variant_id)
    .filter(Boolean) as string[];

  const { data: products } = await supabase
    .from("products")
    .select("uid, name, metadata")
    .in("uid", productUids);

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, sku, metadata")
    .in("id", variantIds);

  const typedProductsForMap = (products || []) as Array<{ uid: string; name?: string }>;
  const typedVariants = (variants || []) as Array<{ id: string }>;
  const productsMap = new Map(typedProductsForMap.map((p) => [p.uid, p]));
  const variantsMap = new Map(typedVariants.map((v) => [v.id, v]));

  // STEP 5: Use logistics defaults (env-based with safe fallbacks)
  // Apply weight & dimensions at SHIPMENT LEVEL
  // Do NOT attempt per-product calculation
  // Ensure dimensions and weight are always set (never zero, never undefined)
  const packageDimensions = {
    length: LOGISTICS_DEFAULTS.lengthCm || 16, // STEP 5: Hard fallback
    breadth: LOGISTICS_DEFAULTS.breadthCm || 13, // STEP 5: Hard fallback
    height: LOGISTICS_DEFAULTS.heightCm || 4, // STEP 5: Hard fallback
  };
  
  // Total weight is the default weight (regardless of quantity)
  // Single global weight per shipment
  // STEP 5: Ensure weight is always set (never zero, never undefined)
  const totalPhysicalWeight = LOGISTICS_DEFAULTS.weightKg || 1.5; // STEP 5: Hard fallback
  
  // Phase 3.4: No fallback flag needed - we always use global defaults
  const fallbackUsed = false;

  // Compute chargeable weight
  const chargeableWeight = computeChargeableWeight(
    totalPhysicalWeight,
    packageDimensions
  );

  // Build Shiprocket payload
  const billAddr = billingAddress || shippingAddress;
  const shiprocketPayload: ShiprocketOrderPayload = {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().split("T")[0],
    // STEP 4: Use SHIPROCKET_PICKUP_LOCATION env var (no hardcoded values)
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
    billing_customer_name: billAddr.full_name || "Customer",
    billing_address: billAddr.line1 || "",
    billing_address_2: billAddr.line2 || undefined,
    billing_city: billAddr.city || "",
    billing_pincode: billAddr.pincode || "",
    billing_state: billAddr.state || "",
    billing_country: billAddr.country || "India",
    billing_email: "", // TODO: Get from user record
    billing_phone: billAddr.phone || "",
    shipping_is_billing: billingAddress?.id === shippingAddress.id,
    shipping_customer_name: shippingAddress.full_name || "Customer",
    shipping_address: shippingAddress.line1 || "",
    shipping_address_2: shippingAddress.line2 || undefined,
    shipping_city: shippingAddress.city || "",
    shipping_pincode: shippingAddress.pincode || "",
    shipping_state: shippingAddress.state || "",
    shipping_country: shippingAddress.country || "India",
    shipping_email: "", // TODO: Get from user record
    shipping_phone: shippingAddress.phone || "",
    order_items: orderItems.map((item) => {
      const product = productsMap.get(item.product_uid);
      return {
        name: item.name || product?.name || "Product",
        sku: item.sku || "UNKNOWN",
        units: item.quantity,
        selling_price: item.price,
      };
    }),
    payment_method: order.payment_status === "paid" ? "Prepaid" : "COD",
    sub_total: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    // STEP 5: Ensure dimensions and weight are always set (never zero, never undefined)
    length: packageDimensions.length || 16,
    breadth: packageDimensions.breadth || 13,
    height: packageDimensions.height || 4,
    weight: chargeableWeight || 1.5,
  };

  return {
    chargeableWeight,
    packageDimensions,
    shiprocketPayload,
    fallbackUsed,
  };
}

/**
 * Create Shiprocket order and request AWB
 */
export async function createShiprocketOrderForFulfillment(
  order: OrderWithItems,
  payload: ShiprocketOrderPayload
): Promise<ShiprocketOrderResponse> {
  return retryWithBackoff(async () => {
    return await createShiprocketOrder(payload);
  });
}

/**
 * Handle Shiprocket response and persist to database
 */
export async function handleShiprocketResponse(
  orderId: string,
  response: ShiprocketOrderResponse,
  fulfillmentPayload: FulfillmentPayload
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Update order metadata
  const { data: orderData } = await supabase
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  const typedOrderData = orderData as { metadata?: any } | null;
  const existingMetadata = (typedOrderData?.metadata as Record<string, any>) || {};
  const shippingMetadata = existingMetadata.shipping || {};
  const shippingTimeline = existingMetadata.shipping_timeline || [];

  const updatedMetadata = {
    ...existingMetadata,
    shipping: {
      ...shippingMetadata,
      awb: response.awb_code || null,
      courier: response.courier_name || null,
      courier_company_id: response.courier_company_id || null,
      tracking_url: response.tracking_url || null,
      expected_delivery: response.expected_delivery_date || null,
      shipment_id: response.shipment_id,
      updated_at: new Date().toISOString(),
    },
    shiprocket_payload: response,
    package_weight_kg: fulfillmentPayload.chargeableWeight,
    package_length_cm: fulfillmentPayload.packageDimensions.length,
    package_breadth_cm: fulfillmentPayload.packageDimensions.breadth,
    package_height_cm: fulfillmentPayload.packageDimensions.height,
    shipping_timeline: [
      ...shippingTimeline,
      {
        status: response.awb_code ? "shipped" : "processing",
        timestamp: new Date().toISOString(),
        awb: response.awb_code || null,
        courier: response.courier_name || null,
        notes: fulfillmentPayload.fallbackUsed
          ? "Used fallback weight/dimensions"
          : null,
      },
    ],
  };

  // Update order
  const { error: updateError } = await supabase.from("orders").update({
    shiprocket_shipment_id: String(response.shipment_id),
    shipping_status: response.awb_code ? "shipped" : "processing",
    metadata: updatedMetadata,
    updated_at: new Date().toISOString(),
  } as unknown as never).eq("id", orderId);

  if (updateError) {
    console.error("[FULFILLMENT] Failed to update order after Shiprocket response:", {
      order_id: orderId,
      error: updateError.message,
    });
  }

  // Write audit log
  try {
    await supabase.from("admin_audit_logs").insert({
      action: "shiprocket_order_created",
      target_resource: "orders",
      target_id: orderId,
      details: {
        shipment_id: response.shipment_id,
        awb_code: response.awb_code,
        courier_name: response.courier_name,
        fallback_used: fulfillmentPayload.fallbackUsed,
      },
    } as unknown as never);
  } catch (auditError) {
    const auditErrorMessage = auditError instanceof Error ? auditError.message : "Unknown error";
    console.error("[FULFILLMENT] Audit log write failed (non-fatal):", {
      order_id: orderId,
      audit_error: auditErrorMessage,
    });
  }
}

/**
 * Safe wrapper to create AWB only if missing (idempotent)
 */
export async function safeCreateAWBIfMissing(orderId: string): Promise<{
  success: boolean;
  awb?: string;
  error?: string;
  alreadyExists?: boolean;
}> {
  const supabase = createServiceRoleClient();

  // Fetch order with full details
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, shipping_address_id, billing_address_id, payment_status, payment_provider, metadata, shiprocket_shipment_id, created_at"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    console.error("[FULFILLMENT] Order not found:", {
      order_id: orderId,
      error: orderError?.message || "No data returned",
    });
    return { success: false, error: "Order not found" };
  }

  const order = orderData as OrderWithItems;

  // Check if already fulfilled
  const metadata = (order.metadata as Record<string, any>) || {};
  const shippingMetadata = metadata.shipping || {};
  const existingAWB = shippingMetadata.awb || null;
  const existingShipmentId = order.shiprocket_shipment_id;

  if (existingAWB && existingShipmentId) {
    return {
      success: true,
      awb: existingAWB,
      alreadyExists: true,
    };
  }

  // Check payment status
  if (order.payment_status !== "paid") {
    return {
      success: false,
      error: `Order payment status is ${order.payment_status}, not paid`,
    };
  }

  // Fetch addresses
  if (!order.shipping_address_id) {
    return { success: false, error: "Shipping address missing" };
  }

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
    // Prepare fulfillment payload
    const fulfillmentPayload = await prepareFulfillmentPayload(
      order,
      orderItems as OrderItem[],
      shippingAddress as Address,
      billingAddress as Address | null
    );

    // Create Shiprocket order
    const response = await createShiprocketOrderForFulfillment(
      order,
      fulfillmentPayload.shiprocketPayload
    );

    // Handle response
    await handleShiprocketResponse(orderId, response, fulfillmentPayload);

    // Send shipping notification email if AWB was generated
    if (response.awb_code) {
      try {
        const notificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/notifications/shipping`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_id: orderId,
              event_type: "awb_generated",
              awb: response.awb_code,
              courier: response.courier_name || null,
              tracking_url: response.tracking_url || null,
              expected_delivery: response.expected_delivery_date || null,
            }),
          }
        );

        if (!notificationResponse.ok) {
          console.warn("[FULFILLMENT] Shipping notification email failed:", {
            order_id: orderId,
            status: notificationResponse.status,
          });
        }
      } catch (emailError) {
        // Don't fail fulfillment if email fails
        console.error("[FULFILLMENT] Failed to send shipping notification:", {
          order_id: orderId,
          error: emailError instanceof Error ? emailError.message : "Unknown error",
        });
      }
    }

    return {
      success: true,
      awb: response.awb_code || undefined,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("[FULFILLMENT] Shiprocket fulfillment failed:", {
      order_id: orderId,
      order_number: order.order_number,
      user_id: order.user_id,
      error: errorMessage,
    });

    // Write error to audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "fulfillment_failed",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: order.order_number,
          error: errorMessage,
          stack: errorStack,
        },
      } as unknown as never);
    } catch (auditError) {
      const auditErrorMessage = auditError instanceof Error ? auditError.message : "Unknown error";
      console.error("[FULFILLMENT] Audit log write failed (non-fatal):", {
        order_id: orderId,
        audit_error: auditErrorMessage,
      });
    }

    return {
      success: false,
      error: errorMessage || "Fulfillment failed",
    };
  }
}







