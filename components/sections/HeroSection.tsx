import React from "react";
import Link from "next/link";
import { getPublicUrl } from "@/lib/utils/images";

interface HeroSectionProps {
  banner: {
    title: string;
    subtitle?: string;
    imagePath?: string;
    ctaText?: string;
    ctaLink?: string;
  } | null;
}

export default function HeroSection({ banner }: HeroSectionProps) {
  // Default content if no banner
  const title = banner?.title || "Where Tradition Meets Modern Luxury";
  const subtitle = banner?.subtitle || "Discover timeless elegance reimagined for the modern world";
  // If banner.imagePath is a full URL (from normalized data), getPublicUrl handles it.
  // If it's a relative path, getPublicUrl resolves it against "banners" bucket.
  const imageUrl = getPublicUrl("banners", banner?.imagePath || "hero/default-hero.jpg"); 
  const ctaText = banner?.ctaText || "Shop Now";
  const ctaLink = banner?.ctaLink || "/shop";

  return (
    <section className="w-full bg-cream editorial-divider section-gap-lg min-h-[600px] lg:min-h-[700px] fade-in">
      <div className="container mx-auto px-4 py-8 lg:py-0">
        <div className="flex flex-col lg:flex-row lg:h-[700px]">
          {/* LEFT: MediaColumn */}
          <div className="w-full lg:w-1/2 flex items-center justify-center relative overflow-hidden rounded-xl warm-shadow-sm border border-silver">
             <img
               src={imageUrl}
               alt={title}
               className="object-cover w-full h-full"
             />
          </div>

          {/* RIGHT: ContentColumn */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center items-start px-4 lg:px-12 py-8 lg:py-0">
            <h1 className="serif-display display-lg text-night mb-4 gold-reveal">
              {title}
            </h1>

            <p className="sans-base body-lg text-night/70 mb-8 max-w-md">
              {subtitle}
            </p>

            <Link
              href={ctaLink}
              className="bg-gold text-night px-8 py-3 rounded-md font-medium hover:bg-gold/90 transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
            >
              {ctaText}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
