"use client";

import Navbar from "./Navbar";
import GoldenZeynoraHeader from "@/components/common/GoldenZeynoraHeader";

interface HeaderWrapperProps {
  festiveEnabled: boolean;
  initialWishlistCount: number;
  initialCartCount: number;
  onHeightChange: (height: number) => void;
}

export default function HeaderWrapper({
  festiveEnabled,
  initialWishlistCount,
  initialCartCount,
  onHeightChange,
}: HeaderWrapperProps) {
  return (
    <>
      <GoldenZeynoraHeader />
      <Navbar
        festiveEnabled={festiveEnabled}
        initialWishlistCount={initialWishlistCount}
        initialCartCount={initialCartCount}
      />
    </>
  );
}

