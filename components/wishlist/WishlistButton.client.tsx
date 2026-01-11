"use client";

import React from "react";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

interface WishlistButtonProps {
  productUid: string;
  className?: string;
  iconSize?: number;
  variant?: "default" | "outline" | "subtle" | "primary";
  fullWidth?: boolean;
  showLabel?: boolean;
}

export default function WishlistButton({ 
  productUid, 
  className,
  iconSize = 20,
  variant = "default",
  fullWidth = false,
  showLabel = false,
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const isActive = isInWishlist(productUid);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if inside a link card
    e.stopPropagation();

    // Pure local persistence as per patch rules
    toggleWishlist(productUid);
  };

  // If showLabel or fullWidth, render as a Button component
  if (showLabel || fullWidth) {
    return (
      <Button
        onClick={handleClick}
        variant={variant}
        className={cn(
          "gap-2",
          fullWidth && "w-full",
          isActive && "text-gold border-gold hover:bg-gold/5",
          className
        )}
      >
        <Heart 
          size={iconSize} 
          fill={isActive ? "currentColor" : "none"}
          className="transition-transform active:scale-90"
        />
        {showLabel && (isActive ? "Saved" : "Save to Wishlist")}
      </Button>
    );
  }

  // Default icon-only button
  return (
    <button
      onClick={handleClick}
      className={cn(
        "rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-gold",
        isActive ? "text-gold" : "text-gray-400 hover:text-gold",
        className
      )}
      aria-label={isActive ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isActive}
    >
      <Heart 
        size={iconSize} 
        fill={isActive ? "currentColor" : "none"}
        className="transition-transform active:scale-90"
      />
    </button>
  );
}



