/**
 * Client-safe validation utilities
 * These functions can be used in both client and server components
 */

/**
 * Validates phone number format
 * If provided, must match: +91 followed by exactly 10 digits
 */
export function validatePhone(phone: string | null | undefined): { valid: boolean; error?: string } {
  if (!phone || phone.trim() === "") {
    return { valid: true }; // Phone is optional
  }

  const phoneRegex = /^\+91[0-9]{10}$/;
  if (!phoneRegex.test(phone.trim())) {
    return {
      valid: false,
      error: "Phone number must be in format: +91 followed by 10 digits (e.g., +919876543210)",
    };
  }

  return { valid: true };
}
















