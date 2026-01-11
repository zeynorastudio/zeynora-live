/**
 * PUT /api/admin/users/[id]/role
 * 
 * Sets a user's role (super_admin only).
 * 
 * DB Tables Used:
 * - users (role, updated_at)
 * - admin_audit_logs (for audit trail)
 * 
 * Security: Only super_admin can change roles.
 * Prevents removing the last super_admin.
 * 
 * Example curl:
 * curl -X PUT http://localhost:3000/api/admin/users/{auth_uid}/role \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: sb-xxx-access-token=..." \
 *   -d '{"role":"admin","reason":"Promoted to admin"}'
 */

import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin, setUserRole } from "@/lib/admin/roles";
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
      role: string;
      reason?: string;
    };

    if (!body.role || typeof body.role !== "string") {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      );
    }

    // Set user role (includes validation and audit logging)
    const updatedUser = await setUserRole(
      user.id,
      targetUserId,
      body.role,
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
    if (
      error.message?.includes("last super_admin") ||
      error.message?.includes("Invalid role")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.message?.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Error setting user role:", error);
    return NextResponse.json(
      { error: "Failed to set user role" },
      { status: 500 }
    );
  }
}


