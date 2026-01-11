"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProviderProps {
  children: React.ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

export interface TooltipProps {
  children: React.ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  return <>{children}</>;
}

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function TooltipTrigger({ children, asChild, ...props }: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      title: props.title || (children.props as any).title,
    } as any);
  }
  return <div {...props}>{children}</div>;
}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function TooltipContent({ children, className = "", ...props }: TooltipContentProps) {
  return (
    <div
      className={cn(
        "z-50 overflow-hidden rounded-md bg-night px-3 py-1.5 text-xs text-offwhite shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}


















