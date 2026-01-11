/**
 * POST /api/admin/invite
 * 
 * Creates an admin invitation (super_admin only).
 * 
 * DB Tables Used:
 * - admin_invites (email, role, token, invited_by, accepted)
 * - admin_audit_logs (for audit trail)
 * 
 * Security: Only super_admin can create invites.
 * 
 * Example curl:
 * curl -X POST http://localhost:3000/api/admin/invite \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: sb-xxx-access-token=..." \
 *   -d '{"email":"admin@example.com","role":"admin","message":"Welcome!"}'
 */

import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/admin/roles";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require super_admin
    await requireSuperAdmin(user.id);

    const body = await request.json() as {
      email: string;
      role: "admin" | "staff";
      message?: string;
    };

    // Validation
    if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    if (!body.role || !["admin", "staff"].includes(body.role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'staff'" },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = randomUUID();

    // Insert invite
    const serviceSupabase = createServiceRoleClient();
    const { data: invite, error: inviteError } = await serviceSupabase
      .from("admin_invites")
      .insert({
        email: body.email.trim().toLowerCase(),
        role: body.role,
        token: token,
        invited_by: user.id,
        accepted: false,
      } as unknown as never)
      .select("id")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    const typedInvite = invite as { id: string };

    // Insert audit log
    const { error: auditError } = await serviceSupabase
      .from("admin_audit_logs")
      .insert({
        actor_user_id: user.id,
        target_user_id: null,
        action: "invite",
        detail: {
          invite_id: typedInvite.id,
          email: body.email,
          role: body.role,
          token: token, // Include token in audit log for tracking
          message: body.message || null,
        },
      } as unknown as never);

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      invite_id: typedInvite.id,
      token: token, // Return token (email sending will be Phase 3)
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating invite:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
