"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Trash2, Eye, MoreHorizontal, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import "@/styles/super-product-editor.css";

interface ProductImage {
  path: string;
  publicUrl: string; // Resolved URL
  alt_text?: string;
  type?: string;
  display_order?: number;
}

interface ProductImageGridProps {
  images: ProductImage[];
  onDelete?: (path: string) => void;
  readOnly?: boolean;
}

export function ProductImageGrid({ images, onDelete, readOnly = false }: ProductImageGridProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-8 text-silver-dark bg-offwhite rounded-lg border border-dashed border-silver-light">
        No images uploaded yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="image-grid-item group">
            <Image
              src={img.publicUrl}
              alt={img.alt_text || "Product Image"}
              fill
              className="object-cover"
            />
            
            {/* Type Badge */}
            {img.type && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded uppercase backdrop-blur-sm">
                {img.type}
              </div>
            )}

            {/* Actions Overlay */}
            <div className="image-grid-overlay">
              <button
                type="button"
                onClick={() => setPreviewImage(img.publicUrl)}
                className="p-2 bg-white rounded-full text-night hover:text-gold transition-colors shadow-sm"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              
              {!readOnly && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(img.path)}
                  className="p-2 bg-white rounded-full text-red-500 hover:text-red-700 transition-colors shadow-sm"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
          <div className="relative aspect-square md:aspect-video w-full bg-black/80 rounded-lg overflow-hidden flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
              />
            )}
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


