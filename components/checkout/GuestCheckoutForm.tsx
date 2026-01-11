"use client";

/**
 * Phase 3.1 — Guest Checkout Form Component
 * 
 * Collects customer information for checkout without requiring login:
 * - Full name (mandatory)
 * - Mobile number (mandatory)
 * - Email (optional)
 * - Address fields
 * 
 * Creates order BEFORE payment gateway is triggered.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore, CartItem } from "@/lib/store/cart";

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface GuestCheckoutFormProps {
  onOrderCreated?: (orderId: string, orderNumber: string) => void;
  onError?: (error: string) => void;
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

export default function GuestCheckoutForm({ onOrderCreated, onError }: GuestCheckoutFormProps) {
  const router = useRouter();
  const { items: cartItems, clearCart } = useCartStore();
  const razorpayLoaded = useRef(false);
  
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

  // Load Razorpay script (Phase 3.2)
  useEffect(() => {
    if (razorpayLoaded.current || typeof window === "undefined") return;

    // Check if already loaded
    if (window.Razorpay) {
      razorpayLoaded.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      razorpayLoaded.current = true;
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

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
    
    if (!validateForm()) {
      return;
    }
    
    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare order data
      const orderData = {
        customer: {
          name: formData.name.trim(),
          phone: formData.phone.replace(/\D/g, ""),
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
      
      // Create order via API
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create order");
      }
      
      // Phase 3.2: Order created successfully - now open Razorpay checkout
      if (!result.razorpay_order_id) {
        throw new Error("Razorpay order creation failed. Please try again.");
      }

      // Wait for Razorpay script to load
      let attempts = 0;
      while (!window.Razorpay && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.Razorpay) {
        throw new Error("Payment gateway failed to load. Please refresh and try again.");
      }

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
          contact: formData.phone.replace(/\D/g, ""),
          email: formData.email.trim() || undefined,
        },
        theme: {
          color: "#D4AF37", // Gold color
        },
        handler: async (response: any) => {
          // Phase 3.2: Frontend success callback - show "Payment processing..."
          // DO NOT finalize order state here - webhook will handle that
          console.log("Razorpay payment response:", response);
          
          // Show processing message
          setError(null);
          
          // Store order info
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

          // Call onOrderCreated callback
          if (onOrderCreated) {
            onOrderCreated(result.order_id, result.order_number);
          }
        },
        modal: {
          ondismiss: () => {
            // User closed Razorpay popup - order remains in DB with payment_status=PENDING
            // Phase 3.2: Order must remain in DB always
            console.log("Razorpay popup closed by user");
            setError("Payment was cancelled. Your order has been saved. You can complete payment later.");
          },
        },
      };

      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
      
      setError(null);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
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

