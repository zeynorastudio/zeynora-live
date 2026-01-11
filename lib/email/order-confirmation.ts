/**
 * Order Confirmation Email Module
 * Sends order confirmation emails via SendGrid after successful payment
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@zeynora.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zeynora.com";

interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

/**
 * Send order confirmation email after successful payment
 * This is a mandatory email type - always sent regardless of preferences
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("[ORDER_EMAIL] SENDGRID_API_KEY not set - skipping email");
    return false;
  }

  try {
    const supabase = createServiceRoleClient();

    // Fetch order details
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        user_id,
        subtotal,
        shipping_cost,
        total,
        metadata,
        shipping_address_id
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      console.error("[ORDER_EMAIL] Order not found:", { orderId, error: orderError?.message });
      return false;
    }

    const typedOrder = orderData as {
      id: string;
      order_number: string;
      user_id: string | null;
      subtotal: number | null;
      shipping_cost: number | null;
      total: number | null;
      metadata: Record<string, unknown> | null;
      shipping_address_id: string | null;
    };

    // Get user email
    if (!typedOrder.user_id) {
      console.error("[ORDER_EMAIL] Order has no user_id:", { orderId });
      return false;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", typedOrder.user_id)
      .single();

    const typedUser = userData as { email: string; full_name: string | null } | null;
    if (!typedUser?.email) {
      console.error("[ORDER_EMAIL] User email not found:", { userId: typedOrder.user_id });
      return false;
    }

    // Fetch order items
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("name, sku, quantity, price")
      .eq("order_id", orderId);

    const items: OrderItem[] = ((itemsData || []) as Array<{
      name: string | null;
      sku: string | null;
      quantity: number;
      price: number;
    }>).map(item => ({
      name: item.name || "Product",
      sku: item.sku || "N/A",
      quantity: item.quantity,
      price: item.price,
    }));

    // Fetch shipping address
    let shippingAddress;
    if (typedOrder.shipping_address_id) {
      const { data: addressData } = await supabase
        .from("addresses")
        .select("line1, line2, city, state, pincode, country")
        .eq("id", typedOrder.shipping_address_id)
        .single();

      if (addressData) {
        const typedAddress = addressData as {
          line1: string | null;
          line2: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          country: string | null;
        };
        shippingAddress = {
          line1: typedAddress.line1 || "",
          line2: typedAddress.line2 || undefined,
          city: typedAddress.city || "",
          state: typedAddress.state || "",
          pincode: typedAddress.pincode || "",
          country: typedAddress.country || "India",
        };
      }
    }

    const orderDetails: OrderDetails = {
      orderId: typedOrder.id,
      orderNumber: typedOrder.order_number,
      customerEmail: typedUser.email,
      customerName: typedUser.full_name || "Customer",
      items,
      subtotal: typedOrder.subtotal || 0,
      shippingCost: typedOrder.shipping_cost || 0,
      total: typedOrder.total || 0,
      shippingAddress,
    };

    // Build and send email
    const { subject, htmlContent } = buildOrderConfirmationEmail(orderDetails);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: orderDetails.customerEmail }],
            subject: subject,
          },
        ],
        from: { email: SENDGRID_FROM_EMAIL, name: "ZEYNORA" },
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
      console.error("[ORDER_EMAIL] SendGrid API error:", { 
        status: response.status, 
        error: errorText,
        orderId,
      });
      return false;
    }

    // Log success
    console.info("[ORDER_EMAIL] Order confirmation sent:", {
      orderId,
      orderNumber: orderDetails.orderNumber,
      email: orderDetails.customerEmail,
    });

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "order_confirmation_email_sent",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: orderDetails.orderNumber,
          recipient_email: orderDetails.customerEmail,
        },
      } as unknown as never);
    } catch (auditError) {
      // Non-fatal
      console.warn("[ORDER_EMAIL] Audit log failed:", auditError);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ORDER_EMAIL] Failed to send confirmation:", {
      orderId,
      error: errorMessage,
    });
    return false;
  }
}

/**
 * Build order confirmation email HTML
 */
function buildOrderConfirmationEmail(order: OrderDetails): { subject: string; htmlContent: string } {
  const subject = `Order Confirmed - ${order.orderNumber} | ZEYNORA`;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${escapeHtml(item.name)}</strong><br>
        <span style="color: #666; font-size: 12px;">SKU: ${escapeHtml(item.sku)}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toLocaleString("en-IN")}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
    </tr>
  `).join("");

  const addressHtml = order.shippingAddress ? `
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">Shipping Address</h3>
      <p style="margin: 0; color: #666;">
        ${escapeHtml(order.shippingAddress.line1)}<br>
        ${order.shippingAddress.line2 ? escapeHtml(order.shippingAddress.line2) + "<br>" : ""}
        ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.state)} ${escapeHtml(order.shippingAddress.pincode)}<br>
        ${escapeHtml(order.shippingAddress.country)}
      </p>
    </div>
  ` : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background-color: #D4AF37; color: #1a1a1a; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px;">ZEYNORA</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #1a1a1a; margin-top: 0;">Thank you for your order!</h2>
          <p style="color: #666;">Hi ${escapeHtml(order.customerName)},</p>
          <p style="color: #666;">
            We've received your order and are getting it ready. You'll receive another email 
            when your order ships.
          </p>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Order Number:</strong> ${escapeHtml(order.orderNumber)}
          </div>

          <!-- Order Items -->
          <h3 style="color: #1a1a1a; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right;">₹${order.subtotal.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Shipping</td>
              <td style="padding: 8px 0; text-align: right;">${order.shippingCost > 0 ? "₹" + order.shippingCost.toLocaleString("en-IN") : "FREE"}</td>
            </tr>
            <tr style="border-top: 2px solid #D4AF37;">
              <td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px;">₹${order.total.toLocaleString("en-IN")}</td>
            </tr>
          </table>

          ${addressHtml}

          <!-- CTA -->
          <div style="text-align: center; margin-top: 30px;">
            <a href="${SITE_URL}/account/orders" 
               style="display: inline-block; padding: 12px 30px; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; border-radius: 4px; font-weight: bold;">
              View Order Status
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>Thank you for shopping with ZEYNORA</p>
          <p>If you have any questions, please contact our support team.</p>
          <p style="margin-top: 20px;">
            <a href="${SITE_URL}" style="color: #D4AF37;">Visit our store</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, htmlContent };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
