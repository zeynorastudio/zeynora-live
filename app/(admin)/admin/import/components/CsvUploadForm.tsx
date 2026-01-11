"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin/AdminButton";
import { Upload, FileText, Loader2 } from "lucide-react";
import { ImportSummaryPanel } from "./ImportSummaryPanel";
import { ImportSummary } from "@/lib/importer/types";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { runImportAction } from "../actions";

export default function CsvUploadForm() {
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [variantsFile, setVariantsFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { addToast } = useToastWithCompat();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "products" | "variants") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.name.endsWith(".csv")) {
        addToast("Please select a CSV file", "error");
        return;
      }
      
      if (type === "products") {
        setProductsFile(file);
        console.log("📁 Products file selected:", file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
      } else {
        setVariantsFile(file);
        console.log("📁 Variants file selected:", file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Remove data:text/csv;base64, prefix
          const base64 = reader.result.split(",")[1];
          resolve(base64);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRunImport = async () => {
    if (!productsFile) {
      addToast("Please select a Products CSV file", "error");
      return;
    }

    setIsProcessing(true);
    setSummary(null);

    try {
      console.log("🔄 Converting files to base64...");
      
      // Convert files to base64
      const productsBase64 = await fileToBase64(productsFile);
      const variantsBase64 = variantsFile ? await fileToBase64(variantsFile) : undefined;

      console.log("✅ Files converted, calling server action...");

      // Call server action
      const result = await runImportAction(productsBase64, variantsBase64);

      if (!result.success) {
        throw new Error(result.error || "Import failed");
      }

      if (result.summary) {
        setSummary(result.summary);
        
        const totalCreated = result.summary.products_created + result.summary.variants_created;
        const totalUpdated = result.summary.products_updated + result.summary.variants_updated;
        const hasErrors = result.summary.errors.length > 0 || result.summary.writeErrors.length > 0;
        
        if (hasErrors) {
          addToast(`Import completed with ${result.summary.errors.length + result.summary.writeErrors.length} errors`, "warning");
        } else {
          addToast(`Success! Created ${totalCreated}, Updated ${totalUpdated}`, "success");
        }
      }

    } catch (error: any) {
      console.error("💥 Import error:", error);
      addToast(error.message || "Import failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearFiles = () => {
    setProductsFile(null);
    setVariantsFile(null);
    setSummary(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-silver-light shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="serif-display text-xl text-night">CSV Import</h2>
        {(productsFile || variantsFile) && !isProcessing && (
          <button
            onClick={handleClearFiles}
            className="text-sm text-silver-dark hover:text-night transition-colors"
          >
            Clear Files
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products CSV Input */}
        <div className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          productsFile 
            ? "border-gold bg-gold/5" 
            : "border-silver-light hover:bg-offwhite hover:border-gold/50"
        }`}>
          <label className="block text-center cursor-pointer">
            <FileText className={`w-8 h-8 mx-auto mb-2 ${
              productsFile ? "text-gold" : "text-silver-dark"
            }`} />
            <span className="block font-medium text-night">
              {productsFile ? productsFile.name : "Select Products CSV"}
            </span>
            {productsFile && (
              <span className="block text-xs text-silver-dark mt-1">
                {(productsFile.size / 1024).toFixed(2)} KB
              </span>
            )}
            {!productsFile && (
              <span className="block text-xs text-red-600 mt-1 font-medium">Required</span>
            )}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileChange(e, "products")}
              disabled={isProcessing}
            />
          </label>
        </div>

        {/* Variants CSV Input */}
        <div className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          variantsFile 
            ? "border-blue-400 bg-blue-50/30" 
            : "border-silver-light hover:bg-offwhite hover:border-blue-400/50"
        }`}>
          <label className="block text-center cursor-pointer">
            <FileText className={`w-8 h-8 mx-auto mb-2 ${
              variantsFile ? "text-blue-600" : "text-silver-dark"
            }`} />
            <span className="block font-medium text-night">
              {variantsFile ? variantsFile.name : "Select Variants CSV"}
            </span>
            {variantsFile && (
              <span className="block text-xs text-silver-dark mt-1">
                {(variantsFile.size / 1024).toFixed(2)} KB
              </span>
            )}
            {!variantsFile && (
              <span className="block text-xs text-silver-dark mt-1">Optional</span>
            )}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileChange(e, "variants")}
              disabled={isProcessing}
            />
          </label>
        </div>
      </div>

      {/* Import Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-bold text-blue-900 mb-2">Import Instructions:</h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• <strong>Products CSV</strong> is required and must contain: uid, name, price</li>
          <li>• <strong>Variants CSV</strong> is optional and overrides auto-generated variants</li>
          <li>• Single-color products will map to "default" color</li>
          <li>• SKUs are auto-generated if not provided</li>
          <li>• Image URLs will be automatically downloaded if provided</li>
        </ul>
      </div>

      <div className="mt-8 flex justify-end">
        <AdminButton
          onClick={handleRunImport}
          disabled={!productsFile || isProcessing}
          icon={isProcessing ? Loader2 : Upload}
          className={isProcessing ? "opacity-80" : ""}
        >
          {isProcessing ? "Running Import..." : "Run Import"}
        </AdminButton>
      </div>

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-900">Processing import...</p>
              <p className="text-xs text-blue-700 mt-1">
                This may take a few moments. Please don't close this page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && <ImportSummaryPanel summary={summary} />}
    </div>
  );
}
