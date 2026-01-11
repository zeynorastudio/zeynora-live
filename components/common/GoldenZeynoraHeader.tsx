"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Luxe top header bar for ZEYNORA.
 * Fixed position, stable height, exposed via data attribute.
 * Background: Softened vine with champagne accents per brand system.
 */
export default function GoldenZeynoraHeader() {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      const updateHeight = () => {
        if (headerRef.current) {
          const height = headerRef.current.getBoundingClientRect().height;
          headerRef.current.setAttribute("data-header-height", height.toString());
          document.documentElement.style.setProperty("--topbar-height", `${height}px`);
        }
      };
      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }
  }, []);

  return (
    <div
      ref={headerRef}
      data-header-part="topbar"
      className="w-full bg-vine text-white border-b border-champagne/35"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col items-center gap-1 text-center">
        <Link
          href="/"
          className="serif-display text-2xl sm:text-3xl tracking-[0.4em] text-champagne uppercase"
        >
          ZEYNORA
        </Link>
        <p className="text-xs sm:text-sm tracking-[0.35em] uppercase text-soft-gold">
          Atelier · Couture · Heritage
        </p>
      </div>
    </div>
  );
}

