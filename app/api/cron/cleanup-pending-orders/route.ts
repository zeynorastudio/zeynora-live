import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createAudit } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

// Secret key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cleanup endpoint for pending orders older than 24 hours
 * Can be triggered by Vercel Cron, external scheduler, or manual invocation
 * 
 * Authentication: Requires CRON_SECRET in Authorization header or query param
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;

    if (CRON_SECRET && providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Calculate 24 hours ago
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    const cutoffIso = cutoffDate.toISOString();

    // Find pending orders older than 24 hours
    const { data: pendingOrders, error: fetchError } = await supabase
      .from("orders")
      .select("id, order_number, created_at, user_id")
      .eq("payment_status", "pending")
      .lt("created_at", cutoffIso)
      .limit(100); // Process in batches to avoid timeout

    if (fetchError) {
      console.error("[CLEANUP] Failed to fetch pending orders:", {
        error: fetchError.message,
      });
      return NextResponse.json(
        { error: "Failed to fetch pending orders", details: fetchError.message },
        { status: 500 }
      );
    }

    const typedOrders = (pendingOrders || []) as Array<{
      id: string;
      order_number: string;
      created_at: string;
      user_id: string | null;
    }>;

    if (typedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending orders to clean up",
        processed: 0,
      });
    }

    // Update orders to 'abandoned' status
    const orderIds = typedOrders.map((o) => o.id);
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "abandoned",
        updated_at: new Date().toISOString(),
        metadata: {
          abandoned_at: new Date().toISOString(),
          abandoned_reason: "Payment not completed within 24 hours",
        },
      } as unknown as never)
      .in("id", orderIds);

    if (updateError) {
      console.error("[CLEANUP] Failed to update orders:", {
        error: updateError.message,
        order_count: orderIds.length,
      });
      return NextResponse.json(
        { error: "Failed to update orders", details: updateError.message },
        { status: 500 }
      );
    }

    // Log the cleanup action
    await createAudit(null, "cleanup_pending_orders", {
      order_count: typedOrders.length,
      order_numbers: typedOrders.map((o) => o.order_number),
      cutoff_date: cutoffIso,
    });

    console.info("[CLEANUP] Cleaned up pending orders:", {
      count: typedOrders.length,
      cutoff_date: cutoffIso,
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${typedOrders.length} pending orders`,
      processed: typedOrders.length,
      order_numbers: typedOrders.map((o) => o.order_number),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CLEANUP] Unexpected error:", {
      route: "/api/cron/cleanup-pending-orders",
      error: errorMessage,
    });
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}

// Also support POST for webhook-style invocations
export async function POST(req: NextRequest) {
  return GET(req);
}
