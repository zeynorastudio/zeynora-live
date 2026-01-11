/**
 * GET /api/admin/users/list
 * 
 * Lists all users (super_admin only).
 * 
 * DB Tables Used:
 * - users (id, auth_uid, email, full_name, role, is_active, created_at)
 * 
 * Security: Only super_admin can list users.
 * Server-side guard via requireSuperAdmin; RLS policies deny public access.
 * 
 * Query Params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * 
 * Example curl:
 * curl http://localhost:3000/api/admin/users/list?page=1&limit=50 \
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

    // Fetch users with pagination
    const { data: users, error } = await supabase
      .from("users")
      .select("id, auth_uid, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Type assertion for users
    const typedUsers = (users || []) as Array<{
      id: string;
      auth_uid: string | null;
      email: string;
      full_name: string | null;
      role: string | null;
      is_active: boolean;
      created_at: string;
    }>;

    // Map to response format
    const mappedUsers = typedUsers.map((u) => ({
      id: u.auth_uid || u.id,
      email: u.email,
      name: u.full_name,
      role: u.role,
      is_frozen: !u.is_active,
      created_at: u.created_at,
    }));

    return NextResponse.json({
      success: true,
      users: mappedUsers,
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
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}
