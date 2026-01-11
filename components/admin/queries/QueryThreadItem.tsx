"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"; // Assuming exists, fallback to manual if not
import { Badge } from "@/components/ui/Badge";
import { FileText, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming cn exists, or I'll use template literals

export interface QueryMessage {
  id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_name: string;
  sender_avatar?: string;
  message: string;
  created_at: string;
  is_internal?: boolean;
  attachments?: Array<{ name: string; url: string }>;
}

interface QueryThreadItemProps {
  message: QueryMessage;
}

export function QueryThreadItem({ message }: QueryThreadItemProps) {
  const isAgent = message.sender_type === 'agent' || message.sender_type === 'system';
  const isInternal = message.is_internal;

  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-lg mb-4",
      isInternal ? "bg-yellow-50 border border-yellow-100" : "bg-white border border-silver-light",
      isAgent && !isInternal ? "bg-offwhite/30" : ""
    )}>
      <div className="flex-shrink-0">
        {/* Simple Avatar Fallback */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase",
          message.sender_type === 'customer' ? "bg-night" : "bg-gold"
        )}>
          {message.sender_name.substring(0, 2)}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-night">{message.sender_name}</span>
            <span className="text-xs text-silver-dark capitalize">({message.sender_type})</span>
            {isInternal && (
              <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-yellow-100 text-yellow-800 border-yellow-200">
                Internal Note
              </Badge>
            )}
          </div>
          <span className="text-xs text-silver-dark">
            {new Date(message.created_at).toLocaleString()}
          </span>
        </div>
        
        <div className="text-sm text-night leading-relaxed whitespace-pre-wrap">
          {message.message}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((file, idx) => (
              <a 
                key={idx} 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-offwhite rounded border border-silver-light text-xs text-silver-darker hover:bg-silver-light transition-colors"
              >
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{file.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


