"use client";

import React from "react";

export function AdminTopBar() {
  return (
    <header className="h-14 bg-offwhite border-b border-silver w-full flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
      {/* Left: Placeholder / Mobile Toggle Area */}
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-night serif-display">
          Zeynora Admin
        </div>
      </div>

      {/* Right: User Info */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-night sans-base">Administrator</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-sm border border-gold/30">
          A
        </div>
      </div>
    </header>
  );
}

