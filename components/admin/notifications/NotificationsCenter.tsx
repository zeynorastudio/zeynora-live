"use client";

import React, { useState, useEffect } from "react";
import { Notification, NotificationItem } from "./NotificationItem";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface NotificationsCenterProps {
  initialNotifications: Notification[];
}

export function NotificationsCenter({ initialNotifications }: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const { addToast } = useToastWithCompat();
  const router = useRouter();

  // Simulating real-time updates (Polling fallback as per rules)
  useEffect(() => {
    const pollInterval = setInterval(() => {
       // TODO: Replace with fetch to /api/admin/notifications/latest or SSE
       // console.log("Polling for new notifications..."); 
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    
    // TODO: Call PUT /api/admin/notifications/[id]/mark
    // addToast("Notification marked as read", "success");
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    addToast("All notifications marked as read", "success");
    // TODO: Call batch mark read API
  };

  const handleOpen = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Client-side dismiss only unless backend supports soft-delete
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 p-1 bg-offwhite/50 rounded-lg border border-silver-light">
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'unread' ? 'bg-white shadow-sm text-night' : 'text-silver-dark hover:text-night'}`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white shadow-sm text-night' : 'text-silver-dark hover:text-night'}`}
          >
            All
          </button>
        </div>

        {unreadCount > 0 && (
          <AdminButton 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllRead} 
            icon={CheckCheck}
          >
            Mark all read
          </AdminButton>
        )}
      </div>

      {/* List */}
      <div className="space-y-3" aria-live="polite">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification}
              onMarkRead={handleMarkRead}
              onOpen={handleOpen}
              onDismiss={handleDismiss}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-silver-light border-dashed">
            <div className="w-12 h-12 bg-offwhite rounded-full flex items-center justify-center mx-auto mb-3 text-silver-dark">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-night font-medium">No {filter === 'unread' ? 'new' : ''} notifications</p>
            <p className="text-xs text-silver-dark mt-1">You're all caught up!</p>
          </div>
        )}
      </div>
      
      {/* Dev Note for Streaming */}
      <div className="mt-8 p-3 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-800">
         <div className="flex items-center gap-1 font-bold mb-1">
           <RefreshCw className="w-3 h-3" />
           Real-time Updates
         </div>
         Real-time notifications (SSE/WebSocket) are not yet implemented. The UI currently uses a polling placeholder.
         <br/>
         <strong>TODO:</strong> Implement <code>/api/admin/notifications/stream</code> or Supabase Realtime subscription.
       </div>
    </div>
  );
}


