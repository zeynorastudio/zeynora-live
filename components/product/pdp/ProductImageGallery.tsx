"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
  images: { url: string; alt: string; type?: string }[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  // Fallback if no images - show placeholder
  const displayImages = images.length > 0 ? images : [{ url: "/placeholder.jpg", alt: productName }];
  
  // Ensure selectedImage is within bounds
  const safeSelectedIndex = Math.min(selectedImage, displayImages.length - 1);
  const currentImage = displayImages[safeSelectedIndex];
  
  // Single image: no thumbnails needed
  const showThumbnails = displayImages.length > 1;

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {/* Thumbnails (Left on Desktop, Bottom on Mobile) - Only show if multiple images */}
      {showThumbnails && (
        <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:max-h-[600px] scrollbar-hide pb-2 md:pb-0">
          {displayImages.map((img, idx) => (
            <button
              key={`thumb-${idx}-${img.url}`}
              onClick={() => setSelectedImage(idx)}
              className={cn(
                "relative w-16 h-20 md:w-20 md:h-28 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                safeSelectedIndex === idx ? "border-gold ring-1 ring-gold/30" : "border-transparent hover:border-silver"
              )}
              aria-label={`View image ${idx + 1}`}
              aria-current={safeSelectedIndex === idx ? "true" : "false"}
            >
              <img 
                src={img.url} 
                alt={img.alt || `${productName} view ${idx + 1}`} 
                className="object-cover w-full h-full"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className={cn(
        "aspect-[4/5] md:aspect-[3/4] bg-offwhite rounded-xl overflow-hidden relative warm-shadow-sm border border-silver-light",
        showThumbnails ? "flex-1" : "w-full max-w-2xl mx-auto"
      )}>
        {currentImage ? (
          <img 
            src={currentImage.url} 
            alt={currentImage.alt || productName} 
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-silver-dark">
            No image available
          </div>
        )}
      </div>
    </div>
  );
}


