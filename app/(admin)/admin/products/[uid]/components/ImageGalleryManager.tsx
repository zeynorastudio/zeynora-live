"use client";

import React, { useEffect, useState } from "react";
import { MediaItem, MediaCard } from "@/app/(admin)/admin/media/components/MediaCard";
import { AdminButton } from "@/components/admin/AdminButton";
import { ExternalLink } from "lucide-react";

interface ImageGalleryManagerProps {
  uid: string;
  role: string;
}

export function ImageGalleryManager({ uid, role }: ImageGalleryManagerProps) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reuse Phase 4.4 API list with search=uid
    fetch(`/api/admin/media/list?search=${uid}&limit=100`)
      .then(res => res.json())
      .then(data => setImages(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-sm">Product Images</h4>
        <a href={`/admin/media`} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline flex items-center gap-1">
          Open Media Library <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {loading ? (
        <div className="text-center py-8 text-xs text-silver-dark">Loading...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 text-xs text-silver-dark bg-offwhite rounded border border-dashed">
          No images found. Use Media Library to upload.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.slice(0, 4).map(img => (
            <MediaCard 
              key={img.id} 
              item={img} 
              size="small"
              onOpen={() => {
                // Open media library in new tab with product selected
                window.open(`/admin/media`, '_blank');
              }}
            />
          ))}
          {images.length > 4 && (
            <div className="flex items-center justify-center bg-offwhite border rounded text-xs text-silver-dark">
              +{images.length - 4} more
            </div>
          )}
        </div>
      )}

    </div>
  );
}

