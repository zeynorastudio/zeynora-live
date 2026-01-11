/**
 * Database Inspection Endpoint - READ ONLY
 * 
 * GET /api/admin/orders/:id/inspect
 * 
 * Inspects where payment status actually lives in the database
 * WITHOUT modifying any data
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid UUID format",
          id_used: orderId
        },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // STEP 1: Query orders table directly to get all columns
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    // STEP 2: Check payment_logs table (if exists)
    let paymentLogsData: any[] = [];
    try {
      const { data: logs, error: logsError } = await supabase
        .from("payment_logs")
        .select("*")
        .eq("order_id", orderId);
      
      if (!logsError && logs) {
        paymentLogsData = logs;
      }
    } catch (e) {
      // Table might not exist, ignore
    }

    // STEP 3: Inspect metadata and payment_provider_response JSONB fields
    const metadata = orderData?.metadata as Record<string, any> | null;
    const paymentProviderResponse = orderData?.payment_provider_response as Record<string, any> | null;

    // Build inspection report
    const inspection = {
      order_id: orderId,
      order_found: !!orderData,
      order_number: orderData?.order_number || null,
      
      // STEP 1: Orders table columns related to payment
      orders_table_payment_fields: {
        payment_status: {
          exists: 'payment_status' in (orderData || {}),
          value: orderData?.payment_status || null,
          type: typeof orderData?.payment_status,
          is_null: orderData?.payment_status === null,
          is_undefined: orderData?.payment_status === undefined,
        },
        payment_provider: {
          exists: 'payment_provider' in (orderData || {}),
          value: orderData?.payment_provider || null,
        },
        payment_provider_response: {
          exists: 'payment_provider_response' in (orderData || {}),
          value: paymentProviderResponse,
          is_null: paymentProviderResponse === null,
          has_razorpay_status: paymentProviderResponse?.status ? true : false,
          razorpay_status: paymentProviderResponse?.status || null,
        },
        paid_at: {
          exists: 'paid_at' in (orderData || {}),
          value: orderData?.paid_at || null,
        },
        razorpay_order_id: {
          exists: 'razorpay_order_id' in (orderData || {}),
          value: orderData?.razorpay_order_id || null,
        },
        payment_method: {
          exists: 'payment_method' in (orderData || {}),
          value: orderData?.payment_method || null,
        },
        order_status: {
          exists: 'order_status' in (orderData || {}),
          value: orderData?.order_status || null,
        },
      },

      // STEP 2: Payment logs table
      payment_logs_table: {
        exists: paymentLogsData.length > 0,
        count: paymentLogsData.length,
        records: paymentLogsData.map(log => ({
          id: log.id,
          status: log.status,
          provider: log.provider,
          created_at: log.created_at,
        })),
      },

      // STEP 3: Metadata JSONB inspection
      metadata_field: {
        exists: metadata !== null && metadata !== undefined,
        is_null: metadata === null,
        keys: metadata ? Object.keys(metadata) : [],
        payment_related_keys: metadata ? Object.keys(metadata).filter(k => 
          k.toLowerCase().includes('payment') || 
          k.toLowerCase().includes('razorpay') ||
          k.toLowerCase().includes('status')
        ) : [],
        payment_status_in_metadata: metadata?.payment_status || null,
        razorpay_status_in_metadata: metadata?.razorpay?.status || null,
      },

      // STEP 4: Full raw order row (for debugging)
      raw_order_row: orderData ? {
        id: orderData.id,
        order_number: orderData.order_number,
        payment_status: orderData.payment_status,
        order_status: orderData.order_status,
        payment_provider: orderData.payment_provider,
        paid_at: orderData.paid_at,
        // Include all fields but truncate large JSONB fields
        metadata_keys: metadata ? Object.keys(metadata) : null,
        payment_provider_response_keys: paymentProviderResponse ? Object.keys(paymentProviderResponse) : null,
      } : null,

      // Error information
      errors: {
        order_query_error: orderError?.message || null,
        order_query_code: orderError?.code || null,
      },
    };

    // Server-side logging (for debugging)
    console.log("=".repeat(80));
    console.log("DATABASE INSPECTION REPORT - ORDER:", orderId);
    console.log("=".repeat(80));
    console.log("ORDER FOUND:", inspection.order_found);
    console.log("ORDER NUMBER:", inspection.order_number);
    console.log("\n--- PAYMENT STATUS IN ORDERS TABLE ---");
    console.log("payment_status field exists:", inspection.orders_table_payment_fields.payment_status.exists);
    console.log("payment_status value:", inspection.orders_table_payment_fields.payment_status.value);
    console.log("payment_status is null:", inspection.orders_table_payment_fields.payment_status.is_null);
    console.log("payment_status is undefined:", inspection.orders_table_payment_fields.payment_status.is_undefined);
    console.log("\n--- OTHER PAYMENT FIELDS ---");
    console.log("paid_at:", inspection.orders_table_payment_fields.paid_at.value);
    console.log("payment_provider:", inspection.orders_table_payment_fields.payment_provider.value);
    console.log("razorpay_order_id:", inspection.orders_table_payment_fields.razorpay_order_id.value);
    console.log("order_status:", inspection.orders_table_payment_fields.order_status.value);
    console.log("\n--- PAYMENT PROVIDER RESPONSE (JSONB) ---");
    console.log("Has payment_provider_response:", inspection.orders_table_payment_fields.payment_provider_response.exists);
    console.log("Razorpay status in response:", inspection.orders_table_payment_fields.payment_provider_response.razorpay_status);
    console.log("\n--- METADATA (JSONB) ---");
    console.log("Metadata keys:", inspection.metadata_field.keys);
    console.log("Payment-related keys in metadata:", inspection.metadata_field.payment_related_keys);
    console.log("payment_status in metadata:", inspection.metadata_field.payment_status_in_metadata);
    console.log("\n--- PAYMENT LOGS TABLE ---");
    console.log("Payment logs found:", inspection.payment_logs_table.count);
    console.log("Payment logs:", JSON.stringify(inspection.payment_logs_table.records, null, 2));
    console.log("=".repeat(80));

    return NextResponse.json({
      success: true,
      inspection,
      summary: {
        payment_status_source: inspection.orders_table_payment_fields.payment_status.exists && 
                                inspection.orders_table_payment_fields.payment_status.value !== null
          ? "orders.payment_status column"
          : inspection.metadata_field.payment_status_in_metadata
          ? "orders.metadata.payment_status"
          : inspection.payment_logs_table.exists
          ? "payment_logs.status"
          : "NOT FOUND",
        payment_status_value: inspection.orders_table_payment_fields.payment_status.value || 
                             inspection.metadata_field.payment_status_in_metadata ||
                             inspection.payment_logs_table.records[0]?.status ||
                             null,
        order_found: inspection.order_found,
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[INSPECTION] Error:", errorMessage);
    return NextResponse.json(
      { 
        success: false, 
        error: "Inspection failed",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

