/**
 * Admin Order Detail API
 * 
 * GET /api/admin/orders/:id
 * 
 * Returns order details by UUID (primary key)
 * Used by fulfillment page and other admin components
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Normalize payment status from multiple sources (READ-ONLY)
 * 
 * CASE 1: orders.payment_status exists → use it directly
 * CASE 2: payment_status is NULL but payment_logs exists → derive from latest payment
 * CASE 3: payment data in metadata/json → parse and normalize
 * CASE 4: No payment data → return "UNKNOWN"
 */
async function normalizePaymentStatus(
  orderData: any,
  orderId: string,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<string> {
  // CASE 1: payment_status column EXISTS and is not null
  if (orderData.payment_status !== null && orderData.payment_status !== undefined) {
    const status = String(orderData.payment_status).toLowerCase();
    // Normalize to standard values
    if (['pending', 'paid', 'failed', 'refunded'].includes(status)) {
      return status;
    }
    // If it's a valid string but not standard, return as-is (for future extensibility)
    return status;
  }

  // CASE 2: payment_status is NULL but payment_logs table exists
  try {
    const { data: paymentLogs, error: logsError } = await supabase
      .from("payment_logs")
      .select("status, provider_response, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!logsError && paymentLogs && paymentLogs.length > 0) {
      const latestPayment = paymentLogs[0];
      const providerStatus = latestPayment.status?.toLowerCase();
      const providerResponse = latestPayment.provider_response as Record<string, any> | null;

      // Map provider status to normalized status
      if (providerStatus === 'captured' || providerStatus === 'paid' || providerStatus === 'success') {
        return 'paid';
      }
      if (providerStatus === 'failed' || providerStatus === 'failure') {
        return 'failed';
      }
      if (providerStatus === 'created' || providerStatus === 'authorized') {
        return 'pending';
      }
      if (providerStatus === 'refunded' || providerStatus === 'refund') {
        return 'refunded';
      }

      // Check provider_response for Razorpay status
      if (providerResponse) {
        const razorpayStatus = providerResponse.status?.toLowerCase();
        if (razorpayStatus === 'captured') return 'paid';
        if (razorpayStatus === 'failed') return 'failed';
        if (razorpayStatus === 'authorized' || razorpayStatus === 'created') return 'pending';
        if (razorpayStatus === 'refunded') return 'refunded';
      }
    }
  } catch (e) {
    // payment_logs table might not exist or query failed, continue to next case
    console.warn("[NORMALIZE_PAYMENT] payment_logs query failed (non-blocking):", e);
  }

  // CASE 3: Check metadata or payment_provider_response JSONB fields
  const metadata = orderData.metadata as Record<string, any> | null;
  const paymentProviderResponse = orderData.payment_provider_response as Record<string, any> | null;

  // Check metadata.payment_status
  if (metadata?.payment_status) {
    const status = String(metadata.payment_status).toLowerCase();
    if (['pending', 'paid', 'failed', 'refunded'].includes(status)) {
      return status;
    }
  }

  // Check payment_provider_response for status
  if (paymentProviderResponse) {
    // Razorpay status mapping
    const razorpayStatus = paymentProviderResponse.status?.toLowerCase();
    if (razorpayStatus === 'captured') return 'paid';
    if (razorpayStatus === 'failed') return 'failed';
    if (razorpayStatus === 'authorized' || razorpayStatus === 'created') return 'pending';
    if (razorpayStatus === 'refunded') return 'refunded';

    // Check for payment_status in response
    if (paymentProviderResponse.payment_status) {
      const status = String(paymentProviderResponse.payment_status).toLowerCase();
      if (['pending', 'paid', 'failed', 'refunded'].includes(status)) {
        return status;
      }
    }
  }

  // Check paid_at timestamp as indicator
  if (orderData.paid_at) {
    // If paid_at exists, payment was likely successful
    return 'paid';
  }

  // CASE 4: No payment data exists anywhere
  console.warn("[NORMALIZE_PAYMENT] No payment status found, returning UNKNOWN:", {
    order_id: orderId,
    order_number: orderData.order_number,
    payment_status_in_order: orderData.payment_status,
    has_paid_at: !!orderData.paid_at,
    has_metadata: !!metadata,
    has_provider_response: !!paymentProviderResponse,
  });

  return 'UNKNOWN';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin session
    const session = await getAdminSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    // Log the id being used for lookup
    console.log("[ADMIN_ORDERS] Fetching order by id:", orderId);

    // Validate that id looks like a UUID (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      console.error("[ADMIN_ORDERS] Invalid UUID format:", orderId);
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid order identifier format. Expected UUID.",
          id_used: orderId
        },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // STEP 1: Fetch order by primary key (UUID id field) - WITHOUT audit logs join
    // Explicitly include payment_status in the select to ensure it's always returned
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        payment_status,
        shipping_status,
        order_status,
        customer_id,
        user_id,
        guest_phone,
        guest_email,
        currency,
        subtotal,
        shipping_fee,
        internal_shipping_cost,
        assumed_weight,
        tax_amount,
        discount_amount,
        total_amount,
        coupon_code,
        shiprocket_shipment_id,
        payment_provider,
        payment_provider_response,
        razorpay_order_id,
        payment_method,
        paid_at,
        metadata,
        created_at,
        updated_at,
        billing_address_id,
        shipping_address_id,
        items:order_items(*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      console.error("[ADMIN_ORDERS] Order not found:", {
        id: orderId,
        error: orderError?.message,
        code: orderError?.code
      });
      return NextResponse.json(
        { 
          success: false, 
          error: "Order not found",
          id_used: orderId
        },
        { status: 404 }
      );
    }

    // STEP 2: Fetch customer data if customer_id exists
    let customer: { name: string; email: string; phone?: string } | null = null;
    if (orderData.customer_id) {
      const { data: customerData } = await supabase
        .from("customers")
        .select("first_name, last_name, email, phone")
        .eq("id", orderData.customer_id)
        .single();
      
      if (customerData) {
        customer = {
          name: `${customerData.first_name} ${customerData.last_name}`.trim(),
          email: customerData.email || "",
          phone: customerData.phone || undefined,
        };
      }
    }

    // STEP 3: Fetch audit logs SEPARATELY (optional, must not break if fails)
    let auditLogs: Array<{
      action: string;
      created_at: string;
      details: any;
      performed_by: string | null;
    }> = [];

    try {
      // Query audit logs by target_id and target_resource
      // Using target_id as string match since it might be stored as text
      const { data: auditLogsData, error: auditLogsError } = await supabase
        .from("admin_audit_logs")
        .select("action, created_at, details, performed_by")
        .eq("target_id", orderId)
        .eq("target_resource", "orders")
        .order("created_at", { ascending: false });

      if (!auditLogsError && auditLogsData) {
        auditLogs = auditLogsData;
      } else if (auditLogsError) {
        // Log warning but don't fail the request
        console.warn("[ADMIN_ORDERS] Failed to fetch audit logs (non-blocking):", {
          order_id: orderId,
          error: auditLogsError?.message,
          code: auditLogsError?.code
        });
      }
    } catch (auditLogsException) {
      // Catch any unexpected errors in audit log fetching
      console.warn("[ADMIN_ORDERS] Exception fetching audit logs (non-blocking):", {
        order_id: orderId,
        error: auditLogsException instanceof Error ? auditLogsException.message : String(auditLogsException)
      });
    }

    // STEP 4: Normalize payment status (READ-LAYER ONLY, no DB writes)
    const normalizedPaymentStatus = await normalizePaymentStatus(
      orderData,
      orderId,
      supabase
    );

    const order = {
      ...orderData,
      customer,
      audit_logs: auditLogs, // Attach audit logs to order object for compatibility
      // Use normalized payment_status (always present, never null/undefined)
      payment_status: normalizedPaymentStatus,
    };

    // Debug log
    console.log("[ADMIN_ORDER] Normalized payment_status:", normalizedPaymentStatus);

    return NextResponse.json({
      success: true,
      order,
      audit_logs: auditLogs, // Also return separately for clarity
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ADMIN_ORDERS] Unexpected error:", {
      route: "/api/admin/orders/[id]",
      error: errorMessage,
    });
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

