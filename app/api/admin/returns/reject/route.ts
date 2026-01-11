/**
 * Phase 4.3 — Admin Reject Return API
 * POST /api/admin/returns/reject
 * 
 * Admin rejects a return request
 * Only admin/super_admin can reject
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createAudit } from "@/lib/audit/log";
import type { RejectReturnInput } from "@/types/returns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await req.json() as RejectReturnInput;
    const { return_request_id, admin_notes } = body;

    if (!return_request_id || typeof return_request_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Return request ID is required" },
        { status: 400 }
      );
    }

    if (!admin_notes || typeof admin_notes !== "string" || admin_notes.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Admin notes are required for rejection" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch return request
    const { data: returnRequest, error: fetchError } = await supabase
      .from("return_requests")
      .select("id, status, order_id")
      .eq("id", return_request_id)
      .single();

    if (fetchError || !returnRequest) {
      return NextResponse.json(
        { success: false, error: "Return request not found" },
        { status: 404 }
      );
    }

    const typedReturnRequest = returnRequest as {
      id: string;
      status: string;
      order_id: string;
    };

    // Check status (can reject from requested or approved)
    if (!["requested", "approved"].includes(typedReturnRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Return request cannot be rejected from ${typedReturnRequest.status} status` },
        { status: 400 }
      );
    }

    // Update return request status
    const { error: updateError } = await supabase
      .from("return_requests")
      .update({
        status: "rejected",
        admin_notes: admin_notes.trim(),
        updated_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", return_request_id);

    if (updateError) {
      console.error("[RETURNS] Failed to reject return:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to reject return request" },
        { status: 500 }
      );
    }

    // Audit log
    await createAudit(session.user.id, "return_rejected", {
      return_request_id: return_request_id,
      order_id: typedReturnRequest.order_id,
      admin_notes: admin_notes,
    });

    return NextResponse.json({
      success: true,
      message: "Return request rejected",
    });
  } catch (error: unknown) {
    console.error("[RETURNS] Reject error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

