"use client";

import React, { useCallback } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { UploadCloud } from "lucide-react";

interface FileDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ onDrop, disabled }: FileDropzoneProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (acceptedFiles.length > 0) {
        onDrop(acceptedFiles);
      }
      // Handle rejections if needed (e.g., too large, wrong type)
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-gold bg-gold/5"
          : "border-silver-light hover:border-gold hover:bg-offwhite"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="w-10 h-10 mx-auto text-silver-dark mb-4" />
      <p className="text-night font-medium">
        {isDragActive
          ? "Drop the files here..."
          : "Drag & drop images here, or click to select files"}
      </p>
      <p className="text-sm text-silver-dark mt-2">
        Supports JPG, PNG, WEBP.
      </p>
    </div>
  );
}

