import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { safeCreateAWBIfMissing } from "@/lib/shipping/fulfillment";

export const dynamic = "force-dynamic";

/**
 * Retry Fulfillment Endpoint
 * Allows admin/system to retry failed fulfillment attempts
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication (or system token)
    const session = await getAdminSession();
    const systemToken = req.headers.get("x-system-token");

    if (!session && systemToken !== process.env.SYSTEM_API_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { order_id, batch_order_ids } = body;

    // Support single order or batch
    const orderIds: string[] = batch_order_ids || (order_id ? [order_id] : []);

    if (orderIds.length === 0) {
      return NextResponse.json(
        { error: "Missing order_id or batch_order_ids" },
        { status: 400 }
      );
    }

    // Limit batch size
    if (orderIds.length > 50) {
      return NextResponse.json(
        { error: "Batch size exceeds limit of 50" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const results: Array<{
      order_id: string;
      success: boolean;
      awb?: string;
      error?: string;
    }> = [];

    // Process each order
    for (const orderId of orderIds) {
      try {
        // Check retry rate limit (max 5 attempts per hour per order)
        const { data: recentAttempts } = await supabase
          .from("admin_audit_logs")
          .select("created_at")
          .eq("target_id", orderId)
          .eq("action", "fulfillment_retry")
          .gte("created_at", new Date(Date.now() - 3600000).toISOString())
          .limit(10);

        if (recentAttempts && recentAttempts.length >= 5) {
          results.push({
            order_id: orderId,
            success: false,
            error: "Rate limit exceeded - too many retry attempts",
          });
          continue;
        }

        // Attempt fulfillment
        const result = await safeCreateAWBIfMissing(orderId);

        if (result.success) {
          results.push({
            order_id: orderId,
            success: true,
            awb: result.awb,
          });

          // Write audit log
          try {
            await (supabase.from("admin_audit_logs") as any).insert({
              action: "fulfillment_retry",
              target_resource: "orders",
              target_id: orderId,
              performed_by: session?.user.id || null,
              details: {
                success: true,
                awb: result.awb,
                retry_attempt: (recentAttempts?.length || 0) + 1,
              },
            });
          } catch (auditError) {
            console.error("Audit log error:", auditError);
          }
        } else {
          results.push({
            order_id: orderId,
            success: false,
            error: result.error || "Fulfillment failed",
          });

          // Write audit log
          try {
            await (supabase.from("admin_audit_logs") as any).insert({
              action: "fulfillment_retry",
              target_resource: "orders",
              target_id: orderId,
              performed_by: session?.user.id || null,
              details: {
                success: false,
                error: result.error,
                retry_attempt: (recentAttempts?.length || 0) + 1,
              },
            });
          } catch (auditError) {
            console.error("Audit log error:", auditError);
          }
        }
      } catch (error: any) {
        results.push({
          order_id: orderId,
          success: false,
          error: error.message || "Unexpected error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error: any) {
    console.error("Unexpected error in fulfillment/retry:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}























