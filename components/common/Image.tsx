import * as React from "react";

export interface ImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

export default function Image({
  src = "supabase://banners/hero/placeholder.jpg",
  alt = "",
  className = "",
}: ImageProps) {
  return (
    <div
      className={`aspect-square w-full bg-cream border border-silver/30 rounded-xl ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Image placeholder - Supabase image will be rendered here */}
    </div>
  );
}

