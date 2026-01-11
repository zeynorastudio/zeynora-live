import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  shadowVariant?: "default" | "warm-xs" | "warm-sm";
}

export default function Card({
  className = "",
  shadowVariant = "default",
  children,
  ...props
}: CardProps) {
  const shadowClasses = {
    default: "shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
    "warm-xs": "shadow-warm-xs",
    "warm-sm": "shadow-warm-sm",
  };

  return (
    <div
      className={`rounded-xl border border-silver/30 bg-offwhite ${shadowClasses[shadowVariant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

