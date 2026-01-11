"use client";

import React, { useState, useEffect } from "react";
import { HomepageHero } from "@/lib/homepage/types";
import { getPublicUrl } from "@/lib/utils/images";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const isVideoAsset = (path?: string | null) =>
  !!path && /\.(mp4|webm)$/i.test(path);

export default function Hero({ slides, settings }: { slides: HomepageHero[], settings: any }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  const currentSlide = slides[current];
  const ctaUrl = currentSlide.cta_url || "/shop";

  // Desktop asset: prefer video, fallback to image
  const desktopAsset = currentSlide.desktop_video || currentSlide.desktop_image;
  const desktopIsVideo = currentSlide.desktop_video ? true : isVideoAsset(currentSlide.desktop_image);

  // Mobile asset: prefer video, fallback to image, fallback to desktop
  const mobileAsset = currentSlide.mobile_video || currentSlide.mobile_image || currentSlide.desktop_image;
  const mobileIsVideo = currentSlide.mobile_video ? true : (currentSlide.mobile_image ? isVideoAsset(currentSlide.mobile_image) : false);

  return (
    <section className="relative w-full overflow-hidden bg-offwhite min-h-[100vh] md:min-h-screen m-0 p-0">
      <div className="relative w-full h-full m-0 p-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full"
          >
            <Link
              href={ctaUrl}
              className="block relative w-full h-full cursor-pointer group"
              aria-label={currentSlide.title || "View featured collection"}
            >
              {/* Desktop Hero - Full viewport height */}
              <div className="hidden md:block relative w-full h-screen min-h-[100vh] overflow-hidden">
                {desktopIsVideo && desktopAsset ? (
                  <video
                    key={`desktop-${currentSlide.id}-video`}
                    src={getPublicUrl("banners", desktopAsset)}
                    className="w-full h-full object-cover object-center"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : desktopAsset ? (
                  <img
                    src={getPublicUrl("banners", desktopAsset)}
                    alt={currentSlide.title || "Hero Image"}
                    className="w-full h-full object-cover object-center"
                    loading={current === 0 ? "eager" : "lazy"}
                  />
                ) : null}
                
                {/* Editorial Text Overlay - Desktop - Moved upward */}
                <div className="absolute bottom-32 left-0 p-8 md:p-12 lg:p-16 max-w-2xl z-10">
                  <div className="relative">
                    {/* Subtle backdrop for legibility - only behind text */}
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] rounded-sm -z-10" />

                    <div className="relative space-y-3 md:space-y-4">
                      {/* Primary Heading */}
                      <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium leading-[1.1] tracking-tight text-[#3A3A3A] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                        {(!currentSlide.title || currentSlide.title.trim() === "New Slide") ? "Where Timeless Couture Meets Modern Women" : currentSlide.title}
                      </h1>

                      {/* Secondary Heading */}
                      <h2 className="font-sans text-base md:text-lg lg:text-xl font-light leading-relaxed text-[#4A4A4A] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                        {(!currentSlide.title || currentSlide.title.trim() === "New Slide") ? "Thoughtfully crafted for today's refined woman" : currentSlide.subtitle}
                      </h2>

                      {/* CTA Text */}
                      <p className="font-sans text-xs md:text-sm font-light leading-relaxed text-[#5A5A5A]/70 mt-4 md:mt-6 animate-pulse">
                        Click anywhere to browse full catalogue →
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Hero - Full viewport height */}
              <div className="block md:hidden relative w-full h-screen min-h-[100vh] overflow-hidden">
                {mobileIsVideo && mobileAsset ? (
                  <video
                    key={`mobile-${currentSlide.id}-video`}
                    src={getPublicUrl("banners", mobileAsset)}
                    className="w-full h-full object-cover object-center"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : mobileAsset ? (
                  <img
                    src={getPublicUrl("banners", mobileAsset)}
                    alt={currentSlide.title || "Hero Image"}
                    className="w-full h-full object-cover object-center"
                    loading={current === 0 ? "eager" : "lazy"}
                  />
                ) : null}
                
                {/* Editorial Text Overlay - Mobile - Moved upward */}
                <div className="absolute bottom-24 left-0 right-0 p-6 z-10">
                  <div className="relative">
                    {/* Subtle backdrop for legibility - only behind text */}
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] rounded-sm -z-10" />

                    <div className="relative space-y-2">
                      {/* Primary Heading */}
                      <h1 className="font-serif text-2xl font-medium leading-[1.1] tracking-tight text-[#3A3A3A] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                        {(!currentSlide.title || currentSlide.title.trim() === "New Slide") ? "Where Timeless Couture Meets Modern Women" : currentSlide.title}
                      </h1>

                      {/* Secondary Heading */}
                      <h2 className="font-sans text-sm font-light leading-relaxed text-[#4A4A4A] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                        {(!currentSlide.title || currentSlide.title.trim() === "New Slide") ? "Thoughtfully crafted for today's refined woman" : currentSlide.subtitle}
                      </h2>

                      {/* CTA Text */}
                      <p className="font-sans text-xs font-light leading-relaxed text-[#5A5A5A]/70 mt-3 animate-pulse">
                        Click anywhere to browse full catalogue →
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors z-20"
              aria-label="Previous slide"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                next();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors z-20"
              aria-label="Next slide"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
