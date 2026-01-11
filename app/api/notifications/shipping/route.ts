import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@zeynora.com";

/**
 * Shipping Notifications API
 * Sends email notifications for shipping events (AWB generated, pickup, delivery, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { order_id, event_type, awb, courier, tracking_url, expected_delivery } = body;

    if (!order_id || !event_type) {
      return NextResponse.json(
        { error: "Missing order_id or event_type" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch order and user details
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, user_id")
      .eq("id", order_id)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const typedOrder = orderData as {
      id: string;
      order_number: string;
      user_id: string | null;
    };

    if (!typedOrder.user_id) {
      return NextResponse.json(
        { error: "Order has no user associated" },
        { status: 400 }
      );
    }

    // Fetch user email
    const { data: userData } = await supabase
      .from("users")
      .select("email, auth_uid")
      .eq("id", typedOrder.user_id)
      .single();

    const typedUserData = userData as {
      email: string;
      auth_uid: string | null;
    } | null;

    if (!typedUserData?.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }

    // Send notification email
    const emailSent = await sendShippingNotification({
      to: typedUserData.email,
      orderNumber: typedOrder.order_number,
      eventType: event_type,
      awb: awb || null,
      courier: courier || null,
      trackingUrl: tracking_url || null,
      expectedDelivery: expected_delivery || null,
    });

    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send notification email" },
        { status: 500 }
      );
    }

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "shipping_notification_sent",
        target_resource: "orders",
        target_id: order_id,
        details: {
          event_type,
          recipient_email: typedUserData.email,
          awb,
        },
      } as unknown as never);
    } catch (auditError) {
      console.error("Audit log error:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notification error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Send shipping notification email via SendGrid
 */
async function sendShippingNotification({
  to,
  orderNumber,
  eventType,
  awb,
  courier,
  trackingUrl,
  expectedDelivery,
}: {
  to: string;
  orderNumber: string;
  eventType: string;
  awb: string | null;
  courier: string | null;
  trackingUrl: string | null;
  expectedDelivery: string | null;
}): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set - skipping email notification");
    return false; // Don't fail if SendGrid not configured
  }

  try {
    // Build email content based on event type
    const { subject, htmlContent } = buildEmailContent({
      orderNumber,
      eventType,
      awb,
      courier,
      trackingUrl,
      expectedDelivery,
    });

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject,
          },
        ],
        from: { email: SENDGRID_FROM_EMAIL },
        content: [
          {
            type: "text/html",
            value: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid API error:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("SendGrid error:", error);
    return false;
  }
}

/**
 * Build email content based on event type
 */
function buildEmailContent({
  orderNumber,
  eventType,
  awb,
  courier,
  trackingUrl,
  expectedDelivery,
}: {
  orderNumber: string;
  eventType: string;
  awb: string | null;
  courier: string | null;
  trackingUrl: string | null;
  expectedDelivery: string | null;
}): { subject: string; htmlContent: string } {
  const eventTemplates: Record<string, { subject: string; message: string }> = {
    awb_generated: {
      subject: `Your order ${orderNumber} has been shipped!`,
      message: `Great news! Your order has been shipped and is on its way to you.`,
    },
    picked_up: {
      subject: `Your order ${orderNumber} has been picked up`,
      message: `Your order has been picked up by the courier and is in transit.`,
    },
    out_for_delivery: {
      subject: `Your order ${orderNumber} is out for delivery`,
      message: `Your order is out for delivery and will arrive soon!`,
    },
    delivered: {
      subject: `Your order ${orderNumber} has been delivered`,
      message: `Your order has been successfully delivered. Thank you for shopping with us!`,
    },
  };

  const template = eventTemplates[eventType] || {
    subject: `Update on your order ${orderNumber}`,
    message: `There's an update on your order.`,
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #D4AF37; color: #1a1a1a; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #D4AF37; }
        .button { display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; border-radius: 4px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ZEYNORA</h1>
        </div>
        <div class="content">
          <h2>${template.subject}</h2>
          <p>${template.message}</p>
          
          <div class="info-box">
            <strong>Order Number:</strong> ${orderNumber}<br>
            ${awb ? `<strong>AWB Number:</strong> ${awb}<br>` : ""}
            ${courier ? `<strong>Courier:</strong> ${courier}<br>` : ""}
            ${expectedDelivery ? `<strong>Expected Delivery:</strong> ${new Date(expectedDelivery).toLocaleDateString()}<br>` : ""}
          </div>
          
          ${trackingUrl ? `<a href="${trackingUrl}" class="button">Track Your Order</a>` : ""}
        </div>
        <div class="footer">
          <p>Thank you for shopping with ZEYNORA</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: template.subject, htmlContent };
}
