/**
 * GET /api/orders/track/view?token=...
 * Phase 4.1: Get order tracking details using token
 * 
 * Returns: { success: boolean, order?: OrderTrackingData, error?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateTrackingToken, canTrackOrder } from "@/lib/orders/tracking-token";
import {
  getShippingStatusLabel,
  getShippingStatusBadgeVariant,
  formatTimelineEvents,
  type TimelineEvent,
} from "@/lib/shipping/timeline";

export const dynamic = "force-dynamic";

interface OrderTrackingData {
  order_id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  shipping_status: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    product_image: string | null;
  }>;
  shipping: {
    courier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    status: string;
    timeline: Array<{
      label: string;
      status: string;
      timestamp: string;
      completed: boolean;
      icon: string;
      courier?: string | null;
      awb?: string | null;
      notes?: string | null;
    }>;
  };
  address_masked: {
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Check feature flag
    const featureEnabled = process.env.ORDER_TRACKING_ENABLED !== "false";
    if (!featureEnabled) {
      return NextResponse.json(
        { success: false, error: "Order tracking is currently unavailable" },
        { status: 503 }
      );
    }
    
    // Get token from query params
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }
    
    // Validate token
    const tokenResult = await validateTrackingToken(token);
    if (!tokenResult.success || !tokenResult.order_id) {
      return NextResponse.json(
        { success: false, error: tokenResult.error || "Invalid token" },
        { status: 401 }
      );
    }
    
    const orderId = tokenResult.order_id;
    
    // Check if order can be tracked
    const trackingCheck = await canTrackOrder(orderId);
    if (!trackingCheck.allowed) {
      return NextResponse.json(
        { success: false, error: trackingCheck.reason || "Tracking unavailable" },
        { status: 403 }
      );
    }
    
    const supabase = createServiceRoleClient();
    
    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, order_status, payment_status, shipping_status, total_amount, currency, created_at, metadata, shiprocket_shipment_id, shipping_address_id"
      )
      .eq("id", orderId)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }
    
    const typedOrder = order as {
      id: string;
      order_number: string;
      order_status: string | null;
      payment_status: string | null;
      shipping_status: string | null;
      total_amount: number | null;
      currency: string | null;
      created_at: string;
      metadata: any;
      shiprocket_shipment_id: string | null;
      shipping_address_id: string | null;
    };
    
    // Fetch order items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("id, product_uid, name, quantity, price, subtotal")
      .eq("order_id", orderId);
    
    const typedOrderItems = (orderItems || []) as Array<{
      id: string;
      product_uid: string | null;
      name: string | null;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    
    // Fetch product images
    const productUids = typedOrderItems
      .map((item) => item.product_uid)
      .filter(Boolean) as string[];
    
    let productImages: Record<string, string | null> = {};
    if (productUids.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("uid, main_image_path")
        .in("uid", productUids);
      
      const typedProducts = (products || []) as Array<{
        uid: string;
        main_image_path: string | null;
      }>;
      
      typedProducts.forEach((p) => {
        productImages[p.uid] = p.main_image_path;
      });
    }
    
    // Fetch masked address (only city, state, pincode)
    let addressMasked = {
      city: null as string | null,
      state: null as string | null,
      pincode: null as string | null,
    };
    
    if (typedOrder.shipping_address_id) {
      const { data: address } = await supabase
        .from("addresses")
        .select("city, state, pincode")
        .eq("id", typedOrder.shipping_address_id)
        .single();
      
      if (address) {
        const typedAddress = address as {
          city: string | null;
          state: string | null;
          pincode: string | null;
        };
        addressMasked = {
          city: typedAddress.city,
          state: typedAddress.state,
          pincode: typedAddress.pincode,
        };
      }
    }
    
    // Extract shipping metadata
    const metadata = (typedOrder.metadata as Record<string, any>) || {};
    const shippingMetadata = metadata.shipping || {};
    const shippingTimeline = metadata.shipping_timeline || [];
    
    // Format timeline events
    const timelineEvents: TimelineEvent[] = shippingTimeline.map((event: any) => ({
      status: event.status,
      timestamp: event.timestamp,
      courier: event.courier || null,
      awb: event.awb || null,
      notes: event.notes || null,
    }));
    
    const formattedTimeline = formatTimelineEvents(timelineEvents);
    
    // Build response
    const trackingData: OrderTrackingData = {
      order_id: typedOrder.id,
      order_number: typedOrder.order_number,
      order_status: typedOrder.order_status || "created",
      payment_status: typedOrder.payment_status || "pending",
      shipping_status: typedOrder.shipping_status || "pending",
      total_amount: typedOrder.total_amount || 0,
      currency: typedOrder.currency || "INR",
      created_at: typedOrder.created_at,
      items: typedOrderItems.map((item) => ({
        id: item.id,
        name: item.name || "Unknown Product",
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        product_image: item.product_uid ? productImages[item.product_uid] || null : null,
      })),
      shipping: {
        courier: shippingMetadata.courier || null,
        tracking_number: shippingMetadata.awb || typedOrder.shiprocket_shipment_id || null,
        tracking_url: shippingMetadata.tracking_url || null,
        status: typedOrder.shipping_status || "pending",
        timeline: formattedTimeline,
      },
      address_masked: addressMasked,
    };
    
    // Record rate limit
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const { recordRateLimit } = await import("@/lib/otp/service");
    await recordRateLimit({
      identifier: ipAddress,
      identifierType: "ip",
      action: "view_tracking",
      supabase,
    });
    
    // Audit log
    await supabase.from("admin_audit_logs").insert({
      action: "tracking_viewed",
      target_resource: "orders",
      target_id: orderId,
      details: {
        token: token.substring(0, 8) + "****", // Masked token
      },
    } as unknown as never);
    
    return NextResponse.json({
      success: true,
      order: trackingData,
    });
  } catch (error: any) {
    console.error("[ORDER_TRACKING] View error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to fetch order details" },
      { status: 500 }
    );
  }
}

