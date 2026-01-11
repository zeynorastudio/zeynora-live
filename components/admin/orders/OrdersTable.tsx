"use client";

import { AdminTable } from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/Badge";
import { Eye } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useState } from "react";
import { OrderDetailDrawer } from "./OrderDetailDrawer";

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  created_at: string;
  payment_status: string;
  shipping_status: string;
  total_amount: number;
  cost_amount?: number;
  shiprocket_charge?: number;
  items: any[];
  shipping_address?: any;
  shiprocket_shipment_id?: string;
};

interface OrdersTableProps {
  orders: Order[];
  userRole?: string;
}

export function OrdersTable({ orders, userRole }: OrdersTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const calculateProfitPercent = (order: Order) => {
    if (!order.cost_amount) return null;
    const shippingCost = order.shiprocket_charge || 0;
    const profit = order.total_amount - order.cost_amount - shippingCost;
    if (order.total_amount === 0) return 0;
    return ((profit / order.total_amount) * 100).toFixed(2);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-silver-light shadow-sm overflow-hidden">
        <AdminTable headers={["Order ID", "Customer", "Date", "Payment", "Shipping", "Total", "Profit %", "Actions"]}>
          {orders.map((order) => {
            const profitPercent = calculateProfitPercent(order);
            return (
              <tr key={order.id} className="group border-b border-silver-light last:border-0 hover:bg-offwhite/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-gold-darker font-medium">
                  {order.order_number}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-night">{order.customer_name}</div>
                  <div className="text-xs text-silver-dark">{order.customer_email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-silver-darker">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={order.payment_status === 'paid' ? 'success' : 'secondary'} className="capitalize">
                    {order.payment_status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="capitalize bg-offwhite">
                    {order.shipping_status || 'Pending'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-night">
                  ₹{order.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {profitPercent !== null ? (
                    <span className={`font-medium ${Number(profitPercent) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPercent}%
                    </span>
                  ) : (
                    <span className="text-silver-light">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <AdminButton 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => handleViewOrder(order)}
                    title="View Order"
                  >
                    <Eye className="w-4 h-4 text-silver-dark" />
                  </AdminButton>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-12 text-center text-silver-dark">
                No orders found.
              </td>
            </tr>
          )}
        </AdminTable>
      </div>

      <OrderDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        order={selectedOrder}
        userRole={userRole}
      />
    </>
  );
}


