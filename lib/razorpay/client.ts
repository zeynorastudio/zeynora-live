import Razorpay from "razorpay";

/**
 * Get Razorpay instance with credentials from environment variables
 * @throws Error if RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET are missing
 */
export function getRazorpay(): Razorpay {
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























