# Production-Safe Checkout & Auth Flow Design

**Date:** 2026-01-26  
**Status:** Production Design Specification  
**Priority:** P0 — Core User Experience

---

## Executive Summary

This document defines a production-safe checkout and authentication flow that handles:

- ✅ **Stock validation** before checkout (prevents overselling)
- ✅ **Unified auth modal** (login/signup/guest in one component)
- ✅ **Guest session handling** (persistent cart, order tracking)
- ✅ **Coupon validation** (real-time validation, expiry handling)
- ✅ **Edge case handling** (stock changes, expired coupons, session loss)
- ✅ **UX states** (loading, error, success, validation)
- ✅ **TypeScript-safe APIs** (full type safety, error handling)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Stock Validation Flow](#stock-validation-flow)
3. [Unified Auth Modal](#unified-auth-modal)
4. [Guest Session Handling](#guest-session-handling)
5. [Coupon Validation Flow](#coupon-validation-flow)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [UX States & Messaging](#ux-states--messaging)
8. [API Specifications](#api-specifications)
9. [TypeScript Types](#typescript-types)
10. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Cart Page                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cart Items (with stock validation)                  │  │
│  │  - Real-time stock check on load                     │  │
│  │  - Quantity adjustment with stock limits             │  │
│  │  - Remove out-of-stock items                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Coupon Input (optional)                             │  │
│  │  - Real-time validation                              │  │
│  │  - Discount calculation                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Order Summary                                       │  │
│  │  - Subtotal                                           │  │
│  │  - Discount (if coupon applied)                      │  │
│  │  - Shipping (FREE)                                   │  │
│  │  - Total                                             │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Checkout Button                                      │  │
│  │  → Triggers: Stock Validation → Auth Modal           │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Pre-Checkout Validation       │
        │  - Stock availability          │
        │  - Coupon validity              │
        │  - Cart not empty               │
        └───────────────┬─────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
      ✅ Valid              ❌ Invalid
            │                       │
            │                       ▼
            │          ┌──────────────────────┐
            │          │ Show Error Message   │
            │          │ - Stock unavailable  │
            │          │ - Coupon expired     │
            │          │ - Cart empty         │
            │          └──────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified Auth Modal                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tab 1: Sign In (existing users)                     │  │
│  │  Tab 2: Sign Up (new users)                          │  │
│  │  Tab 3: Guest Checkout (no account)                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Sign In Flow:                                               │
│  1. Enter mobile → Send OTP                                  │
│  2. Enter OTP → Verify → Login → Proceed to Checkout        │
│                                                              │
│  Sign Up Flow:                                               │
│  1. Enter mobile → Send OTP                                  │
│  2. Enter OTP + Name + Email → Verify → Create Account      │
│  3. Auto-login → Proceed to Checkout                        │
│                                                              │
│  Guest Flow:                                                 │
│  1. Click "Continue as Guest"                               │
│  2. Proceed directly to Checkout Form                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Checkout Form                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Customer Information                                │  │
│  │  - Name (required)                                   │  │
│  │  - Phone (required, 10 digits)                       │  │
│  │  - Email (optional)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Shipping Address                                    │  │
│  │  - Address Line 1 (required)                         │  │
│  │  - Address Line 2 (optional)                          │  │
│  │  - City (required)                                   │  │
│  │  - State (required)                                  │  │
│  │  - Pincode (required, 6 digits)                      │  │
│  │  - Country (default: India)                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Final Stock Validation (server-side)                │  │
│  │  - Re-check stock before order creation              │  │
│  │  - Re-validate coupon                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Place Order Button                                  │  │
│  │  → Create Order → Payment Gateway                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Order Creation                │
        │  - Stock validation            │
        │  - Coupon validation           │
        │  - Order record creation       │
        │  - Razorpay order creation     │
        └───────────────┬─────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
      ✅ Success            ❌ Failure
            │                       │
            │                       ▼
            │          ┌──────────────────────┐
            │          │ Show Error           │
            │          │ - Stock unavailable  │
            │          │ - Coupon expired     │
            │          │ - Payment error      │
            │          └──────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│              Payment Gateway (Razorpay)                      │
│  - Payment processing                                        │
│  - Success → Order Confirmation                              │
│  - Failure → Retry Payment                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Stock Validation Flow

### Client-Side Validation (Real-Time)

**Purpose:** Provide immediate feedback to users before checkout

**Implementation:**

```typescript
// components/cart/CartStockValidator.tsx
interface StockValidationResult {
  valid: boolean;
  items: Array<{
    sku: string;
    available: number;
    requested: number;
    status: 'available' | 'insufficient' | 'out_of_stock';
  }>;
  errors: string[];
}

async function validateCartStock(
  items: CartItem[]
): Promise<StockValidationResult> {
  const response = await fetch('/api/cart/validate-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  
  return response.json();
}
```

**When to Validate:**
1. ✅ On cart page load
2. ✅ When quantity is changed
3. ✅ Before checkout button click
4. ✅ Periodically (every 30 seconds) while on cart page

**UX Behavior:**
- Show warning badge on items with insufficient stock
- Disable checkout button if any item unavailable
- Show message: "Some items are out of stock. Please update your cart."

---

### Server-Side Validation (Pre-Order Creation)

**Purpose:** Final validation before order creation (prevents race conditions)

**API:** `POST /api/checkout/validate`

```typescript
interface CheckoutValidationRequest {
  items: Array<{
    sku: string;
    quantity: number;
  }>;
  coupon_code?: string;
}

interface CheckoutValidationResponse {
  valid: boolean;
  errors: Array<{
    type: 'stock' | 'coupon' | 'cart' | 'serviceability';
    message: string;
    details?: unknown;
  }>;
  stock_status?: Array<{
    sku: string;
    available: number;
    requested: number;
    status: 'available' | 'insufficient' | 'out_of_stock';
  }>;
  coupon_status?: {
    valid: boolean;
    code: string;
    discount_amount: number;
    discount_type: 'percentage' | 'flat';
    expires_at?: string;
  };
}
```

**Validation Checks:**
1. ✅ All items exist and are active
2. ✅ Stock available for all requested quantities
3. ✅ Coupon valid (if provided)
4. ✅ Cart not empty
5. ✅ Pincode serviceable (if address provided)

**Error Responses:**

```typescript
// Stock unavailable
{
  valid: false,
  errors: [{
    type: 'stock',
    message: 'Insufficient stock for SKU-123. Available: 2, Requested: 5',
    details: { sku: 'SKU-123', available: 2, requested: 5 }
  }]
}

// Coupon expired
{
  valid: false,
  errors: [{
    type: 'coupon',
    message: 'Coupon code EXPIRED has expired',
    details: { code: 'EXPIRED', expires_at: '2026-01-20T00:00:00Z' }
  }]
}
```

---

## Unified Auth Modal

### Component Structure

```typescript
// components/auth/UnifiedAuthModal.tsx
interface UnifiedAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: (authType: 'login' | 'signup' | 'guest') => void;
  redirectAfterAuth?: string;
  defaultTab?: 'login' | 'signup' | 'guest';
}

type AuthTab = 'login' | 'signup' | 'guest';
type AuthStep = 'mobile' | 'otp' | 'complete';
```

### Tab Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Sign In] [Sign Up] [Guest Checkout]                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Content based on selected tab:                         │
│                                                          │
│  Tab 1: Sign In                                         │
│  ├─ Step 1: Enter Mobile                                │
│  ├─ Step 2: Enter OTP                                   │
│  └─ Step 3: Success → Redirect                          │
│                                                          │
│  Tab 2: Sign Up                                         │
│  ├─ Step 1: Enter Mobile                                │
│  ├─ Step 2: Enter OTP + Name + Email                   │
│  └─ Step 3: Success → Auto-login → Redirect             │
│                                                          │
│  Tab 3: Guest Checkout                                  │
│  └─ Click "Continue as Guest" → Close Modal            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### State Management

```typescript
interface AuthModalState {
  activeTab: AuthTab;
  step: AuthStep;
  mobile: string;
  otp: string;
  firstName: string;
  lastName: string;
  email: string;
  loading: boolean;
  error: string | null;
  otpSent: boolean;
  otpSentAt: Date | null;
  otpExpiresAt: Date | null;
}
```

### Sign In Flow

```typescript
async function handleSignIn() {
  // Step 1: Send OTP
  const otpResponse = await fetch('/api/auth/customer/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile: normalizedMobile }),
  });
  
  if (!otpResponse.ok) {
    setError('Failed to send OTP');
    return;
  }
  
  setStep('otp');
  setOtpSent(true);
  setOtpSentAt(new Date());
  setOtpExpiresAt(new Date(Date.now() + 5 * 60 * 1000)); // 5 min expiry
  
  // Step 2: Verify OTP
  const verifyResponse = await fetch('/api/auth/customer/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile, otp }),
  });
  
  if (!verifyResponse.ok) {
    setError('Invalid OTP');
    return;
  }
  
  // Step 3: Login
  const loginResult = await loginAction(formData);
  
  if (loginResult.success) {
    onAuthSuccess('login');
    onClose();
  }
}
```

### Sign Up Flow

```typescript
async function handleSignUp() {
  // Step 1: Send OTP (same as sign in)
  // Step 2: Verify OTP + Collect Name + Email
  // Step 3: Create account
  const signupResult = await signupAction(formData);
  
  if (signupResult.success) {
    // Auto-login after signup
    await loginAction(formData);
    onAuthSuccess('signup');
    onClose();
  }
}
```

### Guest Checkout Flow

```typescript
function handleGuestCheckout() {
  // No authentication required
  // Store guest session in localStorage
  const guestSession = {
    type: 'guest',
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  };
  
  localStorage.setItem('zeynora_guest_session', JSON.stringify(guestSession));
  
  onAuthSuccess('guest');
  onClose();
}
```

---

## Guest Session Handling

### Session Storage Strategy

**Purpose:** Persist guest cart and order data across page refreshes

**Storage Keys:**

```typescript
// Guest session metadata
localStorage.setItem('zeynora_guest_session', JSON.stringify({
  type: 'guest',
  createdAt: '2026-01-26T10:00:00Z',
  expiresAt: '2026-01-27T10:00:00Z', // 24h TTL
  phone: '9876543210', // Optional, for order tracking
}));

// Guest cart (synced with Zustand store)
localStorage.setItem('zeynora_guest_cart', JSON.stringify(cartItems));

// Pending order (if order created but payment pending)
localStorage.setItem('zeynora_pending_order', JSON.stringify({
  orderId: 'uuid',
  orderNumber: 'ZYN-20260126-0001',
  createdAt: '2026-01-26T10:00:00Z',
  expiresAt: '2026-01-26T10:30:00Z', // 30 min TTL
}));
```

### Session Restoration

```typescript
// lib/session/guest-session.ts
export function restoreGuestSession(): GuestSession | null {
  const sessionData = localStorage.getItem('zeynora_guest_session');
  
  if (!sessionData) return null;
  
  const session = JSON.parse(sessionData) as GuestSession;
  
  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    clearGuestSession();
    return null;
  }
  
  return session;
}

export function clearGuestSession() {
  localStorage.removeItem('zeynora_guest_session');
  localStorage.removeItem('zeynora_guest_cart');
  localStorage.removeItem('zeynora_pending_order');
}
```

### Order Tracking (Guest)

**Problem:** Guest orders need to be trackable without account

**Solution:** Phone number + Order number lookup

```typescript
// app/api/orders/track/guest/route.ts
interface GuestOrderTrackingRequest {
  order_number: string;
  phone: string; // 10 digits
}

interface GuestOrderTrackingResponse {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    shipping_status: string;
    created_at: string;
    items: OrderItem[];
  };
  error?: string;
}
```

**UX Flow:**
1. Guest completes checkout
2. Receives order number via email/SMS
3. Can track order using order number + phone
4. No login required

---

## Coupon Validation Flow

### Real-Time Validation

**API:** `POST /api/coupons/validate`

```typescript
interface CouponValidationRequest {
  code: string;
  subtotal: number; // For min_order_amount check
}

interface CouponValidationResponse {
  valid: boolean;
  coupon?: {
    code: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    min_order_amount: number;
    expires_at: string | null;
    usage_limit: number | null;
    used_count: number;
  };
  discount_amount: number; // Calculated discount
  final_amount: number; // subtotal - discount_amount
  errors?: Array<{
    type: 'invalid' | 'expired' | 'min_amount' | 'usage_limit' | 'inactive';
    message: string;
  }>;
}
```

### Validation Rules

1. ✅ **Code exists** and is active
2. ✅ **Not expired** (if `expires_at` set)
3. ✅ **Within usage limit** (if `usage_limit` set)
4. ✅ **Meets minimum order amount** (if `min_order_amount` set)
5. ✅ **Not already used** (per-user limit, if applicable)

### Client-Side Flow

```typescript
// components/checkout/CouponInput.tsx
async function validateCoupon(code: string) {
  setLoading(true);
  setError(null);
  
  const response = await fetch('/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({
      code: code.toUpperCase().trim(),
      subtotal: cartSubtotal,
    }),
  });
  
  const result = await response.json();
  
  if (result.valid) {
    setAppliedCoupon(result.coupon);
    setDiscountAmount(result.discount_amount);
    setFinalAmount(result.final_amount);
  } else {
    setError(result.errors[0].message);
  }
  
  setLoading(false);
}
```

### Server-Side Re-Validation

**Before Order Creation:** Re-validate coupon to prevent race conditions

```typescript
// app/api/checkout/create-order/route.ts
async function validateCouponBeforeOrder(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();
  
  if (!coupon) {
    return { valid: false, error: 'Invalid coupon code' };
  }
  
  // Check expiration
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'Coupon has expired' };
  }
  
  // Check usage limit
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
    return { valid: false, error: 'Coupon usage limit reached' };
  }
  
  // Check minimum order amount
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount ₹${coupon.min_order_amount} required`,
    };
  }
  
  return { valid: true, coupon };
}
```

---

## Edge Cases & Error Handling

### Edge Case 1: Stock Changes During Checkout

**Scenario:** User adds item to cart → Stock available → User proceeds to checkout → Stock sold out → User submits order

**Solution:** Server-side validation before order creation

```typescript
// app/api/checkout/create-order/route.ts
async function validateStockBeforeOrder(items: CartItem[]) {
  const stockChecks = await Promise.all(
    items.map(async (item) => {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock, sku')
        .eq('sku', item.sku)
        .single();
      
      if (!variant) {
        return {
          sku: item.sku,
          valid: false,
          error: 'Product variant not found',
        };
      }
      
      const available = variant.stock ?? 0;
      const requested = item.quantity;
      
      if (available < requested) {
        return {
          sku: item.sku,
          valid: false,
          error: `Insufficient stock. Available: ${available}, Requested: ${requested}`,
          available,
          requested,
        };
      }
      
      return { sku: item.sku, valid: true };
    })
  );
  
  const invalidItems = stockChecks.filter((check) => !check.valid);
  
  if (invalidItems.length > 0) {
    return {
      valid: false,
      errors: invalidItems,
    };
  }
  
  return { valid: true };
}
```

**UX Handling:**

```typescript
// Frontend error handling
if (orderResponse.errors?.some(e => e.type === 'stock')) {
  // Show error modal
  setError({
    title: 'Stock Unavailable',
    message: 'Some items in your cart are no longer available.',
    items: orderResponse.errors.filter(e => e.type === 'stock'),
    action: 'Update Cart',
    onAction: () => router.push('/cart'),
  });
  
  // Remove unavailable items from cart
  const unavailableSkus = orderResponse.errors
    .filter(e => e.type === 'stock')
    .map(e => e.sku);
  
  removeItemsFromCart(unavailableSkus);
}
```

---

### Edge Case 2: Expired Coupon During Checkout

**Scenario:** User applies coupon → Coupon valid → User fills form (takes 5 min) → Coupon expires → User submits order

**Solution:** Re-validate coupon before order creation

```typescript
// Re-validate coupon with timestamp check
const couponValid = await validateCouponBeforeOrder(
  couponCode,
  subtotal
);

if (!couponValid.valid) {
  return NextResponse.json({
    success: false,
    error: 'Coupon validation failed',
    details: couponValid.error,
    coupon_expired: couponValid.error?.includes('expired'),
  }, { status: 400 });
}
```

**UX Handling:**

```typescript
if (orderResponse.coupon_expired) {
  // Show warning, remove coupon, recalculate total
  setError({
    title: 'Coupon Expired',
    message: 'The coupon code has expired. Your order total has been updated.',
    action: 'Continue',
    onAction: () => {
      removeCoupon();
      recalculateTotal();
      retryOrderCreation();
    },
  });
}
```

---

### Edge Case 3: Session Loss

**Scenario:** User adds items to cart → Browser closes → User returns → Cart empty

**Solution:** Persistent cart storage + restoration

```typescript
// lib/store/cart.ts (Zustand store with persistence)
import { persist } from 'zustand/middleware';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      // ... other actions
    }),
    {
      name: 'zeynora_cart', // localStorage key
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
```

**Guest Session Loss:**

```typescript
// Restore guest session on app load
useEffect(() => {
  const guestSession = restoreGuestSession();
  
  if (guestSession) {
    // Restore cart from localStorage
    const savedCart = localStorage.getItem('zeynora_guest_cart');
    if (savedCart) {
      const cartItems = JSON.parse(savedCart);
      useCartStore.getState().setItems(cartItems);
    }
    
    // Check for pending order
    const pendingOrder = localStorage.getItem('zeynora_pending_order');
    if (pendingOrder) {
      const order = JSON.parse(pendingOrder);
      // Show "Complete Payment" banner
      setPendingOrder(order);
    }
  }
}, []);
```

---

### Edge Case 4: Payment Failure After Order Creation

**Scenario:** Order created → Payment gateway fails → Order in "pending" state

**Solution:** Order recovery flow

```typescript
// app/api/orders/recover/route.ts
interface OrderRecoveryRequest {
  order_number: string;
  phone: string; // For guest orders
}

interface OrderRecoveryResponse {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    payment_status: 'pending' | 'paid' | 'failed';
    razorpay_order_id: string | null;
    total_amount: number;
  };
  can_retry_payment: boolean;
  payment_url?: string; // Razorpay checkout URL
}
```

**UX Flow:**

1. User sees "Payment Failed" page
2. Shows order details
3. "Retry Payment" button
4. Re-opens Razorpay checkout with existing order

---

### Edge Case 5: Concurrent Cart Modifications

**Scenario:** User has cart open in two tabs → Modifies cart in Tab 1 → Tab 2 still shows old cart

**Solution:** Cart synchronization

```typescript
// Listen for storage events (cross-tab sync)
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'zeynora_cart') {
      const newCart = e.newValue ? JSON.parse(e.newValue) : [];
      useCartStore.getState().setItems(newCart);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

## UX States & Messaging

### Loading States

```typescript
interface CheckoutState {
  // Validation states
  validatingStock: boolean;
  validatingCoupon: boolean;
  validatingAddress: boolean;
  
  // Submission states
  creatingOrder: boolean;
  processingPayment: boolean;
  
  // Overall state
  loading: boolean;
}
```

**Loading Indicators:**

```tsx
{loading && (
  <div className="flex items-center justify-center p-4">
    <Spinner className="w-6 h-6 text-gold animate-spin" />
    <span className="ml-2 text-sm text-gray-600">
      {validatingStock && 'Checking stock availability...'}
      {validatingCoupon && 'Validating coupon...'}
      {creatingOrder && 'Creating your order...'}
      {processingPayment && 'Processing payment...'}
    </span>
  </div>
)}
```

---

### Error States

```typescript
interface CheckoutError {
  type: 'stock' | 'coupon' | 'address' | 'payment' | 'network' | 'validation';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
}
```

**Error Messages:**

```typescript
const ERROR_MESSAGES = {
  stock_unavailable: {
    title: 'Stock Unavailable',
    message: 'Some items in your cart are no longer available. Please update your cart.',
    action: { label: 'Update Cart', onClick: () => router.push('/cart') },
  },
  coupon_expired: {
    title: 'Coupon Expired',
    message: 'The coupon code has expired. Your order total has been updated.',
    action: { label: 'Continue', onClick: () => removeCoupon() },
  },
  coupon_invalid: {
    title: 'Invalid Coupon',
    message: 'The coupon code is invalid or does not meet the minimum order requirement.',
    dismissible: true,
  },
  address_invalid: {
    title: 'Invalid Address',
    message: 'Please check your shipping address. Pincode may not be serviceable.',
    dismissible: true,
  },
  payment_failed: {
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again.',
    action: { label: 'Retry Payment', onClick: () => retryPayment() },
  },
  network_error: {
    title: 'Connection Error',
    message: 'Unable to connect to server. Please check your internet connection.',
    action: { label: 'Retry', onClick: () => retry() },
  },
};
```

**Error Display Component:**

```tsx
<ErrorBanner
  error={error}
  onDismiss={() => setError(null)}
  onAction={error.action?.onClick}
/>
```

---

### Success States

```typescript
interface CheckoutSuccess {
  order_id: string;
  order_number: string;
  payment_status: 'paid' | 'pending';
  redirect_url?: string;
}
```

**Success Messages:**

```tsx
{success && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-center">
      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
      <div>
        <h3 className="font-semibold text-green-800">Order Placed Successfully!</h3>
        <p className="text-sm text-green-700">
          Order Number: {success.order_number}
        </p>
        {success.payment_status === 'paid' && (
          <p className="text-sm text-green-700 mt-1">
            Payment confirmed. You will receive an email confirmation shortly.
          </p>
        )}
      </div>
    </div>
  </div>
)}
```

---

### Validation States

```typescript
interface FieldValidation {
  field: string;
  valid: boolean;
  error: string | null;
  touched: boolean;
}
```

**Real-Time Validation:**

```tsx
<input
  type="text"
  value={formData.phone}
  onChange={(e) => {
    setFormData({ ...formData, phone: e.target.value });
    validateField('phone', e.target.value);
  }}
  onBlur={() => setTouched({ ...touched, phone: true })}
  className={cn(
    'w-full px-4 py-3 border rounded-lg',
    touched.phone && !validation.phone.valid
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:ring-gold'
  )}
/>
{touched.phone && validation.phone.error && (
  <p className="mt-1 text-sm text-red-600">{validation.phone.error}</p>
)}
```

---

## API Specifications

### 1. Stock Validation API

**Endpoint:** `POST /api/cart/validate-stock`

**Request:**
```typescript
interface ValidateStockRequest {
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}
```

**Response:**
```typescript
interface ValidateStockResponse {
  valid: boolean;
  items: Array<{
    sku: string;
    available: number;
    requested: number;
    status: 'available' | 'insufficient' | 'out_of_stock';
  }>;
  errors: string[];
}
```

---

### 2. Coupon Validation API

**Endpoint:** `POST /api/coupons/validate`

**Request:**
```typescript
interface ValidateCouponRequest {
  code: string;
  subtotal: number;
}
```

**Response:**
```typescript
interface ValidateCouponResponse {
  valid: boolean;
  coupon?: {
    code: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    min_order_amount: number;
    expires_at: string | null;
  };
  discount_amount: number;
  final_amount: number;
  errors?: Array<{
    type: 'invalid' | 'expired' | 'min_amount' | 'usage_limit' | 'inactive';
    message: string;
  }>;
}
```

---

### 3. Checkout Validation API

**Endpoint:** `POST /api/checkout/validate`

**Request:**
```typescript
interface CheckoutValidationRequest {
  items: Array<{
    sku: string;
    quantity: number;
  }>;
  coupon_code?: string;
  pincode?: string; // For serviceability check
}
```

**Response:**
```typescript
interface CheckoutValidationResponse {
  valid: boolean;
  errors: Array<{
    type: 'stock' | 'coupon' | 'cart' | 'serviceability';
    message: string;
    details?: unknown;
  }>;
  stock_status?: Array<{
    sku: string;
    available: number;
    requested: number;
    status: 'available' | 'insufficient' | 'out_of_stock';
  }>;
  coupon_status?: {
    valid: boolean;
    code: string;
    discount_amount: number;
  };
  serviceability?: {
    serviceable: boolean;
    reason?: string;
  };
}
```

---

### 4. Create Order API

**Endpoint:** `POST /api/checkout/create-order`

**Request:**
```typescript
interface CreateOrderRequest {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  items: Array<{
    sku: string;
    product_uid: string;
    name: string;
    size: string;
    quantity: number;
    price: number;
  }>;
  coupon_code?: string;
}
```

**Response:**
```typescript
interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  order_number?: string;
  subtotal?: number;
  discount_amount?: number;
  shipping_fee?: number;
  total_payable?: number;
  payment_gateway?: string;
  razorpay_order_id?: string;
  razorpay_key_id?: string;
  errors?: Array<{
    type: 'stock' | 'coupon' | 'validation';
    message: string;
  }>;
}
```

---

## TypeScript Types

### Complete Type Definitions

```typescript
// types/checkout.ts

// Cart Types
export interface CartItem {
  id: string;
  sku: string;
  product_uid: string;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image_url?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
}

// Stock Validation Types
export interface StockValidationResult {
  valid: boolean;
  items: Array<{
    sku: string;
    available: number;
    requested: number;
    status: 'available' | 'insufficient' | 'out_of_stock';
  }>;
  errors: string[];
}

// Coupon Types
export interface Coupon {
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discount_amount: number;
  final_amount: number;
  errors?: Array<{
    type: 'invalid' | 'expired' | 'min_amount' | 'usage_limit' | 'inactive';
    message: string;
  }>;
}

// Auth Types
export interface AuthSession {
  type: 'logged_in' | 'guest';
  user_id?: string;
  customer_id?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  expiresAt: string;
}

export interface GuestSession extends AuthSession {
  type: 'guest';
  phone?: string;
}

// Checkout Form Types
export interface CheckoutFormData {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}

export interface CheckoutState {
  // Form data
  formData: CheckoutFormData;
  
  // Validation
  validation: {
    customer: Record<string, FieldValidation>;
    address: Record<string, FieldValidation>;
  };
  
  // Applied coupon
  appliedCoupon: Coupon | null;
  discountAmount: number;
  
  // Loading states
  loading: {
    validatingStock: boolean;
    validatingCoupon: boolean;
    creatingOrder: boolean;
    processingPayment: boolean;
  };
  
  // Error state
  error: CheckoutError | null;
  
  // Success state
  success: CheckoutSuccess | null;
}

// Error Types
export interface CheckoutError {
  type: 'stock' | 'coupon' | 'address' | 'payment' | 'network' | 'validation';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
}

// Success Types
export interface CheckoutSuccess {
  order_id: string;
  order_number: string;
  payment_status: 'paid' | 'pending';
  redirect_url?: string;
}

// Field Validation Types
export interface FieldValidation {
  valid: boolean;
  error: string | null;
  touched: boolean;
}
```

---

## Implementation Checklist

### Phase 1: Stock Validation

- [ ] Create `POST /api/cart/validate-stock` endpoint
- [ ] Implement client-side stock validation hook
- [ ] Add real-time stock check on cart page load
- [ ] Add stock validation before checkout button
- [ ] Show stock warnings in cart UI
- [ ] Implement server-side stock validation in order creation

---

### Phase 2: Unified Auth Modal

- [ ] Create `UnifiedAuthModal` component
- [ ] Implement tab switching (Login/Signup/Guest)
- [ ] Implement OTP flow for login
- [ ] Implement OTP flow for signup
- [ ] Implement guest checkout flow
- [ ] Add error handling and loading states
- [ ] Add session persistence after auth

---

### Phase 3: Guest Session Handling

- [ ] Implement guest session storage (localStorage)
- [ ] Add session restoration on app load
- [ ] Implement guest cart persistence
- [ ] Add pending order recovery
- [ ] Create guest order tracking API
- [ ] Add session expiration handling

---

### Phase 4: Coupon Validation

- [ ] Create `POST /api/coupons/validate` endpoint
- [ ] Implement real-time coupon validation
- [ ] Add coupon input component with validation
- [ ] Show discount calculation in UI
- [ ] Implement server-side coupon re-validation
- [ ] Handle expired coupon edge case

---

### Phase 5: Edge Cases & Error Handling

- [ ] Implement stock change detection
- [ ] Add expired coupon handling
- [ ] Implement session loss recovery
- [ ] Add payment failure recovery
- [ ] Implement cart synchronization (cross-tab)
- [ ] Add comprehensive error messages

---

### Phase 6: UX States & Messaging

- [ ] Create loading state components
- [ ] Create error banner component
- [ ] Create success message component
- [ ] Add field-level validation feedback
- [ ] Implement form validation states
- [ ] Add accessibility (ARIA labels, keyboard navigation)

---

### Phase 7: Testing

- [ ] Unit tests for stock validation
- [ ] Unit tests for coupon validation
- [ ] Integration tests for checkout flow
- [ ] E2E tests for complete checkout
- [ ] Edge case testing (stock change, expired coupon)
- [ ] Session persistence testing

---

## Summary

### Key Features

✅ **Stock Validation** — Real-time + server-side validation  
✅ **Unified Auth** — Single modal for login/signup/guest  
✅ **Guest Sessions** — Persistent cart and order tracking  
✅ **Coupon Validation** — Real-time validation with expiry handling  
✅ **Edge Cases** — Comprehensive error handling  
✅ **UX States** — Clear loading, error, and success states  
✅ **TypeScript Safety** — Full type coverage

### Production Readiness

🟢 **Ready for Implementation** — All flows defined  
🟢 **Error Handling** — All edge cases covered  
🟢 **Type Safety** — Complete TypeScript definitions  
🟢 **UX Optimized** — Clear user feedback at every step

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-26  
**Status:** ✅ Ready for Implementation
