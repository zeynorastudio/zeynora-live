/**
 * Phase 3.1 — Order Types
 * 
 * Type definitions for orders, including new fields for:
 * - Guest checkout support
 * - Customer linking
 * - Internal shipping cost tracking
 * - Order status lifecycle
 */

import { OrderStatus, PaymentStatus, ShippingStatus } from "./roles";

// Customer snapshot stored in order metadata
export interface CustomerSnapshot {
  name: string;
  phone: string;
  email: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  snapshot_taken_at: string;
}

// Order item snapshot stored in metadata
export interface OrderItemSnapshot {
  sku: string;
  product_uid: string;
  product_name: string;
  size: string;
  quantity: number;
  selling_price: number;
  cost_price: number;
  subtotal: number;
}

// Shipping metadata
export interface ShippingMetadata {
  cost_calculated: number;
  courier_name: string | null;
  estimated_days: number | null;
  calculation_success: boolean;
}

// Full order metadata structure
export interface OrderMetadata {
  customer_snapshot: CustomerSnapshot;
  items_snapshot: OrderItemSnapshot[];
  shipping: ShippingMetadata;
  checkout_source: "logged_in" | "guest";
  // Additional fields can be added here
  [key: string]: unknown;
}

// Order item as stored in order_items table
export interface OrderItem {
  id: string;
  order_id: string;
  product_uid: string | null;
  variant_id: string | null;
  sku: string | null;
  name: string | null;
  quantity: number;
  price: number;
  cost_price?: number;
  subtotal: number;
  created_at: string;
}

// Full order record
export interface Order {
  id: string;
  order_number: string;
  
  // Customer linking (Phase 3.1)
  customer_id: string | null; // Links to customers table
  user_id: string | null; // Legacy link to users table
  guest_phone: string | null; // For guest order tracking
  guest_email: string | null;
  
  // Status fields
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_status: ShippingStatus;
  
  // Financial fields
  currency: string;
  subtotal: number;
  shipping_fee: number; // Charged to customer (0 for free shipping)
  internal_shipping_cost: number; // What we pay to carrier
  assumed_weight?: number; // Phase 3.4: Assumed weight (kg) used for shipping calculation
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  
  // Optional fields
  coupon_code: string | null;
  shiprocket_shipment_id: string | null;
  billing_address_id: string | null;
  shipping_address_id: string | null;
  
  // Payment tracking (Phase 3.2)
  payment_provider: string | null;
  payment_provider_response: Record<string, unknown> | null;
  razorpay_order_id: string | null; // Razorpay order ID (e.g., order_xxx)
  payment_method: string | null; // Payment method (card, netbanking, wallet, upi)
  paid_at: string | null; // Timestamp when payment was captured
  
  // Metadata with snapshots
  metadata: OrderMetadata | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Nested items (when joined)
  items?: OrderItem[];
}

// Order creation input
export interface CreateOrderInput {
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
}

// Order creation response (Phase 3.2)
export interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  order_number?: string;
  subtotal?: number;
  shipping_fee?: number;
  total_payable?: number;
  payment_gateway?: string;
  razorpay_order_id?: string; // Razorpay order ID for frontend checkout
  razorpay_key_id?: string; // Razorpay key ID (public key) for frontend
  created_at?: string;
  next_step?: string;
  error?: string;
  details?: unknown;
}

// Admin orders list response
export interface AdminOrdersResponse {
  success: boolean;
  data: Partial<Order>[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  role: string;
  error?: string;
}

// Order filters for admin queries
export interface OrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  order_status?: OrderStatus;
  payment_status?: PaymentStatus;
  shipping_status?: ShippingStatus;
  from_date?: string;
  to_date?: string;
}

