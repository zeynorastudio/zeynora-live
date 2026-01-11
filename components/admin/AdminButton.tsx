import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  isLoading?: boolean;
  icon?: React.ElementType;
}

export function AdminButton({ 
  className, 
  variant = "primary", 
  size = "default",
  isLoading = false,
  icon: Icon,
  children, 
  ...props 
}: AdminButtonProps) {
  
  const variants = {
    primary: "bg-night text-white hover:bg-charcoal border-transparent",
    secondary: "bg-gold text-white hover:bg-gold-dark border-transparent",
    outline: "bg-transparent text-night border-silver-light hover:border-silver-dark hover:bg-offwhite",
    danger: "bg-red-50 text-red-600 border-red-100 hover:bg-red-100",
    ghost: "bg-transparent text-night hover:bg-offwhite border-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "p-2",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gold/50 disabled:opacity-50 disabled:cursor-not-allowed",
        sizes[size],
        variants[variant],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!isLoading && Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
}
