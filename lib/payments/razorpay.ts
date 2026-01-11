import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * Get Razorpay instance with credentials from environment variables
 * @throws Error if RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET are missing
 */
export function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials missing: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set"
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Create a Razorpay order
 * @param amount - Amount in paise (smallest currency unit)
 * @param currency - Currency code (default: INR)
 * @param receipt - Receipt identifier
 * @param notes - Additional notes/metadata
 * @returns Razorpay order object
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = "INR",
  receipt: string,
  notes?: Record<string, string>
): Promise<any> {
  const razorpay = getRazorpayInstance();

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: notes || {},
    });

    return order;
  } catch (error: any) {
    throw new Error(`Razorpay order creation failed: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 * @param paymentId - Razorpay payment ID
 * @param orderId - Razorpay order ID
 * @param signature - Razorpay signature to verify
 * @returns true if signature is valid, false otherwise
 */
export function verifyPaymentSignature(
  paymentId: string,
  orderId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }

  // Razorpay signature format: HMAC SHA256 of order_id|payment_id
  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Verify Razorpay webhook signature
 * @param payload - Raw webhook payload (string)
 * @param signature - Webhook signature from X-Razorpay-Signature header
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }

  // Razorpay webhook signature: HMAC SHA256 of payload
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}























