import crypto from "crypto";

/**
 * Verify Razorpay payment signature
 * @param paymentId - Razorpay payment ID
 * @param orderId - Razorpay order ID
 * @param signature - Razorpay signature to verify
 * @returns true if signature is valid, false otherwise
 */
export function verifyRazorpaySignature(
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























