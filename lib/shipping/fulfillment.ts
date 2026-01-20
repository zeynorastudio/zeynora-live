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
 * STEP 2: Strengthened validation with all required fields
 */
export function validateShiprocketPayload(payload: ShiprocketOrderPayload): PayloadValidationResult {
  const errors: string[] = [];

  // Validate pickup_location exactly matches Shiprocket dashboard name
  if (!payload.pickup_location || !payload.pickup_location.trim()) {
    errors.push("pickup_location is required and cannot be empty");
  }

  // Validate billing fields
  if (!payload.billing_customer_name || !payload.billing_customer_name.trim()) {
    errors.push("billing_customer_name is required and cannot be empty");
  }
  if (!payload.billing_phone || !/^\d{10}$/.test(payload.billing_phone)) {
    errors.push(`billing_phone must be exactly 10 digits, got "${payload.billing_phone || "empty"}"`);
  }
  if (!payload.billing_email || !payload.billing_email.trim() || !payload.billing_email.includes("@")) {
    errors.push(`billing_email must be valid (not empty and contain '@'), got "${payload.billing_email || "empty"}"`);
  }
  if (!payload.billing_address || !payload.billing_address.trim()) {
    errors.push("billing_address is required and cannot be empty");
  }
  if (!payload.billing_city || !payload.billing_city.trim()) {
    errors.push("billing_city is required and cannot be empty");
  }
  if (!payload.billing_state || !payload.billing_state.trim()) {
    errors.push("billing_state is required and cannot be empty");
  }
  if (!payload.billing_pincode || !/^\d{6}$/.test(payload.billing_pincode)) {
    errors.push(`billing_pincode must be exactly 6 digits, got "${payload.billing_pincode || "empty"}"`);
  }
  if (!payload.billing_country || !payload.billing_country.trim()) {
    errors.push("billing_country is required and cannot be empty");
  }

  // Validate shipping fields (same rules)
  if (!payload.shipping_customer_name || !payload.shipping_customer_name.trim()) {
    errors.push("shipping_customer_name is required and cannot be empty");
  }
  if (!payload.shipping_phone || !/^\d{10}$/.test(payload.shipping_phone)) {
    errors.push(`shipping_phone must be exactly 10 digits, got "${payload.shipping_phone || "empty"}"`);
  }
  if (!payload.shipping_email || !payload.shipping_email.trim() || !payload.shipping_email.includes("@")) {
    errors.push(`shipping_email must be valid (not empty and contain '@'), got "${payload.shipping_email || "empty"}"`);
  }
  if (!payload.shipping_address || !payload.shipping_address.trim()) {
    errors.push("shipping_address is required and cannot be empty");
  }
  if (!payload.shipping_city || !payload.shipping_city.trim()) {
    errors.push("shipping_city is required and cannot be empty");
  }
  if (!payload.shipping_state || !payload.shipping_state.trim()) {
    errors.push("shipping_state is required and cannot be empty");
  }
  if (!payload.shipping_pincode || !/^\d{6}$/.test(payload.shipping_pincode)) {
    errors.push(`shipping_pincode must be exactly 6 digits, got "${payload.shipping_pincode || "empty"}"`);
  }
  if (!payload.shipping_country || !payload.shipping_country.trim()) {
    errors.push("shipping_country is required and cannot be empty");
  }

  // Validate order_items.length > 0
  if (!payload.order_items || payload.order_items.length === 0) {
    errors.push("order_items.length must be greater than 0");
  }

  // Validate each order item
  if (payload.order_items && payload.order_items.length > 0) {
    payload.order_items.forEach((item, index) => {
      if (!item.name || !item.name.trim()) {
        errors.push(`order_items[${index}].name is required and cannot be empty`);
      }
      if (!item.sku || !item.sku.trim()) {
        errors.push(`order_items[${index}].sku is required and cannot be empty`);
      }
      if (!item.units || item.units <= 0) {
        errors.push(`order_items[${index}].units must be greater than 0, got ${item.units}`);
      }
      if (item.selling_price === undefined || item.selling_price <= 0) {
        errors.push(`order_items[${index}].selling_price must be greater than 0, got ${item.selling_price}`);
      }
    });
  }

  // Validate payment_method set correctly
  if (!payload.payment_method || !["Prepaid", "COD"].includes(payload.payment_method)) {
    errors.push(`payment_method must be "Prepaid" or "COD", got "${payload.payment_method || "empty"}"`);
  }

  // Validate weight > 0
  if (!payload.weight || payload.weight <= 0) {
    errors.push(`weight must be greater than 0, got ${payload.weight}`);
  }

  // Validate dimensions > 0
  if (!payload.length || payload.length <= 0) {
    errors.push(`length must be greater than 0, got ${payload.length}`);
  }
  if (!payload.breadth || payload.breadth <= 0) {
    errors.push(`breadth must be greater than 0, got ${payload.breadth}`);
  }
  if (!payload.height || payload.height <= 0) {
    errors.push(`height must be greater than 0, got ${payload.height}`);
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
 * STEP 1: Normalize customer name - split first word and remaining words
 */
function normalizeCustomerName(fullName: string | null): { firstName: string; lastName: string } {
  const name = (fullName || "Customer").trim();
  const words = name.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) {
    return { firstName: "Customer", lastName: "." };
  }
  
  if (words.length === 1) {
    return { firstName: words[0], lastName: "." };
  }
  
  return {
    firstName: words[0],
    lastName: words.slice(1).join(" ") || "."
  };
}

/**
 * STEP 3: Normalize data types - ensure integers are integers, not strings
 */
function normalizeInteger(value: string | number | null | undefined, fallback: number = 0): number {
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) return fallback;
    return Math.round(value);
  }
  if (typeof value === "string") {
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function normalizeFloat(value: string | number | null | undefined, decimals: number = 2, fallback: number = 0): number {
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) return fallback;
    return parseFloat(value.toFixed(decimals));
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parseFloat(parsed.toFixed(decimals));
  }
  return fallback;
}

/**
 * STEP 7: Final payload sanity check
 */
function validatePayloadSanity(payload: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  function checkField(key: string, value: unknown, required: boolean = true): void {
    if (required && (value === undefined || value === null)) {
      errors.push(`${key} is undefined or null`);
      return;
    }
    
    if (value === undefined || value === null) {
      return; // Optional fields can be undefined/null
    }
    
    if (typeof value === "string" && value.trim() === "" && required) {
      errors.push(`${key} is empty string`);
      return;
    }
    
    if (typeof value === "number" && (isNaN(value) || !isFinite(value))) {
      errors.push(`${key} is NaN or not finite`);
      return;
    }
  }
  
  // Check all fields
  Object.keys(payload).forEach(key => {
    const value = payload[key];
    
    // Skip optional fields that are undefined
    if (value === undefined && (key === "billing_address_2" || key === "shipping_address_2" || key === "billing_last_name" || key === "shipping_last_name")) {
      return;
    }
    
    checkField(key, value, true);
    
    // Check for empty strings in required fields
    if (typeof value === "string" && value.trim() === "" && key !== "billing_address_2" && key !== "shipping_address_2" && key !== "billing_last_name" && key !== "shipping_last_name") {
      errors.push(`${key} is empty string`);
    }
    
    // Check for NaN in numeric fields
    if (typeof value === "number" && (isNaN(value) || !isFinite(value))) {
      errors.push(`${key} is NaN or not finite`);
    }
  });
  
  // Check order_items array
  if (payload.order_items && Array.isArray(payload.order_items)) {
    (payload.order_items as unknown[]).forEach((item: unknown, index: number) => {
      if (typeof item !== "object" || item === null) {
        errors.push(`order_items[${index}] is not an object`);
        return;
      }
      
      const itemObj = item as Record<string, unknown>;
      checkField(`order_items[${index}].name`, itemObj.name);
      checkField(`order_items[${index}].sku`, itemObj.sku);
      checkField(`order_items[${index}].units`, itemObj.units);
      checkField(`order_items[${index}].selling_price`, itemObj.selling_price);
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Prepare fulfillment payload for Shiprocket
 * FINAL VERSION: Strict payload normalization to fix 422 errors
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
  }

  // Fetch product names for items
  const productUids = [...new Set(orderItems.map((item) => item.product_uid))];
  const { data: products } = await supabase
    .from("products")
    .select("uid, name")
    .in("uid", productUids);

  const productsMap = new Map((products || []).map((p: { uid: string; name?: string }) => [p.uid, p]));

  // Build billing address (use shipping if not provided)
  const billAddr = billingAddress || shippingAddress;

  // STEP 1: Validate email from order.shipping_email
  const orderEmail = order.shipping_email || "";
  
  if (!orderEmail || !orderEmail.trim() || !orderEmail.includes("@")) {
    console.error("[FULFILLMENT_EMAIL_VALIDATION_FAILED]", {
      order_id: order.id,
      order_number: order.order_number,
      shipping_email: order.shipping_email,
      error: "MISSING_EMAIL",
      timestamp: new Date().toISOString(),
    });
    throw new Error("MISSING_EMAIL");
  }

  // STEP 1: Normalize customer names from order.shipping_name
  const billingName = normalizeCustomerName(order.shipping_name || billAddr.full_name);
  const shippingName = normalizeCustomerName(order.shipping_name || shippingAddress.full_name);

  // STEP 2: Determine if shipping is billing
  const shippingIsBilling = billingAddress?.id === shippingAddress.id || !billingAddress;

  // STEP 3: Normalize all data types
  const normalizedBillingPhone = normalizeInteger(validatePhone(billAddr.phone));
  const normalizedShippingPhone = normalizeInteger(validatePhone(shippingAddress.phone));
  const normalizedBillingPincode = normalizeInteger(validatePincode(billAddr.pincode));
  const normalizedShippingPincode = normalizeInteger(validatePincode(shippingAddress.pincode));
  
  // STEP 4: Fix order_date format - full ISO string with time
  const orderDate = new Date(order.created_at).toISOString();

  // STEP 5: Determine payment method and cod flag
  const paymentMethod = "Prepaid"; // Always prepaid since we only ship after payment
  const codFlag = 0; // 0 for prepaid

  // STEP 6: Normalize order items
  const normalizedOrderItems = orderItems.map((item) => {
    const product = productsMap.get(item.product_uid);
    return {
      name: (item.name || (product as { name?: string })?.name || "Product").trim(),
      sku: (item.sku || `SKU-${item.id.substring(0, 8)}`).trim(),
      units: normalizeInteger(item.quantity),
      selling_price: normalizeInteger(item.price),
      discount: 0,
      tax: 0,
    };
  });

  // Calculate totals as integers
  const subTotal = normalizeInteger(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const orderTotal = subTotal;
  const shippingCharges = 0;

  // Normalize dimensions and weight
  const normalizedLength = normalizeInteger(packageDimensions.length);
  const normalizedBreadth = normalizeInteger(packageDimensions.breadth);
  const normalizedHeight = normalizeInteger(packageDimensions.height);
  const normalizedWeight = normalizeFloat(chargeableWeight, 2);

  // Build base payload
  const basePayload: Record<string, unknown> = {
    order_id: order.order_number,
    order_date: orderDate,
    pickup_location: pickupLocation.trim(),
    
    // Billing details with normalized names
    billing_customer_name: billingName.firstName,
    billing_last_name: billingName.lastName,
    billing_address: (billAddr.line1 || "").trim(),
    billing_address_2: billAddr.line2?.trim() || undefined,
    billing_city: (billAddr.city || "").trim(),
    billing_pincode: normalizedBillingPincode,
    billing_state: (billAddr.state || "").trim(),
    billing_country: (billAddr.country || "India").trim(),
    billing_email: orderEmail.trim(),
    billing_phone: normalizedBillingPhone,
    
    // Payment fields
    payment_method: paymentMethod,
    cod: codFlag,
    sub_total: subTotal,
    order_total: orderTotal,
    shipping_charges: shippingCharges,
    
    // Package dimensions (integers)
    length: normalizedLength,
    breadth: normalizedBreadth,
    height: normalizedHeight,
    weight: normalizedWeight,
    
    // Order items
    order_items: normalizedOrderItems,
  };

  // STEP 2: Conditionally add shipping fields
  if (!shippingIsBilling) {
    basePayload.shipping_is_billing = false;
    basePayload.shipping_customer_name = shippingName.firstName;
    basePayload.shipping_last_name = shippingName.lastName;
    basePayload.shipping_address = (shippingAddress.line1 || "").trim();
    basePayload.shipping_address_2 = shippingAddress.line2?.trim() || undefined;
    basePayload.shipping_city = (shippingAddress.city || "").trim();
    basePayload.shipping_pincode = normalizedShippingPincode;
    basePayload.shipping_state = (shippingAddress.state || "").trim();
    basePayload.shipping_country = (shippingAddress.country || "India").trim();
    basePayload.shipping_email = orderEmail.trim();
    basePayload.shipping_phone = normalizedShippingPhone;
  } else {
    basePayload.shipping_is_billing = true;
  }

  // STEP 7: Final payload sanity check
  const sanityCheck = validatePayloadSanity(basePayload);
  if (!sanityCheck.valid) {
    const errorMsg = `PAYLOAD_NORMALIZATION_FAILED: ${sanityCheck.errors.join("; ")}`;
    console.error("[FULFILLMENT_PAYLOAD_SANITY_CHECK_FAILED]", {
      order_id: order.id,
      order_number: order.order_number,
      errors: sanityCheck.errors,
      timestamp: new Date().toISOString(),
    });
    throw new Error(errorMsg);
  }

  // Cast to ShiprocketOrderPayload (with type assertion for additional fields)
  const shiprocketPayload = basePayload as unknown as ShiprocketOrderPayload;

  return {
    chargeableWeight: normalizedWeight,
    packageDimensions: {
      length: normalizedLength,
      breadth: normalizedBreadth,
      height: normalizedHeight,
    },
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
      const errorMsg = `INVALID_PAYLOAD: ${payloadValidation.errors.join("; ")}`;
      
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

    // STEP 7: Final payload sanity check before API call
    const sanityCheck = validatePayloadSanity(fulfillmentPayload.shiprocketPayload as unknown as Record<string, unknown>);
    if (!sanityCheck.valid) {
      const errorMsg = `PAYLOAD_NORMALIZATION_FAILED: ${sanityCheck.errors.join("; ")}`;
      
      console.error("[SHIPMENT_PAYLOAD_SANITY_CHECK_FAILED]", {
        order_id: orderId,
        order_number: order.order_number,
        errors: sanityCheck.errors,
        timestamp: new Date().toISOString(),
      });

      await markFulfillmentFailed(orderId, order.order_number, errorMsg, {
        sanity_check_errors: sanityCheck.errors,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }

    // STEP 8: Log final payload ONCE before calling Shiprocket
    console.log("[SHIPROCKET_FINAL_PAYLOAD]", JSON.stringify(fulfillmentPayload.shiprocketPayload, null, 2));

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
    // If error is MISSING_EMAIL or PAYLOAD_NORMALIZATION_FAILED, use that exact error code
    const finalError = errorMessage === "MISSING_EMAIL" || errorMessage.startsWith("PAYLOAD_NORMALIZATION_FAILED") 
      ? errorMessage 
      : errorMessage;
    await markFulfillmentFailed(orderId, order.order_number, finalError, error);

    return {
      success: false,
      error: finalError || "Fulfillment failed",
    };
  }
}
