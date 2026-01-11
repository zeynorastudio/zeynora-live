"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastProps } from "./use-toast";

export const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & ToastProps
>(({ className, variant = "default", title, description, action, ...props }, ref) => {
  const variantStyles = {
    default: "bg-white border-silver-light text-night",
    destructive: "bg-white border-red-200 text-red-800",
    success: "bg-white border-green-200 text-green-800",
    warning: "bg-white border-yellow-200 text-yellow-800",
    info: "bg-white border-blue-200 text-blue-800",
  };

  const iconMap = {
    default: <Info className="w-5 h-5 text-blue-500" />,
    destructive: <AlertCircle className="w-5 h-5 text-red-500" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center gap-3 min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-full fade-in duration-300",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {iconMap[variant]}
      <div className="flex-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        {description && <p className="text-xs opacity-90 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
});
Toast.displayName = "Toast";

export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { altText?: string }
>(({ className, altText, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "p-1 hover:bg-black/5 rounded-full transition-colors",
      className
    )}
    aria-label={altText || "Close"}
    {...props}
  >
    <X className="w-4 h-4 opacity-50 hover:opacity-100" />
  </button>
));
ToastAction.displayName = "ToastAction";