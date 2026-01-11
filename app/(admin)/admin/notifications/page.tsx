import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { NotificationsCenter } from "@/components/admin/notifications/NotificationsCenter";
import { Notification } from "@/components/admin/notifications/NotificationItem";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Notifications | Admin Dashboard",
};

export default async function NotificationsPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  // TODO: Fetch from /api/admin/notifications or DB helper
  // const notifications = await getNotifications(session.user.id);
  
  // Mock Data
  const mockNotifications: Notification[] = [
    {
      id: "not_1",
      type: "order",
      title: "New Order #ORD-9872",
      message: "Received a new order from Priya S. for ₹12,500. Payment verified.",
      created_at: new Date().toISOString(),
      is_read: false,
      link: "/admin/orders?id=ORD-9872"
    },
    {
      id: "not_2",
      type: "stock",
      title: "Low Stock Alert: Silk Saree (Red)",
      message: "Variant RED-S is running low (2 items remaining).",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      is_read: false,
      link: "/admin/inventory?search=Silk+Saree"
    },
    {
      id: "not_3",
      type: "query",
      title: "New Customer Query",
      message: "Rahul V. sent a message about shipment delay.",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      is_read: true,
      link: "/admin/queries?id=qry_789"
    }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="serif-display text-3xl text-night">Notifications</h1>
        <p className="text-silver-dark mt-1">Updates on orders, inventory, and system events.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
           <NotificationsCenter initialNotifications={mockNotifications} />
        </div>
        
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
             <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold text-sm">
               <AlertCircle className="w-4 h-4" />
               Backend Integration
             </div>
             <p className="text-xs text-yellow-800/80 leading-relaxed mb-3">
               Notifications table is missing. Schema recommendation:
             </p>
             <div className="bg-white/50 p-2 rounded border border-yellow-200 text-[10px] font-mono text-yellow-900">
               id: uuid<br/>
               user_id: uuid (admin)<br/>
               type: enum<br/>
               title: text<br/>
               message: text<br/>
               link: text<br/>
               is_read: boolean<br/>
               created_at: timestamptz
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}


