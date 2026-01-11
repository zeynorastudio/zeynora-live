import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Avatar({ className = "", children, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  src?: string;
  alt?: string;
}

export function AvatarImage({ className = "", src, alt, ...props }: AvatarImageProps) {
  return (
    <img
      className={cn("aspect-square h-full w-full", className)}
      src={src}
      alt={alt}
      {...props}
    />
  );
}

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function AvatarFallback({ className = "", children, ...props }: AvatarFallbackProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-silver-light text-night",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}


















