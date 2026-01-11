"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { getPublicUrl } from "@/lib/utils/images";

interface CategoryImageSelectorProps {
  categoryId: string;
  currentPath?: string;
  type: "tile" | "banner";
  readOnly: boolean;
  onUpdate: (path: string) => void;
}

export default function CategoryImageSelector({ categoryId, currentPath, type, readOnly, onUpdate }: CategoryImageSelectorProps) {
  const [uploading, setUploading] = useState(false);
  const { addToast } = useToastWithCompat();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("image_type", type);

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/images/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onUpdate(data.path);
      addToast("Image uploaded", "success");
    } catch (err) {
      addToast("Failed to upload", "error");
    } finally {
      setUploading(false);
    }
  };

  // Use getPublicUrl with "categories" bucket based on upload route assumption
  const previewUrl = currentPath ? getPublicUrl("categories", currentPath) : null;

  return (
    <div className="border border-silver-light rounded-lg p-4 bg-white shadow-warm-xs">
      <h4 className="serif-display text-sm mb-3 capitalize">{type} Image</h4>
      
      <div className="aspect-[4/3] bg-offwhite rounded border border-dashed border-silver-light flex items-center justify-center overflow-hidden mb-4 relative">
        {previewUrl ? (
          <img src={previewUrl} alt={type} className="w-full h-full object-cover" />
        ) : (
          <div className="text-silver-dark flex flex-col items-center">
            <ImageIcon className="w-8 h-8 mb-1" />
            <span className="text-xs">No image set</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <label className="flex-1">
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-silver-light rounded text-xs font-medium hover:bg-offwhite cursor-pointer transition-colors">
              <Upload className="w-3 h-3" /> Upload New
            </div>
          </label>
          {/* "Select From Media Library" - reusing existing flow logic if implemented or just placeholder */}
          <button 
            onClick={() => addToast("Media Library Selector - Coming Soon", "info")}
            className="flex-1 px-3 py-2 bg-white border border-silver-light rounded text-xs font-medium hover:bg-offwhite transition-colors"
          >
            Select Library
          </button>
        </div>
      )}
    </div>
  );
}

