import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "subtle" | "primary";
  isLoading?: boolean;
  icon?: React.ElementType;
  fullWidth?: boolean;
  href?: string;
}

export default function Button({
  variant = "default",
  isLoading = false,
  className = "",
  icon: Icon,
  fullWidth,
  href,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    default: "bg-gold text-night hover:bg-gold/90",
    primary: "bg-gold text-night hover:bg-gold/90",
    outline: "border border-gold bg-transparent text-gold hover:bg-gold/10",
    subtle: "bg-cream text-bronze hover:bg-cream/80",
  };

  const classes = `${baseStyles} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`;

  if (href) {
    const Link = require("next/link").default;
    return (
      <Link href={href} className={classes} {...(props as any)}>
        {isLoading ? "Loading..." : (
          <>
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {children}
          </>
        )}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? "Loading..." : (
        <>
          {Icon && <Icon className="w-4 h-4 mr-2" />}
          {children}
        </>
      )}
    </button>
  );
}


