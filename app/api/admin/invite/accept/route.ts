/**
 * POST /api/admin/invite/accept
 * 
 * Accepts an admin invitation (placeholder for Phase 3 email flow).
 * 
 * DB Tables Used:
 * - admin_invites (token, accepted)
 * - admin_audit_logs (for audit trail)
 * 
 * Security: Public endpoint (invite token provides authorization).
 * 
 * NOTE: This is a placeholder. Actual account creation will be handled
 * via email link in Phase 3. This route records acceptance only.
 * 
 * Example curl:
 * curl -X POST http://localhost:3000/api/admin/invite/accept \
 *   -H "Content-Type: application/json" \
 *   -d '{"token":"uuid-token","password":"secure123","name":"Admin User"}'
 */

import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json() as {
      token: string;
      password: string;
      name: string;
    };

    // Validation
    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    if (!body.password || typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Lookup invite by token
    const { data: invite, error: inviteError } = await supabase
      .from("admin_invites")
      .select("id, email, role, accepted, invited_by")
      .eq("token", body.token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite token" },
        { status: 404 }
      );
    }

    const typedInvite = invite as {
      id: string;
      email: string;
      role: string;
      accepted: boolean;
      invited_by: string;
    };

    if (typedInvite.accepted) {
      return NextResponse.json(
        { error: "Invite has already been accepted" },
        { status: 400 }
      );
    }

    // Mark invite as accepted
    const serviceSupabase = createServiceRoleClient();
    const { error: updateError } = await serviceSupabase
      .from("admin_invites")
      .update({
        accepted: true,
        accepted_at: new Date().toISOString(),
      } as unknown as never)
      .eq("id", typedInvite.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to accept invite" },
        { status: 500 }
      );
    }

    // Insert audit log
    const { error: auditError } = await serviceSupabase
      .from("admin_audit_logs")
      .insert({
        actor_user_id: typedInvite.invited_by,
        target_user_id: null,
        action: "invite_accept",
        detail: {
          invite_id: typedInvite.id,
          email: typedInvite.email,
          role: typedInvite.role,
        },
      } as unknown as never);

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    // NOTE: Actual account creation via Supabase Auth will be handled in Phase 3
    // with email verification flow. This endpoint only records acceptance.

    return NextResponse.json({
      success: true,
      message: "Invite accepted. Account creation will be completed via email link.",
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
