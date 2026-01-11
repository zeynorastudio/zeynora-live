"use client";

import React from "react";
import CsvUploadForm from "@/app/(admin)/admin/import/components/CsvUploadForm"; // Reuse or adapt
import { AdminButton } from "@/components/admin/AdminButton";
import { Download } from "lucide-react";

export default function CsvImportPage() {
  // Stub for specific collection import logic if different from global
  // Phase 4.7 requirement: "Import/export CSV for categories and collections."
  // We reuse CsvUploadForm logic but point to new route /api/admin/collections/import if needed.
  // For now, simple placeholder.
  
  return (
    <div className="p-6">
      <h1 className="serif-display text-2xl mb-6">Import Collections</h1>
      <div className="mb-8">
        <h3 className="font-bold mb-2">Download Templates</h3>
        <div className="flex gap-4">
          <AdminButton variant="outline" icon={Download} onClick={() => window.open("/api/admin/collections/template?type=collection")}>Collections CSV</AdminButton>
          <AdminButton variant="outline" icon={Download} onClick={() => window.open("/api/admin/collections/template?type=assign")}>Product Assignment CSV</AdminButton>
        </div>
      </div>
      
      <div className="border p-6 rounded bg-white">
        <h3 className="font-bold mb-4">Upload CSV</h3>
        <p className="text-sm text-gray-500 mb-4">Upload a CSV to bulk create collections or assign products.</p>
        {/* Reusing generic upload form logic or new component */}
        <div className="text-center p-8 border-dashed border-2 rounded bg-offwhite text-gray-500">
           File Upload Component Here (Reuse CsvUploadForm logic)
        </div>
      </div>
    </div>
  );
}

