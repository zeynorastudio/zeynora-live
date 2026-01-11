"use client";

import React, { useState } from "react";
import { FileDropzone } from "./FileDropzone";
import { DetectionResultList } from "./DetectionResultList";
import { ManualMappingModal } from "./ManualMappingModal";
import { UploadProgressBar } from "./UploadProgressBar";
import { ImageDetectionResult } from "@/lib/admin/media/parser"; // Type
import { AdminButton } from "@/components/admin/AdminButton";
import { Upload, X } from "lucide-react";
import { useToastWithCompat } from "@/components/ui/use-toast";

export default function ImageUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Record<string, ImageDetectionResult>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, "pending" | "uploading" | "success" | "error">>({});
  const [isUploading, setIsUploading] = useState(false);
  const [mappingFile, setMappingFile] = useState<string | null>(null);
  
  const { addToast } = useToastWithCompat();

  const handleDrop = async (acceptedFiles: File[]) => {
    // 1. Add files
    const newFiles = [...files, ...acceptedFiles];
    setFiles(newFiles);

    // 2. Detect Metadata for new files
    // Optimistic / Client-side parser usage or API? 
    // "Implement filename parsing inside: /app/api/admin/media/detect/route.ts"
    // So we should call the API.
    
    try {
      const fileNames = acceptedFiles.map((f) => f.name);
      const res = await fetch("/api/admin/media/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileNames }),
      });
      
      if (!res.ok) throw new Error("Detection API failed");
      
      const data = await res.json();
      const newResults = { ...results };
      data.results.forEach((r: ImageDetectionResult) => {
        newResults[r.fileName] = r;
      });
      setResults(newResults);
    } catch (error) {
      addToast("Failed to detect image metadata", "error");
    }
  };

  const handleManualMap = (fileName: string) => {
    setMappingFile(fileName);
  };

  const confirmManualMap = (uid: string, type: string) => {
    if (!mappingFile) return;
    
    setResults((prev) => ({
      ...prev,
      [mappingFile]: {
        status: "success",
        fileName: mappingFile,
        uid,
        imageType: type as any,
      },
    }));
    setMappingFile(null);
  };

  const handleUpload = async () => {
    setIsUploading(true);
    let successCount = 0;

    // Process files one by one or in small batches
    // Requirement: "Upload 200 images in one batch" -> Concurrent requests or sequential?
    // Browser limits concurrent connections (usually 6).
    // Let's do a simple queue/loop with concurrency control (e.g. 4).
    
    const queue = files.filter(f => {
       const res = results[f.name];
       const status = uploadStatus[f.name];
       return res?.status === "success" && status !== "success";
    });

    const concurrency = 4;
    let index = 0;

    const processFile = async (file: File) => {
      const result = results[file.name];
      if (!result || !result.uid || !result.imageType) return;

      setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("product_uid", result.uid);
      formData.append("image_type", result.imageType);

      try {
        const res = await fetch("/api/admin/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }));
        successCount++;
      } catch (error) {
        setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }));
      }
    };

    const runQueue = async () => {
       const promises = [];
       while (index < queue.length) {
         const file = queue[index++];
         const p = processFile(file);
         promises.push(p);
         if (promises.length >= concurrency) {
           await Promise.race(promises); // Wait for at least one to finish? 
           // Simplistic logic: Just await chunk of 4 or similar.
           // Actually, Promise.all on chunks is easier.
         }
       }
       await Promise.all(promises);
    };

    // Chunk implementation for simplicity
    for (let i = 0; i < queue.length; i += concurrency) {
      const chunk = queue.slice(i, i + concurrency);
      await Promise.all(chunk.map(processFile));
    }

    setIsUploading(false);
    if (successCount > 0) {
      addToast(`Successfully uploaded ${successCount} images`, "success");
    }
  };

  const clearCompleted = () => {
    const pendingFiles = files.filter(f => uploadStatus[f.name] !== "success");
    setFiles(pendingFiles);
    // Cleanup results/status? Optional.
  };

  // Stats
  const totalFiles = files.length;
  const completedFiles = files.filter(f => uploadStatus[f.name] === "success").length;
  const readyToUpload = files.filter(f => results[f.name]?.status === "success" && uploadStatus[f.name] !== "success").length;
  const manualRequired = files.filter(f => results[f.name]?.status === "manual_required").length;

  return (
    <div className="bg-white p-6 rounded-lg border border-silver-light shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="serif-display text-xl text-night">Bulk Image Upload</h2>
        {completedFiles > 0 && !isUploading && (
          <button onClick={clearCompleted} className="text-sm text-silver-dark hover:text-gold">
            Clear Completed
          </button>
        )}
      </div>

      <FileDropzone onDrop={handleDrop} disabled={isUploading} />

      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-silver-dark">
              {readyToUpload} ready • {manualRequired} need mapping • {completedFiles} completed
            </p>
            <AdminButton 
              onClick={handleUpload} 
              disabled={isUploading || readyToUpload === 0}
              icon={Upload}
            >
              {isUploading ? "Uploading..." : "Start Upload"}
            </AdminButton>
          </div>

          <UploadProgressBar 
            progress={totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0} 
            total={totalFiles} 
            completed={completedFiles} 
          />

          <DetectionResultList 
            files={files} 
            results={results} 
            uploadStatus={uploadStatus} 
            onManualMap={handleManualMap}
          />
        </>
      )}

      {mappingFile && (
        <ManualMappingModal
          isOpen={!!mappingFile}
          onClose={() => setMappingFile(null)}
          fileName={mappingFile}
          onConfirm={confirmManualMap}
        />
      )}
    </div>
  );
}

