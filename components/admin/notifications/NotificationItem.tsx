"use client";

import React from "react";
import { Package, Upload, Boxes, MessageSquare, AlertTriangle, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  type: 'order' | 'upload' | 'stock' | 'query' | 'payment' | 'system';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  link?: string;
  metadata?: any;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onOpen: (notification: Notification) => void;
  onDismiss?: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead, onOpen, onDismiss }: NotificationItemProps) {
  const isUnread = !notification.is_read;

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4 text-blue-600" />;
      case 'upload': return <Upload className="w-4 h-4 text-purple-600" />;
      case 'stock': return <Boxes className="w-4 h-4 text-orange-600" />;
      case 'query': return <MessageSquare className="w-4 h-4 text-gold-darker" />;
      case 'payment': return <Check className="w-4 h-4 text-green-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-silver-dark" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'order': return 'bg-blue-50 border-blue-100';
      case 'upload': return 'bg-purple-50 border-purple-100';
      case 'stock': return 'bg-orange-50 border-orange-100';
      case 'query': return 'bg-gold/10 border-gold/20';
      case 'payment': return 'bg-green-50 border-green-100';
      default: return 'bg-offwhite border-silver-light';
    }
  };

  return (
    <div 
      className={cn(
        "group relative p-4 rounded-lg border transition-all duration-200 flex gap-4",
        isUnread 
          ? "bg-white border-gold/30 shadow-sm" 
          : "bg-offwhite/30 border-silver-light/50 opacity-80 hover:opacity-100"
      )}
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border", getIconBg(notification.type))}>
        {getIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex justify-between items-start mb-1">
          <h4 className={cn("text-sm font-medium truncate pr-4", isUnread ? "text-night" : "text-silver-darker")}>
            {notification.title}
          </h4>
          <span className="text-[10px] text-silver-dark whitespace-nowrap flex-shrink-0">
            {new Date(notification.created_at).toLocaleString()}
          </span>
        </div>
        
        <p className="text-xs text-silver-darker leading-relaxed mb-3 line-clamp-2">
          {notification.message}
        </p>

        <div className="flex items-center gap-3">
          {notification.link && (
            <button 
              onClick={() => onOpen(notification)}
              className="text-xs font-medium text-gold-darker hover:text-gold hover:underline"
            >
              View Details &rarr;
            </button>
          )}
          
          {isUnread && (
            <button 
              onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
              className="text-[10px] text-silver-dark hover:text-gold transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Mark as read
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
          className="absolute top-2 right-2 p-1.5 text-silver-light hover:text-silver-darker hover:bg-offwhite rounded-full opacity-0 group-hover:opacity-100 transition-all"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {isUnread && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-gold rounded-full ring-4 ring-white" />
      )}
    </div>
  );
}


