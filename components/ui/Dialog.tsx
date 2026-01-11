"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const DialogContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

interface DialogProps extends React.ComponentProps<"div"> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open: controlledOpen, onOpenChange, ...props }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open: !!open, setOpen }}>
      <div {...props}>{children}</div>
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, asChild, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { setOpen } = React.useContext(DialogContext);
  const { onClick, ...divProps } = props;
  return (
    <div onClick={(e) => { setOpen(true); onClick?.(e as any); }} className="cursor-pointer inline-block" {...(divProps as any)}>
      {children}
    </div>
  )
}

export function DialogContent({ children, className, ...props }: React.ComponentProps<"div">) {
  const { open, setOpen } = React.useContext(DialogContext);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={cn("bg-white p-6 rounded-lg relative min-w-[300px]", className)} {...props}>
          <button onClick={() => setOpen(false)} className="absolute top-2 right-2 text-gray-500 hover:text-black">✕</button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4",
        className
      )}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}
