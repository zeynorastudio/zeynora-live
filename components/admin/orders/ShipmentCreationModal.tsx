"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Loader2, PackageCheck } from "lucide-react";

interface ShipmentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

export function ShipmentCreationModal({ isOpen, onClose, orderId }: ShipmentCreationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToastWithCompat();

  const handleCreateShipment = async () => {
    setIsLoading(true);
    try {
      // Simulating API call to /api/admin/orders/[id]/create-shipment
      // This endpoint creates the order in Shiprocket
      
      // Note: Since endpoint might not exist yet, we show a TODO if 404
      const response = await fetch(`/api/admin/orders/${orderId}/create-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: 0.5, // Default or from form
          courier_id: "auto", // Default
        }),
        credentials: "include"
      });

      if (response.status === 404) {
        addToast("TODO: Shiprocket integration API missing. Configure in Settings.", "info");
        onClose();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to create shipment");
      }

      addToast("Shipment created successfully!", "success");
      onClose();
    } catch (error: any) {
      console.error("Shipment creation error:", error);
      addToast(error.message || "Failed to create shipment", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-night">
            <PackageCheck className="w-5 h-5 text-gold" />
            Create Shipment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-orange-50 p-3 rounded text-xs text-orange-800 border border-orange-100">
            Note: This will create an order in Shiprocket and generate a tracking ID. Ensure pickup address is correct in Global Settings.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-silver-darker">Package Weight (kg)</label>
            <input 
              type="number" 
              defaultValue="0.5"
              step="0.1"
              className="w-full px-3 py-2 border border-silver-light rounded text-sm focus:ring-1 focus:ring-gold/50 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-silver-darker">Courier Preference</label>
            <select className="w-full px-3 py-2 border border-silver-light rounded text-sm bg-white focus:ring-1 focus:ring-gold/50 outline-none">
              <option value="auto">Auto-Assign (Cheapest/Fastest)</option>
              <option value="delhivery">Delhivery</option>
              <option value="bluedart">BlueDart</option>
              <option value="dtdc">DTDC</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <AdminButton variant="outline" onClick={onClose} disabled={isLoading}>Cancel</AdminButton>
          <AdminButton onClick={handleCreateShipment} isLoading={isLoading}>
            {isLoading ? "Creating..." : "Confirm Shipment"}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


