"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
  defaultValue?: string;
  className?: string;
}

export interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  setOpen?: (open: boolean) => void;
  open?: boolean;
}

const SelectContext = React.createContext<SelectContextValue>({});

function SelectComponent({
  className = "",
  children,
  onValueChange,
  value,
  defaultValue,
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(value || defaultValue || "");
  const [open, setOpen] = React.useState(false);
  
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  const currentValue = value !== undefined ? value : internalValue;

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, setOpen, open }}>
      <div className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export default SelectComponent;
export { SelectComponent as Select };

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function SelectTrigger({ className = "", children, ...props }: SelectTriggerProps) {
  const context = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-md border border-silver bg-cream px-3 py-2 text-night focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent flex items-center justify-between",
        className
      )}
      onClick={() => context.setOpen?.(!context.open)}
      {...props}
    >
      {children}
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  return <span className="text-silver-dark">{context.value || placeholder}</span>;
}

export interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SelectContent({ children, className = "" }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  
  if (!context.open) return null;
  
  return (
    <div className={cn(
      "absolute z-50 mt-1 w-full rounded-md border border-silver bg-white shadow-lg",
      className
    )}>
      <div className="max-h-60 overflow-auto">
        {children}
      </div>
    </div>
  );
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectItem({ value, children, className = "" }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      className={cn(
        "w-full px-3 py-2 text-left text-sm hover:bg-cream focus:bg-cream focus:outline-none",
        context.value === value && "bg-cream/50",
        className
      )}
      onClick={() => {
        context.onValueChange?.(value);
        context.setOpen?.(false);
      }}
    >
      {children}
    </button>
  );
}
