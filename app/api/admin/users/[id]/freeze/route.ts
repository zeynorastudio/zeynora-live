/**
 * PUT /api/admin/users/[id]/freeze
 * 
 * Freezes a user account (super_admin only).
 * 
 * DB Tables Used:
 * - users (is_active, updated_at)
 * - admin_audit_logs (for audit trail)
 * 
 * Security: Only super_admin can freeze users.
 * Prevents super_admin from freezing themselves.
 * 
 * Example curl:
 * curl -X PUT http://localhost:3000/api/admin/users/{auth_uid}/freeze \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: sb-xxx-access-token=..." \
 *   -d '{"reason":"Violation of terms"}'
 */

import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, freezeUser } from "@/lib/admin/roles";
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

    // Freeze user (includes validation and audit logging)
    const updatedUser = await freezeUser(
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
    if (error.message?.includes("Cannot freeze your own account")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error freezing user:", error);
    return NextResponse.json(
      { error: "Failed to freeze user" },
      { status: 500 }
    );
  }
}


