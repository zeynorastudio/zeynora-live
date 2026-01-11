"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function BulkStockUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastWithCompat();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith(".csv")) {
        addToast("Only .csv files are allowed", "error");
        return;
      }
      setFile(selected);
      setUploadStatus(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.name.endsWith(".csv")) {
        addToast("Only .csv files are allowed", "error");
        return;
      }
      setFile(selected);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("csv_file", file); // Route expects 'csv_file' or we adapt route if needed. Route stub uses 'csv_file' commented out.

    try {
      // Note: The route is currently a placeholder/stub as per previous phase check.
      // It might return 501 Not Implemented or similar. We handle it gracefully.
      const response = await fetch("/api/admin/products/bulk-upload-csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        // If it's 501, show the message but treat as info/warning
        if (response.status === 501) {
           setUploadStatus({ success: false, message: data.message || "Bulk upload not fully implemented yet." });
           addToast("Feature placeholder reached", "info");
        } else {
           throw new Error(data.error || "Upload failed");
        }
      } else {
        setUploadStatus({ success: true, message: `Successfully processed ${file.name}` });
        addToast("Bulk upload completed", "success");
        setFile(null);
      }
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      setUploadStatus({ success: false, message: error.message || "Network error occurred" });
      addToast("Upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-silver-light shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="serif-display text-lg text-night">Bulk Stock Update</h3>
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); /* Generate sample CSV logic or link */ }}
          className="text-xs text-gold hover:underline"
        >
          Download Sample CSV
        </a>
      </div>

      <div 
        className={cn(
          "border-2 border-dashed border-silver-light rounded-lg p-8 text-center transition-all duration-200",
          isDragActive ? "border-gold bg-gold/5" : "hover:border-silver-dark hover:bg-offwhite/30",
          file ? "bg-offwhite/50 border-silver-dark" : ""
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          accept=".csv" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {!file ? (
          <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud className="w-8 h-8 text-silver-dark mb-3" />
            <p className="text-sm font-medium text-night">Click to upload or drag & drop</p>
            <p className="text-xs text-silver-dark mt-1">CSV format: sku,stock (Max 5MB)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FileSpreadsheet className="w-8 h-8 text-gold mb-3" />
            <p className="text-sm font-medium text-night mb-1">{file.name}</p>
            <p className="text-xs text-silver-dark mb-4">{(file.size / 1024).toFixed(1)} KB</p>
            
            <div className="flex gap-2">
              <AdminButton onClick={handleUpload} isLoading={isUploading} disabled={isUploading}>
                {isUploading ? "Uploading..." : "Process File"}
              </AdminButton>
              <AdminButton variant="outline" onClick={() => setFile(null)} disabled={isUploading}>
                Change File
              </AdminButton>
            </div>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className={cn(
          "p-3 rounded-lg text-sm flex items-start gap-2",
          uploadStatus.success ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-800"
        )}>
          {uploadStatus.success ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <p>{uploadStatus.message}</p>
        </div>
      )}
    </div>
  );
}


