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
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || "ZEYNORA";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zeynora.com";

// Auth email sender configuration
const RESEND_AUTH_FROM_EMAIL = process.env.RESEND_AUTH_FROM_EMAIL;
const RESEND_AUTH_FROM_NAME = process.env.RESEND_AUTH_FROM_NAME || "Auth";

// Orders email sender configuration
const RESEND_ORDERS_FROM_EMAIL = process.env.RESEND_ORDERS_FROM_EMAIL;
const RESEND_ORDERS_FROM_NAME = process.env.RESEND_ORDERS_FROM_NAME || "Zeynora Orders";

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
 * Get sender identity for auth emails
 * Format: "Name <email@example.com>"
 */
function getAuthSender(): string {
  if (!RESEND_AUTH_FROM_EMAIL) {
    throw new Error("RESEND_AUTH_FROM_EMAIL is required but not configured");
  }
  return `${RESEND_AUTH_FROM_NAME} <${RESEND_AUTH_FROM_EMAIL}>`;
}

/**
 * Get sender identity for order emails
 * Format: "Name <email@example.com>"
 */
function getOrdersSender(): string {
  if (!RESEND_ORDERS_FROM_EMAIL) {
    throw new Error("RESEND_ORDERS_FROM_EMAIL is required but not configured");
  }
  return `${RESEND_ORDERS_FROM_NAME} <${RESEND_ORDERS_FROM_EMAIL}>`;
}

type OrderEmailPayload = {
  order_id: string;
  order_date: string;
  payment_method: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  items_html: string;
  shipping_address: string;
  delivery_date: string;
  recipient_email: string;
};

type OrderSnapshotMetadata = {
  customer_snapshot?: {
    email?: string | null;
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
  };
  items_snapshot?: Array<{
    product_name?: string;
    size?: string;
    quantity?: number;
    selling_price?: number;
    subtotal?: number;
  }>;
};

type TypedOrder = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_id: string | null;
  guest_email: string | null;
  subtotal: number | null;
  shipping_fee: number | null;
  total_amount: number | null;
  payment_status: string | null;
  metadata: OrderSnapshotMetadata | null;
  created_at: string;
  payment_method: string | null;
};

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

function buildOrderEmailPayload(order: TypedOrder): OrderEmailPayload | null {
  const metadata = order.metadata || {};

  const customer = metadata.customer_snapshot || {};
  const items = metadata.items_snapshot || [];

  if (!customer.email) {
    console.error("[EMAIL_FAIL] Missing customer email");
    return null;
  }

  if (!items.length) {
    console.error("[EMAIL_FAIL] No items in snapshot");
    return null;
  }

  const itemsHtml = items.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.size}</td>
        <td>${item.quantity}</td>
        <td>₹${item.selling_price}</td>
        <td>₹${item.subtotal}</td>
      </tr>
   `).join("");

  const shippingAddress = `
      ${customer.name}<br/>
      ${customer.address?.line1 || ""}<br/>
      ${customer.address?.city || ""}, ${customer.address?.state || ""}<br/>
      ${customer.address?.pincode || ""}
   `;

  return {
    order_id: order.order_number,
    order_date: new Date(order.created_at).toLocaleDateString("en-IN"),
    payment_method: order.payment_method || "Online",
    subtotal: order.subtotal || 0,
    shipping: order.shipping_fee || 0,
    tax: 0,
    total: order.total_amount || 0,
    items_html: itemsHtml,
    shipping_address: shippingAddress,
    delivery_date: "Within 5–7 business days",
    recipient_email: customer.email
  };
}

/**
 * Build order confirmation email template
 */
function buildOrderConfirmationEmailTemplate(
  payload: OrderEmailPayload
): { subject: string; html: string; text: string } {
  const subject = `Order Confirmed - ${payload.order_id} | ZEYNORA`;
  const addressHtml = payload.shipping_address.trim()
    ? `
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #1a1a1a;">Shipping Address</h3>
        <p style="margin: 0; color: #666;">
          ${payload.shipping_address}
        </p>
      </div>
    `
    : "";

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
          <p style="color: #666;">Hi,</p>
          <p style="color: #666;">
            We've received your order and are getting it ready. You'll receive another email 
            when your order ships.
          </p>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <strong>Order Number:</strong> ${payload.order_id}<br/>
            <strong>Order Date:</strong> ${payload.order_date}<br/>
            <strong>Payment Method:</strong> ${payload.payment_method}
          </div>

          <!-- Order Items -->
          <h3 style="color: #1a1a1a; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: left;">Size</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${payload.items_html}
            </tbody>
          </table>

          <!-- Totals -->
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Subtotal</td>
              <td style="padding: 8px 0; text-align: right;">₹${payload.subtotal.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Shipping</td>
              <td style="padding: 8px 0; text-align: right;">₹${payload.shipping.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Tax</td>
              <td style="padding: 8px 0; text-align: right;">₹${payload.tax.toLocaleString("en-IN")}</td>
            </tr>
            <tr style="border-top: 2px solid #D4AF37;">
              <td style="padding: 12px 0; font-weight: bold; font-size: 18px;">Total</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px;">₹${payload.total.toLocaleString("en-IN")}</td>
            </tr>
          </table>

          ${addressHtml}

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 20px;">
            <strong>Estimated Delivery:</strong> ${payload.delivery_date}
          </div>

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

Thank you for your order!

Order Number: ${payload.order_id}
Order Date: ${payload.order_date}
Payment Method: ${payload.payment_method}

Subtotal: ₹${payload.subtotal.toLocaleString("en-IN")}
Shipping: ₹${payload.shipping.toLocaleString("en-IN")}
Tax: ₹${payload.tax.toLocaleString("en-IN")}
Total: ₹${payload.total.toLocaleString("en-IN")}

Estimated Delivery: ${payload.delivery_date}

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
    const fromSender = getAuthSender();

    const result = await client.emails.send({
      from: fromSender,
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
    // STRUCTURAL FIX: Use correct column names (shipping_fee, total_amount)
    // STRUCTURAL FIX: Include guest_email and shipping fields for guest support
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        user_id,
        customer_id,
        guest_email,
        subtotal,
        shipping_fee,
        total_amount,
        payment_status,
        metadata,
        created_at,
        payment_method
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

    const typedOrder = orderData as TypedOrder;

    if (typedOrder.payment_status !== "paid") {
      console.warn("[EMAIL_SKIP] Payment not completed");
      return false;
    }

    const payload = buildOrderEmailPayload(typedOrder);

    if (!payload) {
      console.error("[EMAIL_ABORT] Payload build failed");
      return false;
    }

    console.log("[EMAIL_PAYLOAD]", payload);

    const { subject, html, text } = buildOrderConfirmationEmailTemplate(payload);

    try {
      const client = getResendClient();
      const fromSender = getOrdersSender();
      const result = await client.emails.send({
        from: fromSender,
        to: [payload.recipient_email],
        subject,
        html,
        text,
      });

      if (result.error) {
        console.error("[EMAIL_ERROR]", result.error);
        return false;
      }
    } catch (error) {
      console.error("[EMAIL_ERROR]", error);
      return false;
    }

    console.log("[EMAIL_SUCCESS]", {
      order_id: orderId,
      email: payload.recipient_email
    });

    // Write audit log
    try {
      await supabase.from("admin_audit_logs").insert({
        action: "order_confirmation_email_sent",
        target_resource: "orders",
        target_id: orderId,
        details: {
          order_number: typedOrder.order_number,
          recipient_email: payload.recipient_email,
          customer_type: typedOrder.user_id ? "logged_in" : "guest",
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
