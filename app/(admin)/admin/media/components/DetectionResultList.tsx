"use client";

import React from "react";
import { CheckCircle, AlertTriangle, File as FileIcon, Loader2 } from "lucide-react";
import { ImageDetectionResult } from "@/lib/admin/media/parser"; // Type only, not runtime

// Define interface locally if import fails or causes issues in client component
interface DetectionResultListProps {
  files: File[];
  results: Record<string, ImageDetectionResult>; // Map fileName -> Result
  uploadStatus: Record<string, "pending" | "uploading" | "success" | "error">;
  onManualMap: (fileName: string) => void;
}

export function DetectionResultList({
  files,
  results,
  uploadStatus,
  onManualMap,
}: DetectionResultListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3 mt-6">
      {files.map((file) => {
        const result = results[file.name];
        const status = uploadStatus[file.name] || "pending";
        const isManualRequired = result?.status === "manual_required";

        return (
          <div
            key={file.name}
            className="flex items-center justify-between p-3 bg-white border border-silver-light rounded-md shadow-sm"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 bg-offwhite rounded flex items-center justify-center flex-shrink-0">
                 <FileIcon className="w-5 h-5 text-silver-dark" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-night truncate max-w-[200px] sm:max-w-xs">
                  {file.name}
                </p>
                <div className="text-xs text-silver-dark flex items-center space-x-2">
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  {result?.uid && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-night">{result.uid}</span>
                    </>
                  )}
                  {result?.imageType && (
                    <>
                      <span>•</span>
                      <span className="uppercase text-[10px] bg-gold/10 text-gold-darker px-1.5 py-0.5 rounded">
                        {result.imageType}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 flex-shrink-0">
              {status === "uploading" && (
                <span className="text-xs text-blue-600 flex items-center">
                  <Loader2 className="w-3 h-3 animate-spin mr-1" /> Uploading
                </span>
              )}
              {status === "success" && (
                <span className="text-xs text-green-600 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" /> Done
                </span>
              )}
              {status === "error" && (
                <span className="text-xs text-red-600 flex items-center">
                  Error
                </span>
              )}
              
              {isManualRequired && status === "pending" && (
                <button
                  onClick={() => onManualMap(file.name)}
                  className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-100 transition-colors flex items-center"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Map Manually
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

