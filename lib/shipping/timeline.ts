/**
 * Shipping Timeline Helper Functions
 * Pure helper functions for shipping status mapping and display
 */

export type ShippingStatus =
  | "not_shipped"
  | "pending"
  | "processing"
  | "packed"
  | "ready_for_pickup"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "returned"
  | "cancelled";

export interface TimelineEvent {
  status: ShippingStatus;
  timestamp: string;
  updated_by?: string;
  courier?: string | null;
  awb?: string | null;
  notes?: string | null;
}

export interface TimelineDisplayItem {
  label: string;
  status: ShippingStatus;
  timestamp: string;
  completed: boolean;
  icon: "check" | "clock" | "package" | "truck" | "alert" | "x";
  courier?: string | null;
  awb?: string | null;
  notes?: string | null;
}

/**
 * Map internal shipping status to display label
 */
export function getShippingStatusLabel(status: ShippingStatus | string | null): string {
  if (!status) return "Not Shipped";

  const statusMap: Record<string, string> = {
    not_shipped: "Not Shipped",
    pending: "Pending",
    processing: "Processing",
    packed: "Packed",
    ready_for_pickup: "Ready for Pickup",
    shipped: "Shipped",
    in_transit: "In Transit",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    delayed: "Delayed",
    returned: "Returned",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get icon type for shipping status
 */
export function getShippingStatusIcon(status: ShippingStatus | string | null): TimelineDisplayItem["icon"] {
  if (!status) return "clock";

  const iconMap: Record<string, TimelineDisplayItem["icon"]> = {
    not_shipped: "clock",
    pending: "clock",
    processing: "clock",
    packed: "package",
    ready_for_pickup: "package",
    shipped: "truck",
    in_transit: "truck",
    out_for_delivery: "truck",
    delivered: "check",
    delayed: "alert",
    returned: "x",
    cancelled: "x",
  };

  return iconMap[status] || "clock";
}

/**
 * Check if a shipping status is considered "completed"
 */
export function isShippingStatusCompleted(status: ShippingStatus | string | null): boolean {
  if (!status) return false;
  return status === "delivered" || status === "cancelled" || status === "returned";
}

/**
 * Convert timeline events to display format
 */
export function formatTimelineEvents(events: TimelineEvent[]): TimelineDisplayItem[] {
  return events.map((event) => ({
    label: getShippingStatusLabel(event.status),
    status: event.status as ShippingStatus,
    timestamp: event.timestamp,
    completed: isShippingStatusCompleted(event.status),
    icon: getShippingStatusIcon(event.status),
    courier: event.courier || null,
    awb: event.awb || null,
    notes: event.notes || null,
  }));
}

/**
 * Get badge variant for shipping status
 */
export function getShippingStatusBadgeVariant(
  status: ShippingStatus | string | null
): "gold" | "bronze" | "vine" | "outline" {
  if (!status) return "outline";

  const normalized = status.toLowerCase();
  if (normalized === "delivered") return "gold";
  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "packed" ||
    normalized === "ready_for_pickup" ||
    normalized === "shipped" ||
    normalized === "in_transit" ||
    normalized === "out_for_delivery"
  )
    return "bronze";
  if (
    normalized === "cancelled" ||
    normalized === "returned" ||
    normalized === "delayed"
  )
    return "vine";
  return "outline";
}