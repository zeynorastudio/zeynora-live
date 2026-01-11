export type UserRole = "super_admin" | "admin" | "staff" | "customer";

// Order status enum for Phase 3.1 + Phase 3.2
export type OrderStatus = "created" | "confirmed" | "processing" | "completed" | "cancelled" | "paid"; // Phase 3.2: Added 'paid'

// Payment status enum
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

// Shipping status enum
export type ShippingStatus = 
  | "pending" 
  | "processing" 
  | "shipped" 
  | "in_transit" 
  | "out_for_delivery" 
  | "delivered" 
  | "rto" 
  | "returned" 
  | "cancelled";


