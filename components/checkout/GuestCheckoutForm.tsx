"use client";

/**
 * Checkout Form Component
 * 
 * Unified checkout form that supports:
 * - Customer checkout (with customer_id from OTP verification)
 * - Guest checkout (with guest_session_id)
 * - Pre-fills customer info when available
 * 
 * Creates order BEFORE payment gateway is triggered.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore, CartItem } from "@/lib/store/cart";
import type { CheckoutSession } from "@/types/checkout-auth";

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    contact?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Stock validation error type (matches backend response)
interface StockValidationError {
  sku: string;
  requested_quantity: number;
  available_quantity: number;
  reason: "INSUFFICIENT_STOCK" | "VARIANT_NOT_FOUND";
}

interface GuestCheckoutFormProps {
  onOrderCreated?: (orderId: string, orderNumber: string) => void;
  onError?: (error: string) => void;
  onStockValidationError?: (errors: StockValidationError[]) => void;
  checkoutSession?: CheckoutSession | null;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export default function GuestCheckoutForm({ 
  onOrderCreated, 
  onError,
  onStockValidationError,
  checkoutSession,
}: GuestCheckoutFormProps) {
  const router = useRouter();
  const { items: cartItems, clearCart } = useCartStore();
  const hasInitialized = useRef({ form: false });
  
  // Initialize form data, pre-fill from checkout session if available
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});

  /**
   * Normalize phone number to E.164 format (+91XXXXXXXXXX)
   * Takes 10-digit input and prepends +91
   * Returns empty string if input is empty/invalid
   */
  const normalizePhoneToE164 = (phoneInput: string): string => {
    if (!phoneInput || !phoneInput.trim()) {
      return "";
    }
    // Remove all non-digits
    const digits = phoneInput.replace(/\D/g, "");
    // Must be exactly 10 digits
    if (digits.length !== 10) {
      return "";
    }
    return `+91${digits}`;
  };

  /**
   * Strip +91 prefix from phone for display in input field
   */
  const stripPhonePrefix = (phoneInput: string | null | undefined): string => {
    if (!phoneInput) return "";
    return phoneInput.replace(/^\+91/, "");
  };

  // Pre-fill form data from checkout session (only once)
  useEffect(() => {
    if (hasInitialized.current.form) return;
    if (!checkoutSession) return;
    
    hasInitialized.current.form = true;
    
    setFormData(prev => ({
      ...prev,
      name: checkoutSession.name || "",
      email: checkoutSession.email || "",
      phone: stripPhonePrefix(checkoutSession.phone),
    }));
  }, [checkoutSession]);

  // NOTE: Razorpay script is loaded globally in app/layout.tsx with beforeInteractive
  // This eliminates Turbopack HMR issues and ensures the SDK is always available

  // Calculate cart total
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    }
    
    // Phone validation: 10 digits
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!phoneDigits || phoneDigits.length < 10) {
      errors.phone = "Valid 10-digit mobile number is required";
    }
    
    // Email validation (optional but must be valid if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!formData.addressLine1.trim()) {
      errors.addressLine1 = "Address is required";
    }
    
    if (!formData.city.trim()) {
      errors.city = "City is required";
    }
    
    if (!formData.state.trim()) {
      errors.state = "State is required";
    }
    
    // Pincode validation: 6 digits
    if (!/^\d{6}$/.test(formData.pincode)) {
      errors.pincode = "Valid 6-digit pincode is required";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("[CHECKOUT] handleSubmit started");
    
    if (!validateForm()) {
      return;
    }
    
    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // HARD GUARD: Only set to true after successful order creation AND Razorpay order ID exists
    let orderCreatedSuccessfully = false;
    
    try {
      // Normalize phone to E.164 format (+91XXXXXXXXXX) before sending to API
      const normalizedPhone = normalizePhoneToE164(formData.phone);
      
      // Prepare order data with customer/guest identification
      const orderData: {
        customer: {
          name: string;
          phone: string;
          email: string;
        };
        address: {
          line1: string;
          line2: string;
          city: string;
          state: string;
          pincode: string;
          country: string;
        };
        items: Array<{
          sku: string;
          product_uid: string;
          name: string;
          size: string;
          quantity: number;
          price: number;
        }>;
        customer_id?: string;
        guest_session_id?: string;
        checkout_source?: string;
      } = {
        customer: {
          name: formData.name.trim(),
          phone: normalizedPhone,
          email: formData.email.trim() || "",
        },
        address: {
          line1: formData.addressLine1.trim(),
          line2: formData.addressLine2.trim() || "",
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          country: formData.country,
        },
        items: cartItems.map((item: CartItem) => ({
          sku: item.sku,
          product_uid: item.product_uid,
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.price,
        })),
      };
      
      // Add customer/guest identification from checkout session
      if (checkoutSession?.customer_id) {
        orderData.customer_id = checkoutSession.customer_id;
        orderData.checkout_source = "otp_verified";
      } else if (checkoutSession?.guest_session_id) {
        orderData.guest_session_id = checkoutSession.guest_session_id;
        orderData.checkout_source = "guest";
      } else {
        orderData.checkout_source = "direct";
      }
      
      // ARCHITECTURAL RESET: Single deterministic API call
      // - Stock validation happens in backend (single call)
      // - Razorpay order created BEFORE DB order in backend
      // - If 409 → stock error, if 500 → payment error, if success → open Razorpay
      console.log("[FLOW] Creating order (single deterministic flow)");
      
      // Create order via API
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      
      console.log("[CHECKOUT] API response status:", response.status, response.ok);
      
      // FAIL-SAFE: Handle HTTP 409 (stock validation failure) explicitly
      if (response.status === 409) {
        const data = await response.json();
        console.log("[FLOW] Stock validation failed (409):", data.invalid_items);
        
        // Call stock validation callback if provided (triggers modal in CartDrawer)
        if (onStockValidationError && data.invalid_items) {
          onStockValidationError(data.invalid_items);
        } else {
          setError("Some items are out of stock. Please update your cart and try again.");
        }
        
        if (onError) {
          onError("Stock validation failed");
        }
        return; // MUST explicitly stop execution - Razorpay must NOT open
      }
      
      const result = await response.json();
      
      // STRICT EARLY RETURN: If response is not OK or result is not successful
      if (!response.ok || !result.success) {
        console.log("[CHECKOUT] Order creation failed:", result.error);
        setError(result.error || "Failed to create order");
        if (onError) {
          onError(result.error || "Failed to create order");
        }
        return; // MUST explicitly stop execution - Razorpay must NOT open
      }
      
      // Phase 3.2: Order created successfully - verify Razorpay order ID exists
      if (!result.razorpay_order_id) {
        console.error("[FLOW] Razorpay order ID missing - order created but Razorpay failed");
        setError("Razorpay order creation failed. Please try again.");
        if (onError) {
          onError("Razorpay order creation failed");
        }
        return; // MUST explicitly stop execution - Razorpay must NOT open
      }
      
      // Set guard flag ONLY after all validations pass
      orderCreatedSuccessfully = true;
      console.log("[FLOW] Order created:", result.order_number);
      console.log("[FLOW] Razorpay order ID:", result.razorpay_order_id);

      // HARD GUARD: Razorpay initialization ONLY if order was created successfully
      if (!orderCreatedSuccessfully) {
        console.error("[CHECKOUT] CRITICAL: Attempted to open Razorpay without successful order creation");
        setError("Order validation failed. Please try again.");
        return;
      }

      // Simple guard - Razorpay is loaded globally in app/layout.tsx with beforeInteractive
      // No polling needed as the script is guaranteed to be available before hydration
      if (typeof window === "undefined" || !window.Razorpay) {
        console.error("[FLOW] Razorpay SDK not available");
        setError("Payment gateway failed to load. Please refresh the page.");
        if (onError) {
          onError("Payment gateway failed to load");
        }
        return;
      }

      console.log("[FLOW] Checkout success → opening Razorpay");
      
      // Initialize Razorpay checkout
      const razorpayOptions = {
        key: result.razorpay_key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: Math.round(result.total_payable * 100), // Convert to paise
        currency: "INR",
        name: "Zeynora",
        description: `Order ${result.order_number}`,
        order_id: result.razorpay_order_id,
        prefill: {
          name: formData.name.trim(),
          contact: normalizedPhone,
          email: formData.email.trim() || undefined,
        },
        theme: {
          color: "#D4AF37", // Gold color
        },
        handler: async (response: RazorpayResponse) => {
          // STRUCTURAL FIX: This handler ONLY fires after Razorpay confirms payment success
          // Redirect happens here, ensuring user sees confirmation page after payment completes
          console.log("[FLOW] Razorpay payment success - payment confirmed");
          console.log("[FLOW] Payment ID:", response.razorpay_payment_id);
          
          // Show processing message
          setError(null);
          
          // Store order info for potential retry/recovery
          if (typeof window !== "undefined") {
            localStorage.setItem("zeynora_pending_order", JSON.stringify({
              order_id: result.order_id,
              order_number: result.order_number,
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              total_payable: result.total_payable,
              created_at: result.created_at,
              payment_status: "processing",
            }));
          }

          // STRUCTURAL FIX: Redirect ONLY after payment success confirmed
          // Webhook will update payment_status to "paid" asynchronously
          // Confirmation page will show correct status once webhook completes
          if (onOrderCreated) {
            console.log("[FLOW] Triggering redirect to confirmation page");
            onOrderCreated(result.order_id, result.order_number);
          }
        },
        modal: {
          ondismiss: () => {
            // User closed Razorpay popup - order remains in DB with payment_status=PENDING
            // Phase 3.2: Order must remain in DB always
            console.log("[CHECKOUT] Razorpay popup closed by user");
            setError("Payment was cancelled. Your order has been saved. You can complete payment later.");
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
      
      setError(null);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      console.error("[CHECKOUT] Error in handleSubmit:", errorMessage);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle input change
  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Indian states for dropdown
  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Chandigarh", "Puducherry", "Ladakh", "Jammu and Kashmir",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Customer Information */}
      <div className="bg-white border border-silver-light rounded-xl p-6">
        <h3 className="text-lg font-semibold text-night mb-4">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-night mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange("name")}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                fieldErrors.name ? "border-red-500" : "border-silver-light"
              }`}
              placeholder="Enter your full name"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-night mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-silver-light bg-offwhite text-silver-dark text-sm">
                +91
              </span>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange("phone")}
                className={`flex-1 px-4 py-2.5 border rounded-r-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                  fieldErrors.phone ? "border-red-500" : "border-silver-light"
                }`}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Email (Optional) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-night mb-1">
              Email <span className="text-silver-dark text-xs">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange("email")}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                fieldErrors.email ? "border-red-500" : "border-silver-light"
              }`}
              placeholder="email@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white border border-silver-light rounded-xl p-6">
        <h3 className="text-lg font-semibold text-night mb-4">Shipping Address</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Address Line 1 */}
          <div className="md:col-span-2">
            <label htmlFor="addressLine1" className="block text-sm font-medium text-night mb-1">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="addressLine1"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange("addressLine1")}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                fieldErrors.addressLine1 ? "border-red-500" : "border-silver-light"
              }`}
              placeholder="House/Flat No., Building Name, Street"
            />
            {fieldErrors.addressLine1 && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.addressLine1}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div className="md:col-span-2">
            <label htmlFor="addressLine2" className="block text-sm font-medium text-night mb-1">
              Address Line 2 <span className="text-silver-dark text-xs">(optional)</span>
            </label>
            <input
              type="text"
              id="addressLine2"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange("addressLine2")}
              className="w-full px-4 py-2.5 border border-silver-light rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors"
              placeholder="Landmark, Area"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-night mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange("city")}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                fieldErrors.city ? "border-red-500" : "border-silver-light"
              }`}
              placeholder="Enter city"
            />
            {fieldErrors.city && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.city}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-night mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange("state")}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                fieldErrors.state ? "border-red-500" : "border-silver-light"
              }`}
            >
              <option value="">Select State</option>
              {indianStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            {fieldErrors.state && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.state}</p>
            )}
          </div>

          {/* Pincode */}
          <div>
            <label htmlFor="pincode" className="block text-sm font-medium text-night mb-1">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange("pincode")}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-colors ${
                fieldErrors.pincode ? "border-red-500" : "border-silver-light"
              }`}
              placeholder="6-digit pincode"
              maxLength={6}
            />
            {fieldErrors.pincode && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.pincode}</p>
            )}
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-night mb-1">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              disabled
              className="w-full px-4 py-2.5 border border-silver-light rounded-lg bg-offwhite text-silver-dark cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white border border-silver-light rounded-xl p-6">
        <h3 className="text-lg font-semibold text-night mb-4">Order Summary</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-silver-dark">Subtotal ({cartItems.length} items)</span>
            <span className="text-night">₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-silver-dark">Shipping</span>
            <span className="text-green-600 font-medium">FREE</span>
          </div>
          <div className="border-t border-silver-light pt-2 mt-2">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-night">Total</span>
              <span className="text-gold-darker">₹{subtotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || cartItems.length === 0}
        className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
          loading || cartItems.length === 0
            ? "bg-silver cursor-not-allowed"
            : "bg-gold hover:bg-gold-darker active:scale-[0.98]"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating Order...
          </span>
        ) : (
          "Proceed to Payment"
        )}
      </button>

      {/* Note about payment */}
      <p className="text-center text-xs text-silver-dark">
        Order will be created. Payment gateway coming in Phase 4.
      </p>
    </form>
  );
}

