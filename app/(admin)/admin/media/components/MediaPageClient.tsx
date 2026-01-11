"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { MediaCard, MediaItem } from "./MediaCard";
import { cn } from "@/lib/utils";
import { MediaPanel } from "./MediaPanel";
import { Search, LayoutGrid, Grid, Filter } from "lucide-react";
import { useToastWithCompat } from "@/components/ui/use-toast";

interface MediaPageClientProps {
  role: string;
}

export default function MediaPageClient({ role }: MediaPageClientProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [gridSize, setGridSize] = useState<"small" | "large">("small");
  const [selectedProductUid, setSelectedProductUid] = useState<string | null>(null);
  
  const { addToast } = useToastWithCompat();
  const isSuperAdmin = role === "super_admin";
  
  // Use ref to store addToast to avoid dependency issues causing infinite loop
  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        type: typeFilter,
        page: "1",
        limit: "50", // Higher limit for gallery feel
        sort: "desc"
      });
      
      const res = await fetch(`/api/admin/media/list?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load media");
      }
      
      const data = await res.json();
      setItems(data.data || []);
    } catch (error: any) {
      console.error("[MediaPageClient] Fetch error:", error);
      addToastRef.current("Error fetching media library", "error");
      setItems([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]); // Removed addToast from dependencies to prevent infinite loop

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchMedia();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchMedia]);


  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-silver-light shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
            <input 
              type="text" 
              placeholder="Search UID or Name..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
             <select 
               className="pl-9 pr-8 py-2 text-sm border border-silver-light rounded-md focus:ring-1 focus:ring-gold/50 outline-none bg-white appearance-none"
               value={typeFilter}
               onChange={(e) => setTypeFilter(e.target.value)}
             >
               <option value="all">All Types</option>
               <option value="main">Main Only</option>
               <option value="back">Back</option>
               <option value="side">Side</option>
               <option value="detail">Detail</option>
               <option value="lifestyle">Lifestyle</option>
             </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-l border-silver-light pl-4">
          <button 
            onClick={() => setGridSize("small")}
            className={cn("p-2 rounded hover:bg-offwhite transition-colors", gridSize === "small" ? "text-gold bg-gold/5" : "text-silver-dark")}
            title="Small Grid"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setGridSize("large")}
            className={cn("p-2 rounded hover:bg-offwhite transition-colors", gridSize === "large" ? "text-gold bg-gold/5" : "text-silver-dark")}
            title="Large Grid"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-silver-dark animate-pulse">Loading media...</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-silver-dark">
          <p className="italic mb-4">No products found matching your filters.</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          gridSize === "small" 
            ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6" 
            : "grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
        )}>
          {items.map((item) => (
             <MediaCard 
               key={item.id} 
               item={item} 
               size={gridSize}
               onOpen={() => setSelectedProductUid(item.product_uid)}
               isMissing={!item.has_image}
             />
          ))}
        </div>
      )}

      {/* Media Panel */}
      <MediaPanel
        productUid={selectedProductUid}
        isOpen={!!selectedProductUid}
        onClose={() => setSelectedProductUid(null)}
        onRefresh={fetchMedia}
      />
    </div>
  );
}

