"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DrawerContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

interface DrawerProps extends React.ComponentProps<"div"> {
  direction?: "right" | "left" | "top" | "bottom";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Drawer({ children, direction = "right", open: controlledOpen, onOpenChange, ...props }: DrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setUncontrolledOpen;

  return (
    <DrawerContext.Provider value={{ open: !!open, setOpen }}>
      <div {...props}>{children}</div>
    </DrawerContext.Provider>
  )
}

export function DrawerTrigger({ children, asChild, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = React.useContext(DrawerContext);
  const { onClick, ...divProps } = props;
  return (
    <div onClick={(e) => { setOpen(true); onClick?.(e as any); }} className="cursor-pointer inline-block" {...(divProps as any)}>
      {children}
    </div>
  )
}

export function DrawerContent({ children, className, ...props }: React.ComponentProps<"div">) {
  const { open, setOpen } = React.useContext(DrawerContext);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
    }}>
       <div className={cn("bg-white h-full w-full max-w-sm p-0 shadow-xl overflow-hidden", className)} {...props}>
         {children}
       </div>
    </div>
  )
}

export function DrawerClose({ children, asChild, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = React.useContext(DrawerContext);
  const { onClick, ...divProps } = props;
  return (
    <div onClick={(e) => { setOpen(false); onClick?.(e as any); }} className="cursor-pointer inline-block" {...(divProps as any)}>
      {children}
    </div>
  )
}
