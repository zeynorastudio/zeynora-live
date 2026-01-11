/**
 * Address Validation Helpers
 * Shared validation logic for client and server
 */

export interface AddressValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate phone number (must be exactly 10 digits)
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") {
    return false;
  }
  const cleaned = phone.replace(/\D/g, "");
  return /^\d{10}$/.test(cleaned);
}

/**
 * Validate pincode (must be exactly 6 digits)
 */
export function validatePincode(pincode: string): boolean {
  if (!pincode || typeof pincode !== "string") {
    return false;
  }
  return /^\d{6}$/.test(pincode.trim());
}

/**
 * Validate complete address payload
 */
export function validateAddressPayload(payload: {
  label?: string;
  recipient_name?: string;
  phone?: string;
  pincode?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
}): AddressValidationResult {
  if (!payload.recipient_name || typeof payload.recipient_name !== "string" || payload.recipient_name.trim().length === 0) {
    return { valid: false, error: "Recipient name is required" };
  }

  if (!payload.phone || typeof payload.phone !== "string") {
    return { valid: false, error: "Phone number is required" };
  }

  if (!validatePhone(payload.phone)) {
    return { valid: false, error: "Phone number must be exactly 10 digits" };
  }

  if (!payload.address_line_1 || typeof payload.address_line_1 !== "string" || payload.address_line_1.trim().length === 0) {
    return { valid: false, error: "Address line 1 is required" };
  }

  if (!payload.city || typeof payload.city !== "string" || payload.city.trim().length === 0) {
    return { valid: false, error: "City is required" };
  }

  if (!payload.state || typeof payload.state !== "string" || payload.state.trim().length === 0) {
    return { valid: false, error: "State is required" };
  }

  if (!payload.pincode || typeof payload.pincode !== "string") {
    return { valid: false, error: "Pincode is required" };
  }

  if (!validatePincode(payload.pincode)) {
    return { valid: false, error: "Pincode must be exactly 6 digits" };
  }

  return { valid: true };
}

/**
 * Mask phone number for privacy (show first 3 and last 2 digits)
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 5) {
    return phone;
  }
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) {
    return phone;
  }
  return `${cleaned.substring(0, 3)}*****${cleaned.substring(8)}`;
}























