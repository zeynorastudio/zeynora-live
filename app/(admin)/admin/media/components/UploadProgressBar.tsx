"use client";

import React from "react";

interface UploadProgressBarProps {
  progress: number; // 0 to 100
  total: number;
  completed: number;
}

export function UploadProgressBar({ progress, total, completed }: UploadProgressBarProps) {
  if (total === 0) return null;

  return (
    <div className="w-full bg-offwhite rounded-full h-2.5 mt-4 overflow-hidden border border-silver-light relative">
      <div
        className="bg-gold h-2.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      ></div>
      <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center">
         {/* Optional text inside bar if needed, but usually outside */}
      </div>
      <p className="text-xs text-center text-silver-dark mt-1">
        {completed} / {total} images processed
      </p>
    </div>
  );
}

