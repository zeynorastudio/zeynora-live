"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Maximize2, AlertCircle } from "lucide-react";

export interface MediaItem {
  id: string | number;
  product_uid: string;
  product_name: string;
  image_path: string | null;
  image_type: string;
  is_main: boolean;
  created_at: string;
  public_url: string | null;
  has_image?: boolean;
}

interface MediaCardProps {
  item: MediaItem;
  size: "small" | "large";
  onOpen: () => void;
  isMissing?: boolean; // Highlight for missing main image context
}

export function MediaCard({ item, size, onOpen, isMissing }: MediaCardProps) {
  return (
    <div 
      className={cn(
        "group relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all",
        isMissing ? "border-gold border-2" : "border-silver-light",
        size === "small" ? "w-full aspect-[3/4]" : "w-full aspect-[4/3] md:aspect-[3/4]"
      )}
    >
      {/* Image Preview */}
      {item.public_url && item.has_image !== false ? (
        <img
          src={item.public_url}
          alt={`${item.product_name} - ${item.image_type}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-offwhite flex flex-col items-center justify-center text-silver-dark p-4">
          <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-xs text-center font-medium">{item.product_name}</p>
          <p className="text-[10px] text-center mt-1 opacity-70">No image</p>
          <p className="text-[10px] text-center mt-1 font-mono opacity-50">{item.product_uid}</p>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
        <div className="text-white mb-2">
           <p className="text-xs font-mono opacity-80">{item.product_uid}</p>
           <p className="text-sm font-bold truncate">{item.product_name}</p>
        </div>
        
        <div className="flex justify-between items-center">
           <Badge variant={item.is_main ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0.5 h-auto">
             {item.image_type === "none" ? "No Image" : item.image_type}
           </Badge>
           <button 
             onClick={onOpen}
             className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-white backdrop-blur-sm transition-colors"
           >
             <Maximize2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      {!item.has_image && (
        <div className="absolute top-2 right-2 bg-gold text-night text-xs font-bold px-2 py-1 rounded flex items-center shadow-sm">
          <AlertCircle className="w-3 h-3 mr-1" /> No Image
        </div>
      )}
      {isMissing && (
        <div className="absolute top-2 right-2 bg-gold text-night text-xs font-bold px-2 py-1 rounded flex items-center shadow-sm">
          <AlertCircle className="w-3 h-3 mr-1" /> Missing Main
        </div>
      )}
    </div>
  );
}

