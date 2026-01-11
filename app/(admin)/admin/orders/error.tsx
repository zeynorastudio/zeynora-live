"use client";

import { AdminButton } from "@/components/admin/AdminButton";
import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="serif-display text-2xl text-night mb-2">Something went wrong!</h2>
      <p className="text-silver-dark mb-6 max-w-md">
        We couldn't fetch the orders. This might be a temporary server issue or a missing configuration.
      </p>
      <div className="flex gap-4">
        <AdminButton onClick={() => reset()}>Try again</AdminButton>
        <AdminButton variant="outline" onClick={() => window.location.reload()}>
          Reload Page
        </AdminButton>
      </div>
      <p className="text-xs text-silver-light mt-8 font-mono">
        Error: {error.message}
      </p>
    </div>
  );
}


