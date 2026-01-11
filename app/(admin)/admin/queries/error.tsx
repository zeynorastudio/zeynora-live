"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="serif-display text-2xl text-night mb-2">Something went wrong</h2>
      <p className="text-silver-dark max-w-md mb-6">
        We couldn't load the queries. This might be due to a network issue or missing permissions.
      </p>
      <div className="flex gap-4">
        <AdminButton onClick={() => window.location.reload()} variant="outline">
          Reload Page
        </AdminButton>
        <AdminButton onClick={() => reset()}>
          Try Again
        </AdminButton>
      </div>
      <div className="mt-8 p-4 bg-offwhite rounded border border-silver-light text-xs text-left font-mono text-silver-darker w-full max-w-lg overflow-auto">
        {error.message || "Unknown error occurred"}
      </div>
    </div>
  );
}


