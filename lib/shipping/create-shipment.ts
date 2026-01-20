/**
 * FINAL — Shipment Creation Service
 * 
 * Creates shipments in Shiprocket only after payment confirmation
 * 
 * Requirements:
 * - Only create shipment when order_status = PAID
 * - Idempotent (no duplicate shipments)
 * - Never expose tokens to frontend
 * - Handle failures gracefully
 * - On success: shipment_status = "BOOKED"
 * - On failure: shipment_status = "FAILED" (allows retry)
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  createShiprocketOrder,
  ShiprocketOrderPayload,
  ShiprocketOrderResponse,
  validateShiprocketEnv,
} from "./shiprocket-client";
import { prepareFulfillmentPayload, validateShiprocketPayload } from "./fulfillment";
import { calculateShippingRate } from "./rate-calculator";

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
  metadata: Record<string, unknown> | null;
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

interface CreateShipmentResult {
  success: boolean;
  shipment_id?: string;
  awb_code?: string;
  courier_name?: string;
  internal_shipping_cost?: number;
  error?: string;
  already_exists?: boolean;
}

/**
 * Create shipment in Shiprocket for a paid order
 * 
 * Flow:
 * 1. Validate order is PAID
 * 2. Check idempotency (skip if already BOOKED)
 * 3. Fetch addresses and items
 * 4. Calculate shipping cost
 * 5. Create shipment in Shiprocket
 * 6. Update order with results
 * 
 * On success:
 * - Save shipment_id, awb_code
 * - shipment_status = "BOOKED"
 * - internal_shipping_cost stored
 * 
 * On failure:
 * - shipment_status = "FAILED"
 * - Save error message
 * - Allow retry
 */
export async function createShipmentForPaidOrder(
  orderId: string
): Promise<CreateShipmentResult> {
  const supabase = createServiceRoleClient();

  // Log start
  console.log("[SHIPMENT_START]", { order_id: orderId, timestamp: new Date().toISOString() });

  // Fetch order with full details including shipping address fields
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_status, payment_status, shipping_address_id, billing_address_id, shiprocket_shipment_id, shipment_status, courier_name, metadata, created_at, shipping_name, shipping_phone, shipping_email, shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_pincode, shipping_country"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    console.error("[SHIPMENT_ERROR] Order not found:", {
      order_id: orderId,
      error: orderError?.message || "No data returned",
    });
    return { success: false, error: "Order not found" };
  }

  const order = orderData as OrderWithItems;

  // CRITICAL: Only create shipment for PAID orders
  if (order.order_status !== "paid" || order.payment_status !== "paid") {
    console.warn("[SHIPMENT_SKIP] Order not paid:", {
      order_id: orderId,
      order_status: order.order_status,
      payment_status: order.payment_status,
    });
    return {
      success: false,
      error: `Order status is ${order.order_status}/${order.payment_status}, not paid`,
    };
  }

  // Enforce SHIPROCKET_ENABLED flag
  if (process.env.SHIPROCKET_ENABLED !== "true") {
    const errorMessage = "Shiprocket disabled: paid order requires manual fulfillment";
    console.error("[SHIPMENT_DISABLED]", { order_id: orderId });
    // Don't throw - return failure so order remains PAID
    return { success: false, error: errorMessage };
  }

  // STEP: Validate ENV before proceeding
  const envValidation = validateShiprocketEnv();
  if (!envValidation.valid) {
    const errorMessage = `CONFIG_ERROR: Missing environment variables: ${envValidation.missing.join(", ")}`;
    console.error("[SHIPROCKET_ENV_MISSING]", {
      order_id: orderId,
      missing: envValidation.missing,
      timestamp: new Date().toISOString(),
    });

    // Mark order as FAILED
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: errorMessage,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);
    } catch (dbError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
        order_id: orderId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }

    return { success: false, error: errorMessage };
  }

  // Idempotency check: if shipment already BOOKED, return existing data
  // Allow retry if shipment_status is "FAILED" or null
  if (
    order.shiprocket_shipment_id && 
    order.shipment_status && 
    order.shipment_status !== "FAILED" &&
    order.shipment_status !== "PENDING"
  ) {
    console.log("[SHIPMENT_EXISTS]", {
      order_id: orderId,
      shipment_id: order.shiprocket_shipment_id,
      status: order.shipment_status,
    });
    
    const existingMetadata = (order.metadata as Record<string, unknown>) || {};
    const shippingData = (existingMetadata.shipping as Record<string, unknown>) || {};
    
    return {
      success: true,
      shipment_id: order.shiprocket_shipment_id,
      awb_code: (shippingData.awb_code as string) || undefined,
      courier_name: order.courier_name || undefined,
      already_exists: true,
    };
  }

  // STEP: Check for shipping address - prefer order.shipping_* fields, fallback to addresses table
  let shippingAddress: Address | null = null;
  let billingAddress: Address | null = null;

  // Check if shipping address is stored directly in order record
  // Validate required fields before proceeding
  const hasDirectShippingAddress = 
    order.shipping_name &&
    order.shipping_name.trim() &&
    order.shipping_phone &&
    /^\d{10}$/.test(order.shipping_phone.replace(/\D/g, "")) &&
    order.shipping_address1 &&
    order.shipping_address1.trim() &&
    order.shipping_city &&
    order.shipping_city.trim() &&
    order.shipping_state &&
    order.shipping_state.trim() &&
    order.shipping_pincode &&
    /^\d{6}$/.test(order.shipping_pincode.replace(/\D/g, ""));

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
      console.error("[SHIPMENT_MISSING_SHIPPING_ADDRESS]", {
        order_id: orderId,
        order_number: order.order_number,
        shipping_address_id: order.shipping_address_id,
        has_direct_fields: false,
        timestamp: new Date().toISOString(),
      });

      // Mark order as FAILED
      try {
        const existingMetadata = (order.metadata as Record<string, unknown>) || {};
        await supabase
          .from("orders")
          .update({
            shipment_status: "FAILED",
            metadata: {
              ...existingMetadata,
              shipment_error: "MISSING_SHIPPING_ADDRESS: Shipping address not found in addresses table",
              shipment_failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", orderId);
      } catch (dbError) {
        console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
          order_id: orderId,
          error: dbError instanceof Error ? dbError.message : "Unknown error",
        });
      }

      return { success: false, error: "MISSING_SHIPPING_ADDRESS" };
    }

    shippingAddress = fetchedShippingAddress as Address;

    const billingAddressId = order.billing_address_id || order.shipping_address_id;
    const { data: fetchedBillingAddress } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", billingAddressId)
      .single();

    billingAddress = (fetchedBillingAddress as Address) || null;
  } else {
    // No shipping address at all
    console.error("[SHIPMENT_MISSING_SHIPPING_ADDRESS]", {
      order_id: orderId,
      order_number: order.order_number,
      shipping_address_id: order.shipping_address_id,
      has_direct_fields: hasDirectShippingAddress,
      timestamp: new Date().toISOString(),
    });

    // Mark order as FAILED
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: "MISSING_SHIPPING_ADDRESS: No shipping address found in order record or addresses table",
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);
    } catch (dbError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
        order_id: orderId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }

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

  const typedShippingAddress = shippingAddress as Address;
  const typedBillingAddress = billingAddress as Address | null;
  const typedOrderItems = orderItems as OrderItem[];

  // STEP 3: Calculate shipping cost BEFORE creating shipment
  let internalShippingCost = 0;
  try {
    const shippingPincode = typedShippingAddress.pincode || "";
    if (shippingPincode && /^\d{6}$/.test(shippingPincode.replace(/\D/g, ""))) {
      const rateResult = await calculateShippingRate(shippingPincode.replace(/\D/g, ""));
      if (rateResult.success) {
        internalShippingCost = rateResult.shipping_cost;
        console.log("[SHIPPING_COST_CALCULATED]", {
          order_id: orderId,
          pincode: shippingPincode,
          cost: internalShippingCost,
          courier: rateResult.courier_name,
        });
      }
    }
  } catch (rateError) {
    console.warn("[SHIPPING_COST_FAILED]", {
      order_id: orderId,
      error: rateError instanceof Error ? rateError.message : "Unknown error",
    });
    // Continue with 0 cost - don't block shipment
  }

  // STEP: Validate address fields before proceeding
  if (!typedShippingAddress.full_name || !typedShippingAddress.full_name.trim()) {
    const errorMessage = "INVALID_ADDRESS: shipping_name is required";
    console.error("[SHIPMENT_ADDRESS_VALIDATION_FAILED]", {
      order_id: orderId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: errorMessage,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);
    } catch (dbError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
        order_id: orderId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }
    
    return { success: false, error: errorMessage };
  }

  if (!typedShippingAddress.phone || !/^\d{10}$/.test(typedShippingAddress.phone.replace(/\D/g, ""))) {
    const errorMessage = "INVALID_ADDRESS: shipping_phone must be exactly 10 digits";
    console.error("[SHIPMENT_ADDRESS_VALIDATION_FAILED]", {
      order_id: orderId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: errorMessage,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);
    } catch (dbError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
        order_id: orderId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }
    
    return { success: false, error: errorMessage };
  }

  if (!typedShippingAddress.pincode || !/^\d{6}$/.test(typedShippingAddress.pincode.replace(/\D/g, ""))) {
    const errorMessage = "INVALID_ADDRESS: shipping_pincode must be exactly 6 digits";
    console.error("[SHIPMENT_ADDRESS_VALIDATION_FAILED]", {
      order_id: orderId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: errorMessage,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);
    } catch (dbError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
        order_id: orderId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }
    
    return { success: false, error: errorMessage };
  }

  if (!typedShippingAddress.line1 || !typedShippingAddress.line1.trim()) {
    const errorMessage = "INVALID_ADDRESS: shipping_address1 is required";
    console.error("[SHIPMENT_ADDRESS_VALIDATION_FAILED]", {
      order_id: orderId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: errorMessage,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);
    } catch (dbError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
        order_id: orderId,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      });
    }
    
    return { success: false, error: errorMessage };
  }

  try {
    // Prepare fulfillment payload (uses ENV-based weight/dimensions)
    const fulfillmentPayload = await prepareFulfillmentPayload(
      order as unknown as Parameters<typeof prepareFulfillmentPayload>[0],
      typedOrderItems,
      typedShippingAddress,
      typedBillingAddress
    );

    // STEP: Validate payload BEFORE calling Shiprocket API
    const payloadValidation = validateShiprocketPayload(fulfillmentPayload.shiprocketPayload);
    
    if (!payloadValidation.valid) {
      const errorMessage = `Invalid payload: ${payloadValidation.errors.join("; ")}`;
      
      console.error("[SHIPMENT_PAYLOAD_INVALID]", {
        order_id: orderId,
        order_number: order.order_number,
        errors: payloadValidation.errors,
        timestamp: new Date().toISOString(),
      });

      // Mark order as FAILED with validation error
      try {
        const existingMetadata = (order.metadata as Record<string, unknown>) || {};
        await supabase
          .from("orders")
          .update({
            shipment_status: "FAILED",
            metadata: {
              ...existingMetadata,
              shipment_error: errorMessage,
              shipment_validation_errors: payloadValidation.errors,
              shipment_failed_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          } as unknown as never)
          .eq("id", orderId);

        // Write audit log for validation failure
        await supabase.from("admin_audit_logs").insert({
          action: "shipment_validation_failed",
          target_resource: "orders",
          target_id: orderId,
          details: {
            order_number: order.order_number,
            errors: payloadValidation.errors,
            requires_attention: true,
          },
        } as unknown as never);
      } catch (dbError) {
        console.error("[SHIPMENT_VALIDATION_DB_UPDATE_FAILED]", {
          order_id: orderId,
          error: dbError instanceof Error ? dbError.message : "Unknown error",
        });
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    // Log valid payload before calling Shiprocket
    console.log("[SHIPMENT_PAYLOAD_VALID]", {
      order_number: order.order_number,
      pickup_location: fulfillmentPayload.shiprocketPayload.pickup_location,
      weight: fulfillmentPayload.chargeableWeight,
      dimensions: fulfillmentPayload.packageDimensions,
      timestamp: new Date().toISOString(),
    });

    // Create shipment in Shiprocket (auth happens inside createShiprocketOrder)
    const response = await createShiprocketOrder(fulfillmentPayload.shiprocketPayload);

    // CRITICAL VALIDATION: Check HTTP status code - must be 200 or 201
    const httpStatus = response.status_code;
    const isValidHttpStatus = httpStatus === 200 || httpStatus === 201;

    if (!isValidHttpStatus) {
      console.error("[SHIPMENT_REJECTED]", {
        order_id: orderId,
        order_number: order.order_number,
        http_status: httpStatus,
        reason: "HTTP status is not 200 or 201",
        raw_response: response.raw_response?.substring(0, 500),
        timestamp: new Date().toISOString(),
      });

      // Mark as FAILED with error details
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: `Shiprocket API returned HTTP ${httpStatus}`,
            shipment_status_code: httpStatus,
            shipment_error_message: response.error_message || `HTTP ${httpStatus}`,
            shipment_raw_response: response.raw_response,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);

      return {
        success: false,
        error: `Shiprocket API returned HTTP ${httpStatus}`,
      };
    }

    // CRITICAL VALIDATION: Check for shipment_id or awb_code - at least one must exist
    const hasShipmentId = response.shipment_id !== null && response.shipment_id !== undefined;
    const hasAwbCode = response.awb_code !== null && response.awb_code !== undefined && response.awb_code.trim() !== "";

    if (!hasShipmentId && !hasAwbCode) {
      console.error("[SHIPMENT_REJECTED]", {
        order_id: orderId,
        order_number: order.order_number,
        http_status: httpStatus,
        reason: "Missing shipment_id and awb_code",
        shipment_id: response.shipment_id,
        awb_code: response.awb_code,
        raw_response: response.raw_response?.substring(0, 500),
        timestamp: new Date().toISOString(),
      });

      // Mark as FAILED
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: "Shiprocket response missing shipment_id and awb_code",
            shipment_status_code: httpStatus,
            shipment_error_message: "Response missing required fields: shipment_id and awb_code",
            shipment_raw_response: response.raw_response,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);

      return {
        success: false,
        error: "Shiprocket response missing shipment_id and awb_code",
      };
    }

    // HARD GUARD: shipment_id is REQUIRED - throw error if missing
    if (!hasShipmentId) {
      const errorMsg = "Shiprocket response missing shipment_id - cannot mark as BOOKED";
      console.error("[SHIPMENT_REJECTED]", {
        order_id: orderId,
        order_number: order.order_number,
        http_status: httpStatus,
        reason: "Missing shipment_id (hard guard)",
        awb_code: response.awb_code,
        raw_response: response.raw_response?.substring(0, 500),
        timestamp: new Date().toISOString(),
      });

      // Mark as FAILED
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED",
          metadata: {
            ...existingMetadata,
            shipment_error: errorMsg,
            shipment_status_code: httpStatus,
            shipment_error_message: errorMsg,
            shipment_raw_response: response.raw_response,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);

      return {
        success: false,
        error: errorMsg,
      };
    }

    // All validations passed - log confirmation
    console.log("[SHIPMENT_CONFIRMED]", {
      order_id: orderId,
      order_number: order.order_number,
      http_status: httpStatus,
      shipment_id: response.shipment_id,
      awb_code: response.awb_code || null,
      courier_name: response.courier_name || null,
      timestamp: new Date().toISOString(),
    });

    // Store shipment details in database - only after all validations pass
    const existingMetadata = (order.metadata as Record<string, unknown>) || {};
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shiprocket_shipment_id: String(response.shipment_id),
        shipment_status: "BOOKED", // Success status - only set after validation
        courier_name: response.courier_name || null,
        shipping_status: "processing",
        internal_shipping_cost: internalShippingCost, // Store calculated shipping cost
        metadata: {
          ...existingMetadata,
          shipping: {
            ...(existingMetadata.shipping as Record<string, unknown> || {}),
            shipment_id: response.shipment_id,
            awb_code: response.awb_code || null,
            awb: response.awb_code || null, // Backward compatibility
            courier: response.courier_name || null,
            courier_company_id: response.courier_company_id || null,
            tracking_url: response.tracking_url || null,
            expected_delivery: response.expected_delivery_date || null,
            updated_at: new Date().toISOString(),
          },
          internal_shipping_cost: internalShippingCost,
        },
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", orderId);

    if (updateError) {
      console.error("[SHIPMENT_DB_UPDATE_FAILED]", {
        order_id: orderId,
        error: updateError.message,
      });
      // Shipment was created in Shiprocket but DB update failed
      return {
        success: true,
        shipment_id: String(response.shipment_id),
        awb_code: response.awb_code || undefined,
        courier_name: response.courier_name || undefined,
        internal_shipping_cost: internalShippingCost,
        error: "Shipment created but database update failed",
      };
    }

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "shipment_booked",
        target_resource: "orders",
        target_id: orderId,
        details: {
          shipment_id: response.shipment_id,
          courier_name: response.courier_name,
          awb_code: response.awb_code,
          order_number: order.order_number,
          internal_shipping_cost: internalShippingCost,
        },
      } as unknown as never);
    } catch (auditError) {
      // Non-fatal
      console.warn("[SHIPMENT_AUDIT_FAILED] (non-fatal)");
    }

    return {
      success: true,
      shipment_id: String(response.shipment_id),
      awb_code: response.awb_code || undefined,
      courier_name: response.courier_name || undefined,
      internal_shipping_cost: internalShippingCost,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log failure with detailed error info
    console.error("[SHIPMENT_FAILED]", {
      order_id: orderId,
      order_number: order.order_number,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Mark order as FAILED (allows retry) - save error details
    try {
      const existingMetadata = (order.metadata as Record<string, unknown>) || {};
      await supabase
        .from("orders")
        .update({
          shipment_status: "FAILED", // Failure status - allows retry
          metadata: {
            ...existingMetadata,
            shipment_error: errorMessage,
            shipment_error_message: errorMessage,
            shipment_failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", orderId);

      // Write audit log for failure
      await supabase.from("admin_audit_logs").insert({
        action: "shipment_failed",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: order.order_number,
          error: errorMessage,
          requires_attention: true,
        },
      } as unknown as never);
    } catch (updateError) {
      console.error("[SHIPMENT_FAILURE_UPDATE_FAILED]", {
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
