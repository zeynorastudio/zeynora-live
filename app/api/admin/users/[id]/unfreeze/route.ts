/**
 * PUT /api/admin/users/[id]/unfreeze
 * 
 * Unfreezes a user account (super_admin only).
 * 
 * DB Tables Used:
 * - users (is_active, updated_at)
 * - admin_audit_logs (for audit trail)
 * 
 * Security: Only super_admin can unfreeze users.
 * 
 * Example curl:
 * curl -X PUT http://localhost:3000/api/admin/users/{auth_uid}/unfreeze \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: sb-xxx-access-token=..." \
 *   -d '{"reason":"Issue resolved"}'
 */

import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, unfreezeUser } from "@/lib/admin/roles";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require super_admin
    await requireSuperAdmin(user.id);

    // Validate UUID format
    const targetUserId = resolvedParams.id;
    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await request.json() as {
      reason?: string;
    };

    // Unfreeze user (includes validation and audit logging)
    const updatedUser = await unfreezeUser(
      user.id,
      targetUserId,
      body.reason
    );

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error unfreezing user:", error);
    return NextResponse.json(
      { error: "Failed to unfreeze user" },
      { status: 500 }
    );
  }
}


