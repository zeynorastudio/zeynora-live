/**
 * Phase 3.1 — Role-Based Order Field Visibility
 * 
 * Enforces visibility rules for order data based on user role.
 * This module is used at the API level to filter order fields.
 * 
 * Role visibility matrix:
 * 
 * | Field              | super_admin | admin | staff |
 * |--------------------|-------------|-------|-------|
 * | order_id           | ✓           | ✓     | ✓     |
 * | order_number       | ✓           | ✓     | ✓     |
 * | SKU                | ✓           | ✓     | ✓     |
 * | quantity           | ✓           | ✓     | ✓     |
 * | address            | ✓           | ✓     | ✓     |
 * | shipment_status    | ✓           | ✓     | ✓     |
 * | selling_price      | ✓           | ✓     | ✗     |
 * | cost_price         | ✓           | ✓     | ✗     |
 * | shipping_cost      | ✓           | ✓     | ✗     |
 * | assumed_weight     | ✓           | ✓     | ✗     |
 * | margin             | ✓           | ✓     | ✗     |
 * | profit_percent     | ✓           | ✓     | ✗     |
 * | system_config      | ✓           | ✗     | ✗     |
 * | developer_tools    | ✓           | ✗     | ✗     |
 */

export type OrderRole = "super_admin" | "admin" | "staff";

// Order item interface
interface OrderItem {
  id?: string;
  sku: string;
  product_uid: string;
  name?: string;
  quantity: number;
  price?: number;
  cost_price?: number;
  subtotal?: number;
}

// Full order interface (all fields)
interface FullOrder {
  id: string;
  order_number: string;
  customer_id?: string | null;
  user_id?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  order_status?: string;
  payment_status?: string;
  shipping_status?: string;
  currency?: string;
  subtotal?: number;
  shipping_fee?: number;
  internal_shipping_cost?: number;
  assumed_weight?: number; // Phase 3.4: Assumed weight used for shipping
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  coupon_code?: string | null;
  shiprocket_shipment_id?: string | null;
  payment_provider?: string | null;
  payment_provider_response?: Record<string, unknown> | null;
  // Phase 3.2: Razorpay payment fields
  razorpay_order_id?: string | null;
  payment_method?: string | null;
  paid_at?: string | null;
  // Phase 3.3: Shipment fields
  shipment_status?: string | null;
  courier_name?: string | null;
  shipped_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  // Computed fields
  cost_total?: number;
  profit_amount?: number;
  profit_percent?: number;
  margin?: number;
  // Nested items
  items?: OrderItem[];
}

// Fields visible to each role
const ROLE_VISIBLE_FIELDS: Record<OrderRole, string[]> = {
  super_admin: [
    // All fields visible (Phase 3.2: Full payment metadata including Razorpay IDs)
    // Phase 3.3: Full shipment information including shipping cost analytics
    "id", "order_number", "customer_id", "user_id", "guest_phone", "guest_email",
    "order_status", "payment_status", "shipping_status", "currency",
    "subtotal", "shipping_fee", "internal_shipping_cost", "assumed_weight", "tax_amount",
    "discount_amount", "total_amount", "coupon_code", "shiprocket_shipment_id",
    "payment_provider", "payment_provider_response", "metadata",
    "razorpay_order_id", "payment_method", "paid_at", // Phase 3.2: Full payment metadata
    "shipment_status", "courier_name", "shipped_at", // Phase 3.3: Shipment fields
    "created_at", "updated_at",
    // Computed fields
    "cost_total", "profit_amount", "profit_percent", "margin",
    // System fields
    "system_config", "developer_tools",
    // Items with full details
    "items",
  ],
  admin: [
    // Owners see financial details (Phase 3.2: Payment status and method, NO Razorpay secrets)
    // Phase 3.3: Shipment ID, shipment status, shipping cost
    "id", "order_number", "customer_id", "guest_phone", "guest_email",
    "order_status", "payment_status", "shipping_status", "currency",
    "subtotal", "shipping_fee", "internal_shipping_cost", "assumed_weight", "tax_amount",
    "discount_amount", "total_amount", "coupon_code", "shiprocket_shipment_id",
    "payment_provider", "payment_method", "paid_at", // Phase 3.2: Payment status and method
    "shipment_status", "courier_name", "shipped_at", // Phase 3.3: Shipment fields
    "metadata", "created_at", "updated_at",
    // Financial fields
    "cost_total", "profit_amount", "profit_percent", "margin",
    // Items with prices
    "items",
    // NOTE: Admin does NOT see razorpay_order_id or payment_provider_response (contains secrets)
  ],
  staff: [
    // Staff sees only operational fields (Phase 3.2: Payment status only - Paid/Failed)
    // Phase 3.3: Order ID, Shipment ID, Shipment status (can update Packed/Ready to ship)
    // Staff CANNOT see prices, cost, or margin
    "id", "order_number", "guest_phone",
    "order_status", "payment_status", "shipping_status", // Phase 3.2: Payment status only
    "shiprocket_shipment_id", "shipment_status", "courier_name", // Phase 3.3: Shipment fields
    "created_at",
    // Items without prices
    "items",
    // NOTE: Staff does NOT see payment_method, paid_at, razorpay_order_id, payment_provider_response,
    // shipping_fee, internal_shipping_cost, tax_amount, discount_amount, total_amount, or any financial fields
  ],
};

// Item fields visible to each role
const ROLE_ITEM_FIELDS: Record<OrderRole, string[]> = {
  super_admin: ["id", "sku", "product_uid", "name", "quantity", "price", "cost_price", "subtotal"],
  admin: ["id", "sku", "product_uid", "name", "quantity", "price", "cost_price", "subtotal"],
  staff: ["id", "sku", "product_uid", "name", "quantity"], // No prices
};

/**
 * Filter order object based on user role
 */
export function filterOrderByRole(order: FullOrder, role: OrderRole): Partial<FullOrder> {
  const visibleFields = ROLE_VISIBLE_FIELDS[role] || ROLE_VISIBLE_FIELDS.staff;
  const itemFields = ROLE_ITEM_FIELDS[role] || ROLE_ITEM_FIELDS.staff;
  
  const filtered: Partial<FullOrder> = {};

  for (const field of visibleFields) {
    if (field === "items" && order.items) {
      // Filter item fields
      filtered.items = order.items.map((item) => 
        filterItemByRole(item, itemFields)
      ) as OrderItem[];
    } else if (field in order) {
      (filtered as Record<string, unknown>)[field] = (order as unknown as Record<string, unknown>)[field];
    }
  }

  // For admin and super_admin, calculate margin if not present
  if ((role === "super_admin" || role === "admin") && filtered.subtotal && filtered.internal_shipping_cost !== undefined) {
    const costTotal = order.items?.reduce((sum, item) => 
      sum + ((item.cost_price || 0) * item.quantity), 0
    ) || 0;
    
    filtered.cost_total = costTotal;
    filtered.profit_amount = (filtered.subtotal || 0) - costTotal - (filtered.internal_shipping_cost || 0);
    filtered.margin = filtered.subtotal > 0 
      ? ((filtered.profit_amount || 0) / (filtered.subtotal || 1)) * 100 
      : 0;
  }

  return filtered;
}

/**
 * Filter order item based on role
 */
function filterItemByRole(item: OrderItem, allowedFields: string[]): OrderItem {
  const filtered: Partial<OrderItem> = {};
  
  for (const field of allowedFields) {
    if (field in item) {
      (filtered as Record<string, unknown>)[field] = (item as unknown as Record<string, unknown>)[field];
    }
  }
  
  // Ensure required fields are present
  return {
    sku: filtered.sku || item.sku,
    product_uid: filtered.product_uid || item.product_uid,
    quantity: filtered.quantity ?? item.quantity,
    ...filtered,
  } as OrderItem;
}

/**
 * Filter array of orders by role
 */
export function filterOrdersByRole(orders: FullOrder[], role: OrderRole): Partial<FullOrder>[] {
  return orders.map((order) => filterOrderByRole(order, role));
}

/**
 * Check if role can view a specific field
 */
export function canViewField(role: OrderRole, field: string): boolean {
  const visibleFields = ROLE_VISIBLE_FIELDS[role] || [];
  return visibleFields.includes(field);
}

/**
 * Get list of hidden fields for a role (for UI hints)
 */
export function getHiddenFields(role: OrderRole): string[] {
  const allFields = ROLE_VISIBLE_FIELDS.super_admin;
  const visibleFields = ROLE_VISIBLE_FIELDS[role] || [];
  return allFields.filter((f) => !visibleFields.includes(f));
}

/**
 * Validate role is allowed to perform action
 */
export function isRoleAllowed(role: string, allowedRoles: OrderRole[]): boolean {
  return allowedRoles.includes(role as OrderRole);
}

