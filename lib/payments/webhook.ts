import crypto from "crypto";

/**
 * Verify Razorpay webhook signature
 * Uses RAZORPAY_WEBHOOK_SECRET if available, otherwise falls back to RAZORPAY_KEY_SECRET
 * @param rawBody - Raw webhook payload (string)
 * @param signature - Webhook signature from X-Razorpay-Signature header
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  // Use webhook secret if configured, otherwise fall back to key secret
  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET is not configured"
    );
  }

  // Razorpay webhook signature: HMAC SHA256 of raw body
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Build idempotency key from webhook payload
 * Uses razorpay_event_id if present, otherwise uses signature hash
 * @param payload - Parsed webhook payload
 * @param signature - Webhook signature
 * @returns Idempotency key string
 */
export function buildIdempotencyKey(
  payload: any,
  signature: string
): string {
  // Prefer razorpay_event_id if available
  if (payload.event_id) {
    return `razorpay_webhook_${payload.event_id}`;
  }

  // Fallback to signature hash (first 32 chars)
  const signatureHash = crypto
    .createHash("sha256")
    .update(signature)
    .digest("hex")
    .substring(0, 32);

  return `razorpay_webhook_${signatureHash}`;
}























