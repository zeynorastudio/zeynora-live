"use client";

import { ReactNode, useState, useLayoutEffect, useRef } from "react";
import Footer from "@/components/common/Footer";
import HeaderWrapper from "@/components/navigation/HeaderWrapper";

interface StorefrontLayoutClientProps {
  children: ReactNode;
  festiveEnabled: boolean;
  initialWishlistCount: number;
  initialCartCount: number;
}

export function StorefrontLayoutClient({
  children,
  festiveEnabled,
  initialWishlistCount,
  initialCartCount,
}: StorefrontLayoutClientProps) {
  const [headerHeight, setHeaderHeight] = useState(140); // SSR fallback
  const headerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(height);
      }
    };

    // Initial measurement
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);
    const resizeObserver = new ResizeObserver(updateHeight);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-50">
        <HeaderWrapper
          festiveEnabled={festiveEnabled}
          initialWishlistCount={initialWishlistCount}
          initialCartCount={initialCartCount}
          onHeightChange={setHeaderHeight}
        />
      </div>
      <main
        className="flex-1"
        style={{ paddingTop: `${headerHeight}px` }}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

