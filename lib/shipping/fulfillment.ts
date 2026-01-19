/**
 * FINAL — Fulfillment Orchestrator
 * 
 * Builds Shiprocket payload, handles responses, manages shipment lifecycle
 * 
 * Key behaviors:
 * - Uses ENV-based weight/dimensions (never hardcoded)
 * - Uses SHIPROCKET_PICKUP_LOCATION from env
 * - Validates all required fields before submission
 * - On success: saves shipment_id, awb_code, status = "BOOKED"
 * - On failure: saves error, status = "FAILED", allows retry
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createShiprocketOrder,
  generateAWB,
  retryWithBackoff,
  ShiprocketOrderPayload,
  ShiprocketOrderResponse,
} from "./shiprocket-client";
import { 
  getDefaultWeight, 
  getDefaultDimensions, 
  getPickupLocation,
  isPackageConfigValid 
} from "./config";

interface OrderWithItems {
  id: string;
  order_number: string;
  user_id: string | null;
  shipping_address_id: string | null;
  billing_address_id: string | null;
  payment_status: string | null;
  payment_provider: string | null;
  metadata: Record<string, unknown> | null;
  shiprocket_shipment_id: string | null;
  created_at: string;
  // Shipping address fields stored directly in order
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_email: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_pincode: string | null;
  shipping_country: string | null;
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

interface FulfillmentPayload {
  chargeableWeight: number;
  packageDimensions: { length: number; breadth: number; height: number };
  shiprocketPayload: ShiprocketOrderPayload;
}

/**
 * Validate phone number format for Shiprocket
 * Shiprocket requires 10-digit Indian phone number
 */
function validatePhone(phone: string | null): string {
  if (!phone) return "";
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // If starts with 91 and has 12 digits, remove country code
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // Return last 10 digits
  return digits.slice(-10);
}

/**
 * Validate pincode format
 * Must be exactly 6 digits
 */
function validatePincode(pincode: string | null): string {
  if (!pincode) return "";
  const digits = pincode.replace(/\D/g, "");
  if (digits.length !== 6) {
    console.warn("[FULFILLMENT] Invalid pincode format:", pincode);
  }
  return digits.slice(0, 6);
}

/**
 * Validate address is complete for Shiprocket
 */
function validateAddress(address: Address): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!address.line1?.trim()) errors.push("Address line 1 is required");
  if (!address.city?.trim()) errors.push("City is required");
  if (!address.state?.trim()) errors.push("State is required");
  if (!address.pincode || !/^\d{6}$/.test(address.pincode.replace(/\D/g, ""))) {
    errors.push("Valid 6-digit pincode is required");
  }
  if (!address.phone || validatePhone(address.phone).length < 10) {
    errors.push("Valid 10-digit phone number is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Payload validation result
 */
export interface PayloadValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate Shiprocket payload before API call
 * Ensures all required fields meet Shiprocket's requirements
 * 
 * Validates:
 * - phone matches /^\d{10}$/
 * - pincode matches /^\d{6}$/
 * - weight > 0
 * - length > 0, breadth > 0, height > 0
 * - pickup_location not empty
 * - order_items.length > 0
 */
export function validateShiprocketPayload(payload: ShiprocketOrderPayload): PayloadValidationResult {
  const errors: string[] = [];

  // Validate phone (10 digits)
  if (!payload.shipping_phone || !/^\d{10}$/.test(payload.shipping_phone)) {
    errors.push(`Invalid shipping phone: must be exactly 10 digits, got "${payload.shipping_phone || "empty"}"`);
  }
  if (!payload.billing_phone || !/^\d{10}$/.test(payload.billing_phone)) {
    errors.push(`Invalid billing phone: must be exactly 10 digits, got "${payload.billing_phone || "empty"}"`);
  }

  // Validate pincode (6 digits)
  if (!payload.shipping_pincode || !/^\d{6}$/.test(payload.shipping_pincode)) {
    errors.push(`Invalid shipping pincode: must be exactly 6 digits, got "${payload.shipping_pincode || "empty"}"`);
  }
  if (!payload.billing_pincode || !/^\d{6}$/.test(payload.billing_pincode)) {
    errors.push(`Invalid billing pincode: must be exactly 6 digits, got "${payload.billing_pincode || "empty"}"`);
  }

  // Validate weight > 0
  if (!payload.weight || payload.weight <= 0) {
    errors.push(`Invalid weight: must be greater than 0, got ${payload.weight}`);
  }

  // Validate dimensions > 0
  if (!payload.length || payload.length <= 0) {
    errors.push(`Invalid length: must be greater than 0, got ${payload.length}`);
  }
  if (!payload.breadth || payload.breadth <= 0) {
    errors.push(`Invalid breadth: must be greater than 0, got ${payload.breadth}`);
  }
  if (!payload.height || payload.height <= 0) {
    errors.push(`Invalid height: must be greater than 0, got ${payload.height}`);
  }

  // Validate pickup_location not empty
  if (!payload.pickup_location || !payload.pickup_location.trim()) {
    errors.push("Pickup location is required and cannot be empty");
  }

  // Validate order_items.length > 0
  if (!payload.order_items || payload.order_items.length === 0) {
    errors.push("Order must have at least one item");
  }

  // Validate each order item
  if (payload.order_items && payload.order_items.length > 0) {
    payload.order_items.forEach((item, index) => {
      if (!item.name || !item.name.trim()) {
        errors.push(`Item ${index + 1}: name is required`);
      }
      if (!item.sku || !item.sku.trim()) {
        errors.push(`Item ${index + 1}: SKU is required`);
      }
      if (!item.units || item.units <= 0) {
        errors.push(`Item ${index + 1}: units must be greater than 0`);
      }
      if (item.selling_price === undefined || item.selling_price < 0) {
        errors.push(`Item ${index + 1}: selling_price must be 0 or greater`);
      }
    });
  }

  // Validate required address fields
  if (!payload.shipping_address || !payload.shipping_address.trim()) {
    errors.push("Shipping address is required");
  }
  if (!payload.shipping_city || !payload.shipping_city.trim()) {
    errors.push("Shipping city is required");
  }
  if (!payload.shipping_state || !payload.shipping_state.trim()) {
    errors.push("Shipping state is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
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
 * Prepare fulfillment payload for Shiprocket
 * Uses ENV-based defaults for weight/dimensions
 */
export async function prepareFulfillmentPayload(
  order: OrderWithItems,
  orderItems: OrderItem[],
  shippingAddress: Address,
  billingAddress: Address | null
): Promise<FulfillmentPayload> {
  const supabase = createServiceRoleClient();

  // Validate package configuration
  if (!isPackageConfigValid()) {
    console.error("[FULFILLMENT] Invalid package configuration - check env vars");
  }

  // Get ENV-based defaults (never hardcoded)
  const packageWeight = getDefaultWeight();
  const packageDimensions = getDefaultDimensions();
  const pickupLocation = getPickupLocation();

  // Compute chargeable weight
  const chargeableWeight = computeChargeableWeight(packageWeight, packageDimensions);

  // Validate shipping address
  const addressValidation = validateAddress(shippingAddress);
  if (!addressValidation.valid) {
    console.warn("[FULFILLMENT] Address validation warnings:", addressValidation.errors);
    // Continue anyway - Shiprocket will reject if truly invalid
  }

  // Fetch product names for items (for better order display in Shiprocket)
  const productUids = [...new Set(orderItems.map((item) => item.product_uid))];
  const { data: products } = await supabase
    .from("products")
    .select("uid, name")
    .in("uid", productUids);

  const productsMap = new Map((products || []).map((p: { uid: string; name?: string }) => [p.uid, p]));

  // Build billing address (use shipping if not provided)
  const billAddr = billingAddress || shippingAddress;

  // Get email from order.shipping_email (preferred) or fallback to empty string
  const orderEmail = order.shipping_email || "";

  // Build Shiprocket payload with all required fields
  const shiprocketPayload: ShiprocketOrderPayload = {
    // Order identification
    order_id: order.order_number,
    order_date: new Date(order.created_at).toISOString().split("T")[0],
    
    // Pickup location from ENV
    pickup_location: pickupLocation,
    
    // Billing details
    billing_customer_name: billAddr.full_name || "Customer",
    billing_address: billAddr.line1 || "",
    billing_address_2: billAddr.line2 || undefined,
    billing_city: billAddr.city || "",
    billing_pincode: validatePincode(billAddr.pincode),
    billing_state: billAddr.state || "",
    billing_country: billAddr.country || "India",
    billing_email: orderEmail, // Use order.shipping_email
    billing_phone: validatePhone(billAddr.phone),
    
    // Shipping details
    shipping_is_billing: billingAddress?.id === shippingAddress.id || !billingAddress,
    shipping_customer_name: shippingAddress.full_name || "Customer",
    shipping_address: shippingAddress.line1 || "",
    shipping_address_2: shippingAddress.line2 || undefined,
    shipping_city: shippingAddress.city || "",
    shipping_pincode: validatePincode(shippingAddress.pincode),
    shipping_state: shippingAddress.state || "",
    shipping_country: shippingAddress.country || "India",
    shipping_email: orderEmail, // Use order.shipping_email
    shipping_phone: validatePhone(shippingAddress.phone),
    
    // Order items
    order_items: orderItems.map((item) => {
      const product = productsMap.get(item.product_uid);
      return {
        name: item.name || (product as { name?: string })?.name || "Product",
        sku: item.sku || `SKU-${item.id.substring(0, 8)}`,
        units: item.quantity,
        selling_price: item.price,
      };
    }),
    
    // Payment method (always Prepaid since we only ship after payment)
    payment_method: "Prepaid",
    
    // Totals
    sub_total: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    
    // Package dimensions from ENV
    length: packageDimensions.length,
    breadth: packageDimensions.breadth,
    height: packageDimensions.height,
    weight: chargeableWeight,
  };

  return {
    chargeableWeight,
    packageDimensions,
    shiprocketPayload,
  };
}

/**
 * Create Shiprocket order with retry
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
 * On success: shipment_status = "BOOKED", saves awb_code
 * On failure: shipment_status = "FAILED"
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

  const existingMetadata = ((orderData as { metadata?: Record<string, unknown> } | null)?.metadata as Record<string, unknown>) || {};
  const shippingMetadata = (existingMetadata.shipping as Record<string, unknown>) || {};
  const shippingTimeline = (existingMetadata.shipping_timeline as unknown[]) || [];

  const updatedMetadata = {
    ...existingMetadata,
    shipping: {
      ...shippingMetadata,
      awb: response.awb_code || null,
      awb_code: response.awb_code || null, // Duplicate for consistency
      courier: response.courier_name || null,
      courier_company_id: response.courier_company_id || null,
      tracking_url: response.tracking_url || null,
      expected_delivery: response.expected_delivery_date || null,
      shipment_id: response.shipment_id,
      updated_at: new Date().toISOString(),
    },
    shiprocket_response: response,
    package_weight_kg: fulfillmentPayload.chargeableWeight,
    package_length_cm: fulfillmentPayload.packageDimensions.length,
    package_breadth_cm: fulfillmentPayload.packageDimensions.breadth,
    package_height_cm: fulfillmentPayload.packageDimensions.height,
    shipping_timeline: [
      ...shippingTimeline,
      {
        status: "BOOKED",
        timestamp: new Date().toISOString(),
        awb: response.awb_code || null,
        courier: response.courier_name || null,
        shipment_id: response.shipment_id,
      },
    ],
  };

  // Update order with BOOKED status
  const { error: updateError } = await supabase.from("orders").update({
    shiprocket_shipment_id: String(response.shipment_id),
    shipment_status: "BOOKED", // Success status
    shipping_status: response.awb_code ? "shipped" : "processing",
    courier_name: response.courier_name || null,
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
      action: "shipment_booked",
      target_resource: "orders",
      target_id: orderId,
      details: {
        shipment_id: response.shipment_id,
        awb_code: response.awb_code,
        courier_name: response.courier_name,
        weight_kg: fulfillmentPayload.chargeableWeight,
      },
    } as unknown as never);
  } catch (auditError) {
    console.warn("[FULFILLMENT] Audit log write failed (non-fatal)");
  }
}

/**
 * Mark order as fulfillment failed
 * Saves error message and allows retry
 */
async function markFulfillmentFailed(
  orderId: string,
  orderNumber: string,
  errorMessage: string,
  errorDetails?: unknown
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Fetch current metadata
  const { data: orderData } = await supabase
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  const existingMetadata = ((orderData as { metadata?: Record<string, unknown> } | null)?.metadata as Record<string, unknown>) || {};
  const shippingTimeline = (existingMetadata.shipping_timeline as unknown[]) || [];

  const updatedMetadata = {
    ...existingMetadata,
    shipment_error: errorMessage,
    shipment_error_details: errorDetails || null,
    shipment_failed_at: new Date().toISOString(),
    shipping_timeline: [
      ...shippingTimeline,
      {
        status: "FAILED",
        timestamp: new Date().toISOString(),
        error: errorMessage,
      },
    ],
  };

  // Update order with FAILED status
  await supabase
    .from("orders")
    .update({
      shipment_status: "FAILED", // Failure status - allows retry
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", orderId);

  // Write audit log
  try {
    await supabase.from("admin_audit_logs").insert({
      action: "shipment_failed",
      target_resource: "orders",
      target_id: orderId,
      details: {
        order_number: orderNumber,
        error: errorMessage,
        requires_attention: true,
      },
    } as unknown as never);
  } catch (auditError) {
    console.warn("[FULFILLMENT] Audit log write failed (non-fatal)");
  }
}

/**
 * Safe wrapper to create AWB only if missing (idempotent)
 * Main entry point for fulfillment
 */
export async function safeCreateAWBIfMissing(orderId: string): Promise<{
  success: boolean;
  awb?: string;
  shipment_id?: string;
  error?: string;
  alreadyExists?: boolean;
}> {
  const supabase = createServiceRoleClient();

  // Fetch order with full details including shipping address fields
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, shipping_address_id, billing_address_id, payment_status, payment_provider, metadata, shiprocket_shipment_id, shipment_status, created_at, shipping_name, shipping_phone, shipping_email, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_pincode, shipping_country"
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

  const order = orderData as OrderWithItems & { shipment_status?: string | null };

  // Check if already fulfilled successfully (not FAILED)
  const metadata = (order.metadata as Record<string, unknown>) || {};
  const shippingMetadata = (metadata.shipping as Record<string, unknown>) || {};
  const existingAWB = (shippingMetadata.awb as string) || null;
  const existingShipmentId = order.shiprocket_shipment_id;

  // Idempotency: if BOOKED with AWB, return existing
  if (existingAWB && existingShipmentId && order.shipment_status !== "FAILED") {
    return {
      success: true,
      awb: existingAWB,
      shipment_id: existingShipmentId,
      alreadyExists: true,
    };
  }

  // Allow retry if status is FAILED or PENDING
  if (order.shipment_status && !["FAILED", "PENDING", null].includes(order.shipment_status)) {
    // Already in progress or booked
    if (existingShipmentId) {
      return {
        success: true,
        shipment_id: existingShipmentId,
        awb: existingAWB || undefined,
        alreadyExists: true,
      };
    }
  }

  // Check payment status
  if (order.payment_status !== "paid") {
    return {
      success: false,
      error: `Order payment status is ${order.payment_status}, not paid`,
    };
  }

  // STEP: Check for shipping address - prefer order.shipping_* fields, fallback to addresses table
  let shippingAddress: Address | null = null;
  let billingAddress: Address | null = null;

  // Check if shipping address is stored directly in order record
  const hasDirectShippingAddress = 
    order.shipping_name &&
    order.shipping_phone &&
    order.shipping_address1 &&
    order.shipping_city &&
    order.shipping_state &&
    order.shipping_pincode;

  if (hasDirectShippingAddress) {
    // Use shipping address from order record
    shippingAddress = {
      id: order.id, // Use order ID as identifier
      full_name: order.shipping_name,
      phone: order.shipping_phone,
      line1: order.shipping_address1,
      line2: order.shipping_address2 || null,
      city: order.shipping_city,
      state: order.shipping_state,
      pincode: order.shipping_pincode,
      country: order.shipping_country || "India",
    };

    // For billing, use shipping address if no separate billing address
    billingAddress = shippingAddress;
  } else if (order.shipping_address_id) {
    // Fallback: Fetch from addresses table
    const { data: fetchedShippingAddress } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", order.shipping_address_id)
      .single();

    if (!fetchedShippingAddress) {
      console.error("[FULFILLMENT_MISSING_SHIPPING_ADDRESS]", {
        order_id: orderId,
        order_number: order.order_number,
        shipping_address_id: order.shipping_address_id,
        has_direct_fields: false,
        timestamp: new Date().toISOString(),
      });

      // Mark order as FAILED
      await markFulfillmentFailed(
        orderId,
        order.order_number,
        "MISSING_SHIPPING_ADDRESS: Shipping address not found in addresses table"
      );

      return { success: false, error: "MISSING_SHIPPING_ADDRESS" };
    }

    shippingAddress = fetchedShippingAddress as Address;

    const billingAddressId = order.billing_address_id || order.shipping_address_id;
    const { data: fetchedBillingAddress } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", billingAddressId)
      .single();

    billingAddress = fetchedBillingAddress ? (fetchedBillingAddress as unknown as Address) : null;
  } else {
    // No shipping address at all
    console.error("[FULFILLMENT_MISSING_SHIPPING_ADDRESS]", {
      order_id: orderId,
      order_number: order.order_number,
      shipping_address_id: order.shipping_address_id,
      has_direct_fields: hasDirectShippingAddress,
      timestamp: new Date().toISOString(),
    });

    // Mark order as FAILED
    await markFulfillmentFailed(
      orderId,
      order.order_number,
      "MISSING_SHIPPING_ADDRESS: No shipping address found in order record or addresses table"
    );

    return { success: false, error: "MISSING_SHIPPING_ADDRESS" };
  }

  // Fetch order items
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, product_uid, variant_id, sku, name, quantity, price")
    .eq("order_id", orderId);

  if (!orderItems || orderItems.length === 0) {
    return { success: false, error: "Order has no items" };
  }

  try {
    console.log("[FULFILLMENT] Creating shipment for order:", order.order_number);

    // Prepare fulfillment payload (uses ENV-based defaults)
    const fulfillmentPayload = await prepareFulfillmentPayload(
      order,
      orderItems as OrderItem[],
      shippingAddress as Address,
      billingAddress as Address | null
    );

    // STEP: Validate payload BEFORE calling Shiprocket API
    const payloadValidation = validateShiprocketPayload(fulfillmentPayload.shiprocketPayload);
    
    if (!payloadValidation.valid) {
      const errorMsg = `Invalid payload: ${payloadValidation.errors.join("; ")}`;
      
      console.error("[SHIPMENT_PAYLOAD_INVALID]", {
        order_id: orderId,
        order_number: order.order_number,
        errors: payloadValidation.errors,
        timestamp: new Date().toISOString(),
      });

      // Mark as FAILED with validation error
      await markFulfillmentFailed(orderId, order.order_number, errorMsg, {
        validation_errors: payloadValidation.errors,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }

    // Log valid payload for debugging
    console.log("[SHIPMENT_PAYLOAD_VALID]", {
      order_number: order.order_number,
      weight: fulfillmentPayload.chargeableWeight,
      dimensions: fulfillmentPayload.packageDimensions,
      pickup_location: fulfillmentPayload.shiprocketPayload.pickup_location,
      timestamp: new Date().toISOString(),
    });

    // Create Shiprocket order
    const response = await createShiprocketOrderForFulfillment(
      order,
      fulfillmentPayload.shiprocketPayload
    );

    console.log("[FULFILLMENT] Shiprocket response:", {
      order_number: order.order_number,
      shipment_id: response.shipment_id,
      awb_code: response.awb_code,
      status: response.status,
    });

    // Handle success response
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
          console.warn("[FULFILLMENT] Shipping notification email failed");
        }
      } catch (emailError) {
        // Don't fail fulfillment if email fails
        console.warn("[FULFILLMENT] Failed to send shipping notification (non-fatal)");
      }
    }

    return {
      success: true,
      awb: response.awb_code || undefined,
      shipment_id: String(response.shipment_id),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("[FULFILLMENT] Shipment creation failed:", {
      order_id: orderId,
      order_number: order.order_number,
      error: errorMessage,
    });

    // Mark as FAILED (allows retry)
    await markFulfillmentFailed(orderId, order.order_number, errorMessage, error);

    return {
      success: false,
      error: errorMessage || "Fulfillment failed",
    };
  }
}
