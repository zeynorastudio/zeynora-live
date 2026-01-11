/**
 * GET /api/admin/audit/list
 * 
 * Lists admin audit logs (super_admin only).
 * 
 * DB Tables Used:
 * - admin_audit_logs (all fields)
 * - users (for joining actor/target email via auth_uid)
 * 
 * Security: Only super_admin can view audit logs.
 * Server-side guard via requireSuperAdmin; RLS policies deny public access.
 * 
 * Query Params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - action: filter by action type (optional)
 * 
 * Example curl:
 * curl http://localhost:3000/api/admin/audit/list?page=1&limit=50 \
 *   -H "Cookie: sb-xxx-access-token=..."
 */

import { createServerClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/admin/roles";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require super_admin
    await requireSuperAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;
    const actionFilter = searchParams.get("action");

    // Build query
    let query = supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    // Type assertion for logs
    const typedLogs = (logs || []) as Array<{
      id: string;
      actor_user_id: string;
      target_user_id: string | null;
      action: string;
      detail: any;
      created_at: string;
    }>;

    // Get actor and target emails by joining with users table
    // Note: We need to fetch user emails separately since we can't easily join auth.users
    const actorIds = [...new Set(typedLogs.map((log) => log.actor_user_id))];
    const targetIds = [
      ...new Set(typedLogs.map((log) => log.target_user_id).filter(Boolean) as string[]),
    ];

    const actorEmails: Record<string, string> = {};
    const targetEmails: Record<string, string> = {};

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("users")
        .select("auth_uid, email")
        .in("auth_uid", actorIds);

      const typedActors = (actors || []) as Array<{
        auth_uid: string;
        email: string;
      }>;

      typedActors.forEach((a) => {
        if (a.auth_uid) actorEmails[a.auth_uid] = a.email;
      });
    }

    if (targetIds.length > 0) {
      const { data: targets } = await supabase
        .from("users")
        .select("auth_uid, email")
        .in("auth_uid", targetIds);

      const typedTargets = (targets || []) as Array<{
        auth_uid: string;
        email: string;
      }>;

      typedTargets.forEach((t) => {
        if (t.auth_uid) targetEmails[t.auth_uid] = t.email;
      });
    }

    // Map logs with email lookups
    const mappedLogs = typedLogs.map((log) => ({
      id: log.id,
      actor_user_id: log.actor_user_id,
      target_user_id: log.target_user_id,
      action: log.action,
      detail: log.detail,
      created_at: log.created_at,
      actor_email: actorEmails[log.actor_user_id] || null,
      target_email: log.target_user_id ? targetEmails[log.target_user_id] || null : null,
    }));

    // Get total count
    let countQuery = supabase
      .from("admin_audit_logs")
      .select("*", { count: "exact", head: true });

    if (actionFilter) {
      countQuery = countQuery.eq("action", actionFilter);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      logs: mappedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    if (error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing audit logs:", error);
    return NextResponse.json(
      { error: "Failed to list audit logs" },
      { status: 500 }
    );
  }
}
