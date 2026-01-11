"use client";

import React from "react";
import { Mail, Check, UserPlus } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip"; // Assuming we might have this or use title

interface QuickActionsProps {
  onMarkRead?: () => void;
  onResolve?: () => void;
  onAssignSelf?: () => void;
  isRead?: boolean;
  isResolved?: boolean;
  isAssignedToMe?: boolean;
}

export function QuickActions({ 
  onMarkRead, 
  onResolve, 
  onAssignSelf,
  isRead,
  isResolved,
  isAssignedToMe
}: QuickActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <QuickActionButton 
        onClick={onMarkRead} 
        icon={Mail} 
        label={isRead ? "Mark as Unread" : "Mark as Read"} 
        active={!isRead}
      />
      <QuickActionButton 
        onClick={onAssignSelf} 
        icon={UserPlus} 
        label={isAssignedToMe ? "Assigned to you" : "Assign to me"}
        active={isAssignedToMe}
        disabled={isAssignedToMe}
      />
      <QuickActionButton 
        onClick={onResolve} 
        icon={Check} 
        label={isResolved ? "Reopen Ticket" : "Mark as Resolved"} 
        active={isResolved}
        variant="success"
      />
    </div>
  );
}

interface QuickActionButtonProps {
  onClick?: () => void;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'success';
}

function QuickActionButton({ onClick, icon: Icon, label, active, disabled, variant = 'default' }: QuickActionButtonProps) {
  const baseClass = "p-1.5 rounded-md transition-colors";
  const activeClass = variant === 'success' 
    ? "text-green-700 bg-green-50 hover:bg-green-100" 
    : "text-gold-darker bg-gold/10 hover:bg-gold/20";
  const inactiveClass = "text-silver-dark hover:bg-offwhite hover:text-night";
  
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onClick) onClick();
      }}
      className={`${baseClass} ${active ? activeClass : inactiveClass} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={label}
      aria-label={label}
      disabled={disabled}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}


