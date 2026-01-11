"use client";

import React from "react";
import { ImportSummary } from "@/lib/importer/types";
import { CheckCircle, AlertOctagon, Info } from "lucide-react";

interface ImportSummaryPanelProps {
  summary: ImportSummary;
}

export function ImportSummaryPanel({ summary }: ImportSummaryPanelProps) {
  const hasErrors = summary.errors.length > 0 || summary.writeErrors.length > 0;
  const hasWarnings = summary.products_with_pending_images.length > 0;

  return (
    <div className="space-y-6 mt-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-xs text-green-700 uppercase font-bold tracking-wider">Products</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {summary.products_created} <span className="text-sm font-normal text-green-600">new</span>
          </p>
          <p className="text-xs text-green-600 mt-1">{summary.products_updated} updated</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-xs text-blue-700 uppercase font-bold tracking-wider">Variants</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {summary.variants_created} <span className="text-sm font-normal text-blue-600">new</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">{summary.variants_updated} updated</p>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
          <p className="text-xs text-indigo-700 uppercase font-bold tracking-wider">Metadata</p>
          <div className="mt-1 space-y-0.5">
             <p className="text-sm text-indigo-900">{summary.categories_created} categories</p>
             <p className="text-sm text-indigo-900">{summary.tags_created} tags</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-silver-light p-4 rounded-lg">
           <p className="text-xs text-silver-dark uppercase font-bold tracking-wider">Processed</p>
           <div className="mt-1 space-y-0.5">
             <p className="text-sm text-night">{summary.total_products_processed} products</p>
             <p className="text-sm text-night">{summary.total_variants_processed} variants</p>
             <p className="text-sm text-silver-dark">{summary.skipped_rows_count} skipped</p>
           </div>
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
          <div className="flex">
            <Info className="h-5 w-5 text-yellow-500 mr-3" />
            <div>
              <h4 className="text-sm font-bold text-yellow-800">Pending Images</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {summary.products_with_pending_images.length} products have pending remote image downloads. 
                These will appear as placeholders until processed or uploaded manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="border border-red-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center">
            <AlertOctagon className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-red-900 font-bold text-sm">Import Errors</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
             <table className="min-w-full divide-y divide-red-100">
               <thead className="bg-red-50/50">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Row</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Type</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Message</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-red-100">
                 {summary.errors.map((err, i) => (
                   <tr key={i}>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-silver-dark">
                       {err.row_index > 0 ? err.row_index : "N/A"}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-night capitalize">
                       {err.file_type}
                     </td>
                     <td className="px-6 py-4 text-sm text-red-600">
                       {err.error_message}
                     </td>
                   </tr>
                 ))}
                 {summary.writeErrors.map((err, i) => (
                   <tr key={`write-${i}`}>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-silver-dark">DB</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-night capitalize">
                       {err.type || "Write Error"}
                     </td>
                     <td className="px-6 py-4 text-sm text-red-600">
                       {err.message}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}

