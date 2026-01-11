"use client";

import React, { useState } from "react";
import "@/styles/product-card.css";

// Since image gallery needs to switch main image on click, it should be a client component.

interface ProductImageGalleryProps {
  images: { url: string; alt: string; type: string }[];
}

export default function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return <div className="w-full aspect-[4/5] bg-gray-200 rounded-xl flex items-center justify-center">No Images</div>;
  }

  const mainImage = images[selectedIndex];

  return (
    <div className="w-full">
      {/* Desktop: 2-column layout */}
      <div className="hidden lg:flex gap-4">
        {/* Main Image Column */}
        <div className="flex-1 min-w-0">
          <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-silver/20 border border-silver warm-shadow">
            <div
              className="w-full h-full hover-zoom bg-silver/30 bg-cover bg-center transition-all duration-500"
              role="img"
              aria-label={mainImage.alt}
              style={{ backgroundImage: `url(${mainImage.url})` }}
            />
          </div>
        </div>

        {/* Thumbnail Column */}
        <div className="w-[30%] flex flex-col gap-3 h-[600px] overflow-y-auto scrollbar-hide">
          {images.map((img, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-silver/20 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold ${
                  selectedIndex === index ? "border-gold ring-1 ring-gold" : "border-silver hover:border-gold"
              }`}
              aria-label={`View image ${index + 1}`}
              aria-current={selectedIndex === index}
            >
              <div
                className="w-full h-full bg-silver/30 bg-cover bg-center"
                style={{ backgroundImage: `url(${img.url})` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: Main + Horizontal Strip */}
      <div className="lg:hidden">
        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-silver/20 border border-silver warm-shadow">
          <div
            className="w-full h-full bg-silver/30 bg-cover bg-center transition-all duration-300"
            role="img"
            aria-label={mainImage.alt}
            style={{ backgroundImage: `url(${mainImage.url})` }}
          />
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1 py-1">
          {images.map((img, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-silver/20 border snap-start focus:outline-none focus:ring-2 focus:ring-gold ${
                  selectedIndex === index ? "border-gold ring-1 ring-gold" : "border-silver/30"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <div
                className="w-full h-full bg-silver/30 bg-cover bg-center"
                style={{ backgroundImage: `url(${img.url})` }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
