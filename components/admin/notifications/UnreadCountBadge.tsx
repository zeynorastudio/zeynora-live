"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";

interface UnreadCountBadgeProps {
  count: number;
}

export function UnreadCountBadge({ count }: UnreadCountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span 
      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-200"
      aria-label={`You have ${count} unread notifications`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}


