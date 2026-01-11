"use client";

import {
  useToast,
} from "@/components/ui/use-toast";
import {
  Toast,
  ToastAction,
} from "@/components/ui/toast";
import { useEffect, useState } from "react";
import * as React from "react";

export function Toaster() {
  const { toasts } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const { id, title, description, variant, duration, action, open, onOpenChange } = toast;
        // Type assertion to work around TypeScript inference issue with forwardRef
        const toastProps = {
          id,
          ...(title != null && { title }),
          ...(description != null && { description }),
          variant,
          duration,
          action: action || (
            <ToastAction
              altText="Close"
              onClick={() => {
                if (onOpenChange) onOpenChange(false);
              }}
            />
          ),
        } as Parameters<typeof Toast>[0];
        return <Toast key={id} {...toastProps} />;
      })}
    </div>
  );
}

