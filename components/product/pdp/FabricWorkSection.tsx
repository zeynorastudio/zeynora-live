"use client";

import React from "react";
import { Info } from "lucide-react";

interface FabricWorkSectionProps {
  fabric: string;
  work?: string;
  tags?: string[];
}

export default function FabricWorkSection({ fabric, work, tags = [] }: FabricWorkSectionProps) {
  return (
    <div className="space-y-6 pt-6 border-t border-silver-light">
      <h3 className="serif-display text-lg text-night">Product Details</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {fabric && (
          <div className="bg-offwhite/50 p-3 rounded border border-silver-light">
            <span className="block text-[10px] uppercase tracking-wider text-silver-dark font-bold mb-1">Material</span>
            <span className="text-sm text-night">{fabric}</span>
          </div>
        )}
        {work && (
          <div className="bg-offwhite/50 p-3 rounded border border-silver-light">
             <span className="block text-[10px] uppercase tracking-wider text-silver-dark font-bold mb-1">Work</span>
             <span className="text-sm text-night">{work}</span>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div>
           <span className="block text-[10px] uppercase tracking-wider text-silver-dark font-bold mb-2">Tags</span>
           <div className="flex flex-wrap gap-2">
             {tags.map(tag => (
               <span key={tag} className="px-2 py-1 bg-offwhite border border-silver-light rounded text-xs text-silver-darker capitalize">
                 {tag}
               </span>
             ))}
           </div>
        </div>
      )}
      
      <div className="flex gap-2 items-start p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Handcrafted products may contain slight irregularities, which are the hallmark of handmade quality.
        </p>
      </div>
    </div>
  );
}


