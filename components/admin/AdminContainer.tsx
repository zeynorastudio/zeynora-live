import React from "react";
import { cn } from "@/lib/utils";

interface AdminContainerProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function AdminContainer({
  children,
  title,
  description,
  action,
  className,
}: AdminContainerProps) {
  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="serif-display text-3xl text-gold font-medium tracking-wide mb-2">
            {title}
          </h1>
          {description && (
            <p className="sans-base text-sm text-gray-500 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[400px] p-6">
        {children}
      </div>
    </div>
  );
}



