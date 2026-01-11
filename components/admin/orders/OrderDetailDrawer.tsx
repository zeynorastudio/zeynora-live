"use client";

import React, { useState } from "react";
import { X, Package, Truck, AlertTriangle, Send } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { AdminButton } from "@/components/admin/AdminButton";
import { Order } from "./OrdersTable";
import { ShipmentCreationModal } from "./ShipmentCreationModal";
import { useToastWithCompat } from "@/components/ui/use-toast";

interface OrderDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  userRole?: string;
}

export function OrderDetailDrawer({ isOpen, onClose, order, userRole }: OrderDetailDrawerProps) {
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
  const { addToast } = useToastWithCompat();
  const isSuperAdmin = userRole === "super_admin";

  if (!order) return null;

  const subtotal = order.total_amount; // Simplified logic if fields missing
  const shippingCost = order.shiprocket_charge || 0;
  const profitAmount = (order.total_amount - (order.cost_amount || 0) - shippingCost).toFixed(2);
  
  const handleRefreshTracking = async () => {
    // TODO: Call GET /api/admin/orders/[id]/tracking
    addToast("TODO: Implement Refresh Tracking API call", "info");
  };

  const handleUpdateShippingStatus = async (status: string) => {
    // TODO: Call PUT /api/admin/orders/[id]/shipping_status
    addToast(`TODO: Update shipping status to ${status}`, "info");
  };

  const handleReplyQuery = async () => {
    // TODO: Call POST /api/admin/queries/[id]/reply
    addToast("TODO: Implement Reply Query API call", "info");
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
        <DrawerContent className="h-full w-full sm:max-w-2xl ml-auto rounded-none border-l border-silver-light bg-white overflow-y-auto p-0">
          
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-silver-light px-6 py-4 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="serif-display text-xl text-night">Order #{order.order_number}</h2>
              <p className="text-xs text-silver-dark mt-1">
                Placed on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={order.payment_status === 'paid' ? 'success' : 'secondary'} className="uppercase">
                {order.payment_status}
              </Badge>
              <DrawerClose asChild>
                <button className="p-2 hover:bg-offwhite rounded-full transition-colors">
                  <X className="w-5 h-5 text-silver-darker" />
                </button>
              </DrawerClose>
            </div>
          </div>

          <div className="p-6 space-y-8">
            
            {/* Customer Info */}
            <section>
              <h3 className="text-sm font-bold text-night uppercase tracking-wide mb-3">Customer Details</h3>
              <div className="bg-offwhite/30 p-4 rounded-lg border border-silver-light space-y-2 text-sm">
                <p><span className="font-medium text-silver-darker w-20 inline-block">Name:</span> {order.customer_name}</p>
                <p><span className="font-medium text-silver-darker w-20 inline-block">Email:</span> {order.customer_email}</p>
                <p><span className="font-medium text-silver-darker w-20 inline-block">Phone:</span> {order.shipping_address?.phone || "—"}</p>
                <p><span className="font-medium text-silver-darker w-20 inline-block">Address:</span> {order.shipping_address?.line1 || "—"}, {order.shipping_address?.city || ""}</p>
              </div>
            </section>

            <Separator />

            {/* Order Items */}
            <section>
              <h3 className="text-sm font-bold text-night uppercase tracking-wide mb-3">Items ({order.items?.length || 0})</h3>
              <div className="space-y-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 border border-silver-light rounded-lg bg-white">
                    <div className="h-12 w-12 bg-offwhite rounded border border-silver-light flex items-center justify-center text-[8px] text-silver-dark flex-shrink-0">
                      IMG
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-night truncate">{item.name}</p>
                      <p className="text-xs text-silver-dark">SKU: {item.sku} • Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-night">₹{item.price}</p>
                      {isSuperAdmin && item.cost && <p className="text-[10px] text-silver-dark">Cost: ₹{item.cost}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Pricing & Profit */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-offwhite/50 p-4 rounded-lg border border-silver-light space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-silver-darker">Subtotal</span> <span>₹{subtotal}</span></div>
                <div className="flex justify-between"><span className="text-silver-darker">Shipping</span> <span>₹0.00</span></div>
                <div className="flex justify-between"><span className="text-silver-darker">Tax</span> <span>₹0.00</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-night text-base"><span>Total</span> <span>₹{order.total_amount}</span></div>
              </div>

              {isSuperAdmin && (
                <div className="bg-gold/5 p-4 rounded-lg border border-gold/20 space-y-2 text-sm">
                  <h4 className="font-bold text-gold-darker uppercase text-xs tracking-wide mb-2">Profit Analysis</h4>
                  <div className="flex justify-between"><span className="text-silver-darker">Total Revenue</span> <span>₹{order.total_amount}</span></div>
                  <div className="flex justify-between"><span className="text-silver-darker">Product Cost</span> <span>-₹{order.cost_amount || 0}</span></div>
                  <div className="flex justify-between"><span className="text-silver-darker">Delivery Cost</span> <span>-₹{order.shiprocket_charge || 0}</span></div>
                  <Separator className="my-2 bg-gold/20" />
                  <div className="flex justify-between font-bold text-gold-darker">
                    <span>Net Profit</span> 
                    <span>₹{profitAmount}</span>
                  </div>
                  {!order.shiprocket_charge && (
                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-[10px] rounded flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Shiprocket charge not recorded — profit shown without delivery deduction
                    </div>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* Shipping Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-night uppercase tracking-wide">Shipping & Fulfillment</h3>
                <Badge variant="outline">{order.shipping_status || "Pending"}</Badge>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-silver-light space-y-4">
                {order.shiprocket_shipment_id ? (
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium text-silver-darker">Carrier:</span> Shiprocket (Courier Assigned)</p>
                    <p><span className="font-medium text-silver-darker">Tracking ID:</span> {order.shiprocket_shipment_id}</p>
                    <a href="#" className="text-gold hover:underline text-xs">Track Shipment &rarr;</a>
                  </div>
                ) : (
                  <div className="text-center py-4 text-silver-dark text-sm italic">
                    No shipment created yet.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {isSuperAdmin && !order.shiprocket_shipment_id && (
                    <AdminButton onClick={() => setIsShipmentModalOpen(true)} icon={Package}>Create Shipment</AdminButton>
                  )}
                  <AdminButton variant="outline" onClick={handleRefreshTracking} icon={Truck}>Refresh Tracking</AdminButton>
                  
                  {/* Admin Status Update */}
                  <div className="flex-1 min-w-[140px]">
                    <select 
                      className="w-full h-9 px-3 rounded-md border border-silver-light text-sm bg-white focus:ring-1 focus:ring-gold/50 outline-none"
                      defaultValue={order.shipping_status || "pending"}
                      onChange={(e) => handleUpdateShippingStatus(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Queries / Messages Placeholder */}
            <section>
              <h3 className="text-sm font-bold text-night uppercase tracking-wide mb-3">Customer Messages</h3>
              <div className="bg-offwhite/30 border border-silver-light rounded-lg p-4 text-center">
                <p className="text-sm text-silver-dark mb-3">No active queries for this order.</p>
                {/* Reply Box Placeholder */}
                <div className="flex gap-2 mt-4">
                  <input 
                    type="text" 
                    placeholder="Type a message to customer..." 
                    className="flex-1 px-3 py-2 border border-silver-light rounded text-sm focus:outline-none focus:ring-1 focus:ring-gold/50"
                    disabled
                  />
                  <AdminButton disabled icon={Send} variant="outline">Reply</AdminButton>
                </div>
                <p className="text-[10px] text-silver-dark mt-2 italic">
                  TODO: Connect to Queries API in Phase 3.x
                </p>
              </div>
            </section>

          </div>
        </DrawerContent>
      </Drawer>

      <ShipmentCreationModal 
        isOpen={isShipmentModalOpen}
        onClose={() => setIsShipmentModalOpen(false)}
        orderId={order.id}
      />
    </>
  );
}


