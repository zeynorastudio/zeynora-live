import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify session
    const authSupabase = await createServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user record
    const { data: userRecord } = await authSupabase
      .from("users")
      .select("id, email, full_name")
      .eq("auth_uid", user.id)
      .single();

    const typedUserRecord = userRecord as {
      id: string;
      email: string | null;
      full_name: string | null;
    } | null;

    if (!typedUserRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { order_id, order_number, subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    // Use service role client for writes
    const supabase = createServiceRoleClient();

    // Verify order belongs to user if order_id provided
    if (order_id) {
      const { data: order } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", order_id)
        .single();

      const typedOrder = order as { user_id: string | null } | null;
      if (!typedOrder || typedOrder.user_id !== typedUserRecord.id) {
        return NextResponse.json(
          { error: "Order not found or access denied" },
          { status: 403 }
        );
      }
    }

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("shipping_queries")
      .insert({
        order_id: order_id || null,
        order_number: order_number || null,
        customer_name: typedUserRecord.full_name || user.email?.split("@")[0] || "Customer",
        email: typedUserRecord.email || user.email || "",
        message: `${subject}: ${message}`,
        status: "open",
      } as unknown as never)
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error("Error creating support ticket:", ticketError);
      return NextResponse.json(
        { error: "Failed to create support ticket" },
        { status: 500 }
      );
    }

    const typedTicket = ticket as { id: string };

    // Write audit log if order_id exists
    if (order_id) {
      await supabase.from("admin_audit_logs").insert({
        action: "support_ticket_created",
        target_resource: "order",
        target_id: order_id,
        performed_by: user.id,
        details: {
          ticket_id: typedTicket.id,
          subject,
          order_number: order_number || null,
        },
      } as unknown as never);
    }

    return NextResponse.json({
      success: true,
      ticket_id: typedTicket.id,
    });
  } catch (error: any) {
    console.error("Unexpected error in support/create:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
