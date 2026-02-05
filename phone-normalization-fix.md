# Phone Number Normalization Fix

## Summary

Fixed phone number normalization and validation during customer profile completion and guest checkout. Phone numbers are now validated and stored only after being normalized to full E.164 format (`+91XXXXXXXXXX`).

## What Was Wrong

### The Problem

The frontend was sending raw 10-digit phone numbers to the backend, but the backend validation (`validatePhone` in `lib/utils/validation.ts`) expected the full E.164 format with the `+91` prefix.

**Example of the bug:**
1. User enters `9876543210` in the phone input field
2. UI displays `+91` prefix visually (but doesn't combine it with the value)
3. Frontend sends `phone: "9876543210"` to the API
4. Backend validation regex `/^\+91[0-9]{10}$/` fails
5. Customer creation fails with "Invalid phone number" error

### Affected Code Paths

1. **CheckoutAuthModal.tsx** - `handleSignup()`:
   - Sent `phone: phone.trim() || null` (raw 10 digits)
   
2. **CheckoutAuthModal.tsx** - `handleGuestSubmit()`:
   - Stored `phone: guestPhone.trim() || null` in guest session (raw 10 digits)

3. **GuestCheckoutForm.tsx** - `handleSubmit()`:
   - Sent `phone: formData.phone.replace(/\D/g, "")` to create-order API (raw digits)

## Where Normalization Now Happens

### CheckoutAuthModal.tsx

Added `normalizePhoneToE164()` helper function that:
- Takes 10-digit input
- Prepends `+91` prefix
- Returns `null` for empty/invalid input

Used in:
1. `handleSignup()` - Before calling `/api/auth/customer/complete-login`
2. `handleGuestSubmit()` - Before storing phone in guest session

```typescript
const normalizePhoneToE164 = (phoneInput: string): string | null => {
  if (!phoneInput || !phoneInput.trim()) {
    return null;
  }
  const digits = phoneInput.replace(/\D/g, "");
  if (digits.length !== 10) {
    return null;
  }
  return `+91${digits}`;
};
```

### GuestCheckoutForm.tsx

Added similar helpers:
- `normalizePhoneToE164()` - Converts 10 digits to `+91XXXXXXXXXX`
- `stripPhonePrefix()` - Removes `+91` prefix for display in input field

Used in:
1. Pre-fill from session - strips prefix for display
2. `handleSubmit()` - normalizes before sending to `/api/checkout/create-order`
3. Razorpay prefill - uses normalized phone

## Why Validation Now Passes Correctly

1. **Normalization happens BEFORE validation**:
   - Frontend normalizes phone to `+91XXXXXXXXXX` format
   - Backend receives already-normalized phone
   - Validation regex `/^\+91[0-9]{10}$/` matches correctly

2. **Consistent format throughout the flow**:
   - User input: `9876543210`
   - Normalized value: `+91987654310`
   - Database storage: `+91987654310`
   - Display (when loaded): `9876543210` (prefix stripped)

3. **Edge cases handled**:
   - Empty/null phone returns `null` (phone is optional)
   - Invalid length (not 10 digits) returns `null`
   - Non-digit characters are stripped before validation

## Why This Does Not Affect OTP or Checkout Safety

### OTP System is Unaffected

- **OTP uses EMAIL ONLY** - The customer authentication OTP system (`/api/auth/customer/send-otp` and `/api/auth/customer/verify-otp`) operates exclusively on email addresses
- Phone number is only used for:
  - Optional profile field during signup
  - Delivery updates contact
  - Order tracking
- No phone-based OTP flow exists in the customer authentication system

### Checkout Safety Preserved

1. **No checkout flow logic changes**:
   - Only the phone normalization step was added
   - Order creation, payment flow, and validation logic remain identical

2. **Backend validation still enforces format**:
   - `lib/utils/validation.ts` still validates `+91XXXXXXXXXX` format
   - If somehow an invalid phone reaches the backend, it will still be rejected

3. **Database schema unchanged**:
   - `customers.phone` column still stores `+91XXXXXXXXXX` format
   - No migration needed

4. **Session handling preserved**:
   - Guest sessions now store normalized phone
   - When loading from session, prefix is stripped for UI display
   - Re-normalization happens before any API call

## Files Modified

1. `components/checkout/CheckoutAuthModal.tsx`
   - Added `normalizePhoneToE164()` helper
   - Updated `handleSignup()` to normalize before API call
   - Updated `handleGuestSubmit()` to normalize before session storage

2. `components/checkout/GuestCheckoutForm.tsx`
   - Added `normalizePhoneToE164()` helper
   - Added `stripPhonePrefix()` helper for display
   - Updated pre-fill logic to use strip helper
   - Updated `handleSubmit()` to normalize before API call
   - Updated Razorpay prefill to use normalized phone

## Testing Checklist

- [ ] UI accepts 10-digit phone input
- [ ] UI displays `+91` prefix visually
- [ ] Backend stores `+91XXXXXXXXXX` format in `customers.phone`
- [ ] Validation error does NOT appear for valid 10-digit input
- [ ] Empty phone field is accepted (phone is optional)
- [ ] Invalid phone (< 10 digits) shows appropriate error
- [ ] Guest checkout stores normalized phone in session
- [ ] Loading from session displays phone without prefix in input
- [ ] OTP flow unaffected (email-only)
- [ ] No TypeScript or lint errors
