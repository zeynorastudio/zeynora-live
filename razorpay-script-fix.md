# Razorpay Script Loading Fix for Turbopack

## Overview

This document explains the fix for Razorpay checkout popup failures under Next.js Turbopack by loading the Razorpay script globally with `beforeInteractive` strategy.

---

## Why Turbopack Caused Failure

### The Problem

Under Turbopack (Next.js development bundler), dynamic script injection via `document.createElement("script")` was unreliable:

1. **Hot Module Replacement (HMR) Interference**
   - Turbopack aggressively reloads modules during development
   - Dynamically injected scripts were being removed/reloaded unpredictably
   - The `window.Razorpay` reference became undefined after HMR cycles

2. **Race Conditions**
   - Component mounting/unmounting during fast refresh
   - Script cleanup in `useEffect` return was removing the SDK mid-checkout
   - Polling loops (`while (!window.Razorpay)`) sometimes never resolved

3. **Module Boundary Issues**
   - Turbopack's module isolation meant scripts loaded in one component weren't reliably available in others
   - Multiple components trying to load the same script caused conflicts

### Symptoms

- Razorpay popup failing to open
- "Payment gateway failed to load" errors
- Console errors about undefined `window.Razorpay`
- Intermittent failures (works sometimes, fails other times)
- Failures specifically during development with fast refresh

---

## Why Global Script Loading Fixes It

### The Solution

Load Razorpay SDK once at the root level using Next.js `<Script>` component:

```tsx
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Why This Works

1. **`beforeInteractive` Strategy**
   - Script loads and executes BEFORE Next.js hydration
   - Guarantees `window.Razorpay` is available when any component mounts
   - Not affected by React lifecycle or HMR

2. **Single Load Point**
   - Script loads exactly once per page load
   - No duplicate loading attempts
   - No cleanup/removal logic to interfere

3. **Outside React Lifecycle**
   - Not managed by useEffect or component lifecycle
   - Survives fast refresh and HMR cycles
   - Persistent across all route navigations (SPA)

4. **Native Browser Handling**
   - Browser's native script caching kicks in
   - Subsequent navigations don't re-download
   - Reliable execution order

---

## Why Dynamic Injection Was Removed

### Previous Implementation (Problematic)

```tsx
// ❌ OLD: Dynamic script injection in component
useEffect(() => {
  if (window.Razorpay) return;
  
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = () => { /* ... */ };
  document.body.appendChild(script);
  
  return () => {
    // Cleanup removed script!
    existingScript?.remove();
  };
}, []);
```

### Problems with Dynamic Injection

| Issue | Impact |
|-------|--------|
| Cleanup on unmount | Script removed if component unmounts before checkout completes |
| Multiple components | Each component tried to load its own copy |
| Timing dependencies | Component had to mount first, then wait for script |
| HMR interference | Turbopack would re-run effect, re-inject, cause duplicates |
| Polling overhead | CPU cycles wasted in `while` loops waiting for SDK |

### New Implementation (Simplified)

```tsx
// ✅ NEW: Simple guard check
if (typeof window === "undefined" || !window.Razorpay) {
  setError("Payment gateway failed to load. Please refresh the page.");
  return;
}

// SDK is guaranteed available - proceed immediately
const razorpay = new window.Razorpay(options);
razorpay.open();
```

---

## Why This Is Production-Safe

### 1. Script Caching

- Browser caches `checkout.razorpay.com/v1/checkout.js`
- Subsequent page loads use cached version
- No performance penalty for global loading

### 2. No Duplicate Loads

- `beforeInteractive` runs exactly once
- Next.js Script component handles deduplication
- Multiple route navigations don't re-load

### 3. Fail-Safe Guard

Even with global loading, we keep a simple guard:

```tsx
if (typeof window === "undefined" || !window.Razorpay) {
  setError("Payment gateway failed to load. Please refresh the page.");
  return;
}
```

This handles edge cases:
- Server-side rendering (SSR) context
- Network failure loading the script
- Ad blockers blocking the domain

### 4. No Business Logic Changes

- Payment flow unchanged
- API routes unchanged
- Webhook handling unchanged
- Order creation unchanged
- Only script loading mechanism changed

### 5. TypeScript Safety

Global declaration ensures type safety:

```typescript
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `app/layout.tsx` | Added global Razorpay script with `beforeInteractive` |
| `components/checkout/GuestCheckoutForm.tsx` | Removed dynamic script loading useEffect, removed polling loop |
| `components/account/OrderDetailClient.tsx` | Removed `loadRazorpay()` function, use global `window.Razorpay` |

---

## Verification Checklist

- [x] Razorpay popup opens immediately on checkout
- [x] No Turbopack/HMR runtime errors
- [x] No duplicate script loads in Network tab
- [x] No polling loops (`while` statements for Razorpay)
- [x] Works after fast refresh during development
- [x] Works in production build
- [x] TypeScript compiles without errors
- [x] ESLint passes

---

## Rollback Plan

If issues occur, revert to dynamic loading:

1. Remove `<Script>` from `app/layout.tsx`
2. Restore `useEffect` script loading in components
3. Restore polling loops

However, this should not be necessary as the global loading approach is the recommended pattern for payment SDKs.

---

## Related Documentation

- [Next.js Script Component](https://nextjs.org/docs/app/api-reference/components/script)
- [Razorpay Web Integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
- [beforeInteractive Strategy](https://nextjs.org/docs/app/api-reference/components/script#beforeinteractive)
