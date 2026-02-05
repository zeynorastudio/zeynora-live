# Checkout Customer Authentication System

## Overview

This document describes the unified OTP-based customer identity system for checkout. The system allows checkout to proceed seamlessly for returning customers, new customers, and guests using a single flow backed by the `customers` table.

## Architecture

### Core Principles

1. **Single Source of Truth**: The `customers` table is the ONLY source for storefront customer identity
2. **No `users` Table Dependency**: Checkout NEVER queries or depends on the admin `users` table
3. **Authentication Independence**: Checkout can ALWAYS proceed, regardless of authentication status
4. **OTP-Based Identity**: Email OTP is the primary authentication mechanism

### State Machine

The checkout authentication follows a simple state machine:

```
idle → otp_sent → otp_verified → customer_resolved
                              ↘
                                guest (Continue as Guest)
```

## Flow Details

### 1. Single OTP Flow

#### Initiating OTP
- **Endpoint**: `POST /api/auth/customer/send-otp`
- **Input**: `{ email: string }`
- **Process**:
  1. Validates email format
  2. Generates 6-digit OTP
  3. Stores hashed OTP in `customer_auth_otps` table
  4. Sends OTP via email (Resend service)
  5. Rate limited: max 3 resends per hour per email
  6. OTP validity: 5 minutes

#### Verifying OTP
- **Endpoint**: `POST /api/auth/customer/verify-otp`
- **Input**: `{ email: string, otp: string }`
- **Process**:
  1. Validates OTP format (6 digits)
  2. Verifies OTP hash against stored record
  3. Queries `customers` table by email
  4. Returns customer profile if exists, or `requires_signup: true`

#### After OTP Verification

**Returning Customer (customer exists)**:
```json
{
  "success": true,
  "customer_exists": true,
  "requires_signup": false,
  "customer_id": "uuid",
  "customer": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+919876543210",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```
- UI shows: "Welcome back, {first_name}!"
- Checkout proceeds with `customer_id`

**New Customer (customer doesn't exist)**:
```json
{
  "success": true,
  "customer_exists": false,
  "requires_signup": true,
  "customer_id": null,
  "email": "newuser@example.com"
}
```
- UI shows: "Complete your profile"
- Quick signup modal collects:
  - First name (required)
  - Last name (required)
  - Phone (optional)
- Customer record created via `POST /api/auth/customer/complete-login`

### 2. Guest Checkout

Guest checkout allows users to complete purchases without authentication:

1. User clicks "Continue as Guest" on checkout auth modal
2. System generates `guest_session_id`: `guest_{timestamp}_{random}`
3. Optional: Collect email/phone for order updates
4. Checkout proceeds with `guest_session_id` instead of `customer_id`

**Order Creation for Guests**:
- `customer_id` = `null`
- `guest_phone` = phone from form
- `guest_email` = email from form
- `metadata.guest_session_id` = generated session ID
- `metadata.checkout_source` = "guest"

### 3. Checkout Integration

#### Order Creation API
**Endpoint**: `POST /api/checkout/create-order`

**Input Schema**:
```typescript
{
  customer: {
    name: string;      // Required
    phone: string;     // Required (10 digits)
    email?: string;    // Optional
  };
  address: {
    line1: string;     // Required
    line2?: string;    // Optional
    city: string;      // Required
    state: string;     // Required
    pincode: string;   // Required (6 digits)
    country?: string;  // Default: "India"
  };
  items: Array<{
    sku: string;
    product_uid: string;
    name: string;
    size: string;
    quantity: number;
    price: number;
  }>;
  customer_id?: string;        // From OTP verification
  guest_session_id?: string;   // For guest checkout
  checkout_source?: string;    // "otp_verified" | "guest" | "direct"
}
```

**Customer Resolution Priority**:
1. `customer_id` from request (OTP-verified checkout)
2. Logged-in user via Supabase Auth
3. Guest checkout (no customer_id)

**Critical Design**: Checkout NEVER fails due to authentication. If customer lookup fails, order is created as guest.

### 4. Frontend Components

#### CheckoutAuthModal
Located at: `components/checkout/CheckoutAuthModal.tsx`

States:
- `choose`: Initial choice (Sign In vs Guest)
- `email`: Email input for OTP
- `otp`: OTP verification
- `signup`: New customer profile collection
- `welcome`: Success state for returning customer
- `guest_form`: Guest checkout form

#### LoginModal
Located at: `components/auth/LoginModal.tsx`

Updated to support:
- Email-based OTP (replacing mobile)
- Checkout mode integration
- Customer profile return

#### CartDrawer Integration
Located at: `components/cart/CartDrawer.tsx`

Flow:
1. User clicks "Checkout"
2. `CheckoutAuthModal` opens
3. User authenticates OR continues as guest
4. `onCustomerResolved` callback returns customer/guest session
5. `GuestCheckoutForm` receives `checkoutSession` prop
6. Form pre-fills customer info if available
7. Order created with `customer_id` or `guest_session_id`

## Edge Cases Handled

### OTP Failure
- User can retry OTP entry (max 3 attempts before lockout)
- 15-minute lockout after failed attempts
- User can request OTP resend (max 3 per hour)
- Guest checkout always available as fallback

### Abandoned Authentication
- User can close auth modal at any time
- Cart is preserved
- User can restart checkout flow
- No partial state corruption

### Guest Fallback
- If OTP service fails, guest checkout remains available
- If customer lookup fails, order created as guest
- Payment and email systems work for both customer and guest orders

### Session Expiry
- OTP expires after 5 minutes
- User can request new OTP
- No data loss on expiry

## Type Definitions

Located at: `types/checkout-auth.ts`

```typescript
// Auth state machine
type CheckoutAuthState = "idle" | "otp_sent" | "otp_verified" | "customer_resolved";

// Customer resolution outcome
type CustomerResolutionType = "returning_customer" | "new_customer" | "guest";

// Customer profile
interface CheckoutCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// Guest session
interface GuestSession {
  guest_session_id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

// Checkout session (passed to order creation)
interface CheckoutSession {
  customer_id: string | null;
  guest_session_id: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  source: "otp_verified" | "guest" | "logged_in";
}
```

## API Endpoints (Existing - No New Routes)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/customer/send-otp` | POST | Send OTP to email |
| `/api/auth/customer/verify-otp` | POST | Verify OTP, return customer profile |
| `/api/auth/customer/complete-login` | POST | Create session OR create new customer |
| `/api/checkout/create-order` | POST | Create order with customer_id or guest_session_id |

## Why Checkout Doesn't Depend on Authentication

1. **Resilience**: Authentication service failures don't block revenue
2. **Conversion**: Friction-free guest checkout improves conversion
3. **Flexibility**: Users can choose their preferred flow
4. **Data Integrity**: Orders always have tracking info (email/phone)
5. **Future Linking**: Guest orders can be linked to accounts later

## Database Schema

### customers table
```sql
customers (
  id UUID PRIMARY KEY,
  auth_uid UUID UNIQUE NULL,  -- Links to Supabase Auth (optional)
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NULL,            -- Format: +91XXXXXXXXXX
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### orders table (relevant fields)
```sql
orders (
  ...
  customer_id UUID NULL REFERENCES customers(id),
  guest_phone TEXT NULL,
  guest_email TEXT NULL,
  metadata JSONB {
    checkout_source: "otp_verified" | "guest" | "logged_in",
    guest_session_id: string | null,
    ...
  }
)
```

## Testing Checklist

- [ ] OTP send works for valid email
- [ ] OTP verify returns customer profile for existing customer
- [ ] OTP verify returns requires_signup for new customer
- [ ] New customer creation works via complete-login
- [ ] Guest checkout works without OTP
- [ ] Order created with customer_id for OTP-verified checkout
- [ ] Order created without customer_id for guest checkout
- [ ] Form pre-fills customer data when available
- [ ] Welcome back message shows for returning customers
- [ ] Complete profile message shows for new customers
- [ ] Payment works for both customer and guest orders
- [ ] Order confirmation email works for both flows

## Migration Notes

This refactoring:
- Does NOT create new API routes
- Does NOT modify the `users` table
- Does NOT change payment logic
- Does NOT change webhook logic
- Does NOT change stock logic
- Does NOT affect admin functionality
- ONLY uses the `customers` table for identity
- Maintains backward compatibility with existing orders
