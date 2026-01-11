/**
 * Phase 4.3 — Admin Confirm Received API
 * POST /api/admin/returns/confirm-received
 * 
 * Admin confirms item received at store and issues store credit
 * Only admin/super_admin can confirm receipt and issue credit
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { createAudit } from "@/lib/audit/log";
import { addCredits } from "@/lib/wallet";
import type { ConfirmReceivedInput } from "@/types/returns";

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

    const body = await req.json() as ConfirmReceivedInput;
    const { return_request_id, admin_notes } = body;

    if (!return_request_id || typeof return_request_id !== "string") {
      return NextResponse.json(
        { success: false, error: "Return request ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch return request with items and order
    const { data: returnRequest, error: fetchError } = await supabase
      .from("return_requests")
      .select(`
        id,
        status,
        order_id,
        customer_id,
        return_items!inner(
          id,
          order_item_id,
          quantity,
          order_items!inner(
            id,
            price,
            subtotal
          )
        ),
        orders!inner(
          id,
          customer_id,
          shipping_fee
        )
      `)
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
      customer_id: string | null;
      return_items: Array<{
        id: string;
        order_item_id: string;
        quantity: number;
        order_items: {
          id: string;
          price: number;
          subtotal: number;
        };
      }>;
      orders: {
        id: string;
        customer_id: string | null;
        shipping_fee: number | null;
      };
    };

    // Check status
    if (!["in_transit", "received"].includes(typedReturnRequest.status)) {
      return NextResponse.json(
        { success: false, error: `Return request must be in_transit or received status. Current: ${typedReturnRequest.status}` },
        { status: 400 }
      );
    }

    // Check if customer exists (for credit issuance)
    const customerId = typedReturnRequest.customer_id || typedReturnRequest.orders.customer_id;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Cannot issue credit: Customer ID not found. Guest returns require customer account." },
        { status: 400 }
      );
    }

    // Calculate credit amount (item value, shipping logic if applicable)
    let creditAmount = 0;
    for (const returnItem of typedReturnRequest.return_items) {
      const itemPrice = Number(returnItem.order_items.price) || 0;
      creditAmount += itemPrice * returnItem.quantity;
    }

    // Note: Shipping fee logic - if applicable, subtract shipping fee
    // For now, we'll issue full item value as per requirements
    // Can be adjusted based on business logic

    if (creditAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid credit amount calculated" },
        { status: 400 }
      );
    }

    // Update return request status to received (if not already)
    if (typedReturnRequest.status !== "received") {
      const { error: updateStatusError } = await supabase
        .from("return_requests")
        .update({
          status: "received",
          received_at: new Date().toISOString(),
          admin_notes: admin_notes || null,
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", return_request_id);

      if (updateStatusError) {
        console.error("[RETURNS] Failed to update return status:", updateStatusError);
        return NextResponse.json(
          { success: false, error: "Failed to update return status" },
          { status: 500 }
        );
      }
    }

    // Issue store credit
    try {
      // Get customer's auth_uid for credit issuance
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, auth_uid")
        .eq("id", customerId)
        .single();

      if (customerError || !customer) {
        return NextResponse.json(
          { success: false, error: "Customer not found" },
          { status: 404 }
        );
      }

      const typedCustomer = customer as {
        id: string;
        auth_uid: string | null;
      };

      if (!typedCustomer.auth_uid) {
        return NextResponse.json(
          { success: false, error: "Customer account not linked. Cannot issue credit to guest." },
          { status: 400 }
        );
      }

      // Issue credit (1 year validity is handled by store credit system)
      const creditResult = await addCredits(
        typedCustomer.auth_uid,
        creditAmount,
        typedReturnRequest.order_id, // reference (order_id)
        `Return credit for order ${typedReturnRequest.order_id}`,
        session.user.id, // performedBy
        return_request_id // return_request_id
      );

      // Update return request status to credited
      const { error: updateCreditedError } = await supabase
        .from("return_requests")
        .update({
          status: "credited",
          updated_at: new Date().toISOString(),
        } as unknown as never)
        .eq("id", return_request_id);

      if (updateCreditedError) {
        console.error("[RETURNS] Failed to update return to credited:", updateCreditedError);
        // Credit already issued, so we'll log but not fail
      }

      // Audit log
      await createAudit(session.user.id, "return_received_credited", {
        return_request_id: return_request_id,
        order_id: typedReturnRequest.order_id,
        customer_id: customerId,
        credit_amount: creditAmount,
        admin_notes: admin_notes,
      });

      return NextResponse.json({
        success: true,
        message: "Item received and store credit issued",
        credit_amount: creditAmount,
        new_balance: creditResult.new_balance,
      });
    } catch (creditError: any) {
      console.error("[RETURNS] Credit issuance error:", creditError);
      return NextResponse.json(
        { success: false, error: `Failed to issue credit: ${creditError.message}` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("[RETURNS] Confirm received error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

