/**
 * Phase 4.3 — Returns System Types
 * TypeScript types for return requests and return items
 */

export type ReturnStatus = 
  | "requested"
  | "approved"
  | "pickup_scheduled"
  | "in_transit"
  | "received"
  | "credited"
  | "rejected"
  | "cancelled";

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_item_id: string;
  quantity: number;
  created_at: string;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  customer_id: string | null;
  guest_mobile: string | null;
  status: ReturnStatus;
  reason: string;
  requested_at: string;
  approved_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  admin_notes: string | null;
  pickup_retry_count: number;
  shiprocket_pickup_id: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data (optional)
  items?: ReturnItem[];
  order?: {
    id: string;
    order_number: string;
    customer_id: string | null;
    guest_phone: string | null;
  };
}

export interface CreateReturnRequestInput {
  order_id: string;
  mobile: string; // For OTP verification
  items: Array<{
    order_item_id: string;
    quantity: number;
  }>;
  reason: string;
}

export interface VerifyReturnOtpInput {
  order_id: string;
  mobile: string;
  otp: string;
}

export interface ApproveReturnInput {
  return_request_id: string;
  admin_notes?: string;
}

export interface RejectReturnInput {
  return_request_id: string;
  admin_notes: string;
}

export interface TriggerPickupInput {
  return_request_id: string;
}

export interface ConfirmReceivedInput {
  return_request_id: string;
  admin_notes?: string;
}









