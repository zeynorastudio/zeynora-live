/**
 * Phase 4.3 — Admin Returns List API
 * GET /api/admin/returns/list
 * 
 * Lists return requests with optional status filter
 * Only admin/super_admin can access
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import type { ReturnRequest } from "@/types/returns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase
      .from("return_requests")
      .select(`
        *,
        orders!inner(
          id,
          order_number,
          customer_id,
          guest_phone
        ),
        return_items(
          *,
          order_items(
            *
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: returns, error } = await query;

    if (error) {
      console.error("[RETURNS] List error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch returns" },
        { status: 500 }
      );
    }

    // Transform data
    const typedReturns = (returns || []).map((r: any) => ({
      ...r,
      order: r.orders ? {
        id: r.orders.id,
        order_number: r.orders.order_number,
        customer_id: r.orders.customer_id,
        guest_phone: r.orders.guest_phone,
      } : null,
      items: r.return_items || [],
    })) as ReturnRequest[];

    return NextResponse.json({
      success: true,
      returns: typedReturns,
    });
  } catch (error: unknown) {
    console.error("[RETURNS] List error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}









