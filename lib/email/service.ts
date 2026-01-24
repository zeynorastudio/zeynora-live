/**
 * Email Service Module
 * Unified email service using Resend as the email provider
 * 
 * Handles:
 * - OTP emails (transactional, security-focused)
 * - Order confirmation emails
 */

import { Resend } from "resend";
import { createServiceRoleClient } from "@/lib/supabase/server";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@zeynora.com";
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || "ZEYNORA";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zeynora.com";

// Initialize Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Build OTP email template
 * Transactional, minimal, security-focused
 */
function buildOtpEmailTemplate(params: {
  otp: string;
  expiresIn: number; // minutes
}): { subject: string; html: string; text: string } {
  const { otp, expiresIn } = params;
  
  const subject = `Your ZEYNORA Verification Code`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 2px;">ZEYNORA</h1>
          </div>
          
          <!-- Content -->
          <div style="text-align: center;">
            <h2 style="color: #1a1a1a; margin-top: 0;">Verification Code</h2>
            <p style="color: #666; font-size: 16px;">Your verification code is:</p>
            
            <!-- OTP Display -->
            <div style="background-color: #f9f9f9; border: 2px solid #D4AF37; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This code will expire in <strong>${expiresIn} minutes</strong>.
            </p>
            
            <!-- Security Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; text-align: left;">
              <p style="margin: 0; color: #856404; font-size: 13px;">
                <strong>Security Notice:</strong> Never share this code with anyone. ZEYNORA will never ask for your verification code.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
ZEYNORA Verification Code

Your verification code is: ${otp}

This code will expire in ${expiresIn} minutes.

Security Notice: Never share this code with anyone. ZEYNORA will never ask for your verification code.

If you didn't request this code, please ignore this email.
  `.trim();
  
  return { subject, html, text };
}

/**
 * Build order confirmation email template
 */
function buildOrderConfirmationEmailTemplate(order: {
  orderNumber: string;
  customerName: string;
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
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
  paymentStatus: string;
}): { subject: string; html: string; text: string } {
  const { orderNumber, customerName, items, subtotal, shippingCost, total, shippingAddress, paymentStatus } = order;
  
  const subject = `Order Confirmed - ${orderNumber} | ZEYNORA`;
  
  const itemsHtml = items.map(item => `
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

  const addressHtml = shippingAddress ? `
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
      <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">Shipping Address</h3>
      <p style="margin: 0; color: #666;">
        ${escapeHtml(shippingAddress.line1)}<br>
        ${shippingAddress.line2 ? escapeHtml(shippingAddress.line2) + "<br>" : ""}
        ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.state)} ${escapeHtml(shippingAddress.pincode)}<br>
        ${escapeHtml(shippingAddress.country)}
      </p>
    </div>
  ` : "";

  const paymentStatusHtml = paymentStatus === "paid" 
    ? '<div style="background-color: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 20px 0;"><strong>Payment Status:</strong> Paid</div>'
    : '<div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; margin: 20px 0;"><strong>Payment Status:</strong> ' + escapeHtml(paymentStatus) + '</div>';

  const html = `
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
          <p style="color: #666;">Hi ${escapeHtml(customerName)},</p>
          <p style="color: #666;">
            We've received your order and are getting it ready. You'll receive another email 
            when your order ships.
          </p>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Order Number:</strong> ${escapeHtml(orderNumber)}
          </div>

          ${paymentStatusHtml}

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
              <td style="padding: 8px 0; text-align: right;">₹${subtotal.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Shipping</td>
              <td style="padding: 8px 0; text-align: right;">${shippingCost > 0 ? "₹" + shippingCost.toLocaleString("en-IN") : "FREE"}</td>
            </tr>
            <tr style="border-top: 2px solid #D4AF37;">
              <td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px;">₹${total.toLocaleString("en-IN")}</td>
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

  const text = `
ZEYNORA - Order Confirmation

Hi ${customerName},

Thank you for your order!

Order Number: ${orderNumber}
Payment Status: ${paymentStatus}

Order Details:
${items.map(item => `- ${item.name} (SKU: ${item.sku}) x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString("en-IN")}`).join("\n")}

Subtotal: ₹${subtotal.toLocaleString("en-IN")}
Shipping: ${shippingCost > 0 ? "₹" + shippingCost.toLocaleString("en-IN") : "FREE"}
Total: ₹${total.toLocaleString("en-IN")}

${shippingAddress ? `Shipping Address:\n${shippingAddress.line1}${shippingAddress.line2 ? "\n" + shippingAddress.line2 : ""}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.pincode}\n${shippingAddress.country}` : ""}

View your order: ${SITE_URL}/account/orders

Thank you for shopping with ZEYNORA!
  `.trim();

  return { subject, html, text };
}

/**
 * Send OTP email
 * @param email - Recipient email address
 * @param otp - 6-digit OTP code
 * @param expiresIn - Expiration time in minutes (default: 5)
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  expiresIn: number = 5
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[EMAIL_FAILED] RESEND_API_KEY not configured");
    return false;
  }

  try {
    const client = getResendClient();
    const { subject, html, text } = buildOtpEmailTemplate({ otp, expiresIn });

    const result = await client.emails.send({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [email],
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[EMAIL_FAILED]", {
        type: "OTP_SENT",
        email: email.substring(0, 3) + "***", // Masked
        error: result.error.message || "Unknown error",
      });
      return false;
    }

    console.log("[OTP_SENT]", {
      email: email.substring(0, 3) + "***", // Masked
      expires_in_minutes: expiresIn,
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[EMAIL_FAILED]", {
      type: "OTP_SENT",
      email: email.substring(0, 3) + "***", // Masked
      error: errorMessage,
    });
    return false;
  }
}

/**
 * Send order confirmation email
 * @param orderId - Order ID to fetch details and send confirmation
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[ORDER_CONFIRMATION_EMAIL_SENT] RESEND_API_KEY not set - skipping email");
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
        payment_status,
        metadata,
        shipping_address_id
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      console.error("[EMAIL_FAILED]", {
        type: "ORDER_CONFIRMATION_EMAIL_SENT",
        order_id: orderId,
        error: orderError?.message || "Order not found",
      });
      return false;
    }

    const typedOrder = orderData as {
      id: string;
      order_number: string;
      user_id: string | null;
      subtotal: number | null;
      shipping_cost: number | null;
      total: number | null;
      payment_status: string | null;
      metadata: Record<string, unknown> | null;
      shipping_address_id: string | null;
    };

    // Get user email
    if (!typedOrder.user_id) {
      console.error("[EMAIL_FAILED]", {
        type: "ORDER_CONFIRMATION_EMAIL_SENT",
        order_id: orderId,
        error: "Order has no user_id",
      });
      return false;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", typedOrder.user_id)
      .single();

    const typedUser = userData as { email: string; full_name: string | null } | null;
    if (!typedUser?.email) {
      console.error("[EMAIL_FAILED]", {
        type: "ORDER_CONFIRMATION_EMAIL_SENT",
        order_id: orderId,
        error: "User email not found",
      });
      return false;
    }

    // Fetch order items
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("name, sku, quantity, price")
      .eq("order_id", orderId);

    const items = ((itemsData || []) as Array<{
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

    // Build and send email
    const { subject, html, text } = buildOrderConfirmationEmailTemplate({
      orderNumber: typedOrder.order_number,
      customerName: typedUser.full_name || "Customer",
      items,
      subtotal: typedOrder.subtotal || 0,
      shippingCost: typedOrder.shipping_cost || 0,
      total: typedOrder.total || 0,
      shippingAddress,
      paymentStatus: typedOrder.payment_status || "pending",
    });

    const client = getResendClient();
    const result = await client.emails.send({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [typedUser.email],
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[EMAIL_FAILED]", {
        type: "ORDER_CONFIRMATION_EMAIL_SENT",
        order_id: orderId,
        order_number: typedOrder.order_number,
        error: result.error.message || "Unknown error",
      });
      return false;
    }

    // Log success
    console.log("[ORDER_CONFIRMATION_EMAIL_SENT]", {
      order_id: orderId,
      order_number: typedOrder.order_number,
      email: typedUser.email.substring(0, 3) + "***", // Masked
    });

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "order_confirmation_email_sent",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: typedOrder.order_number,
          recipient_email: typedUser.email.substring(0, 3) + "***", // Masked
        },
      } as unknown as never);
    } catch (auditError) {
      // Non-fatal
      console.warn("[ORDER_CONFIRMATION_EMAIL_SENT] Audit log failed:", auditError);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[EMAIL_FAILED]", {
      type: "ORDER_CONFIRMATION_EMAIL_SENT",
      order_id: orderId,
      error: errorMessage,
    });
    return false;
  }
}
