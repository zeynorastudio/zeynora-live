"use client";

import React, { useState } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { runImportAction } from "./actions";
import { useToastWithCompat } from "@/components/ui/use-toast";

interface ImportPreview {
  productsToCreate: number;
  variantsToCreate: number;
  productsNeedingUID: string[];
  generatedUIDs: Map<string, string>;
  duplicateSKUs: Array<{ sku: string; rows: number[] }>;
  variantImageMergePlan: Map<string, string[]>;
  missingImages: Array<{ product_uid: string; type: "main" | "variant" }>;
  conflicts: Array<{ type: "uid" | "sku"; value: string; message: string }>;
  errors: Array<{ row: number; file: "product" | "variant"; message: string }>;
}

interface ImportResult {
  success: boolean;
  products_created: number;
  variants_created: number;
  images_queued: number;
  errors: Array<{ row_index: number; file_type: "product" | "variant"; error_message: string }>;
  warnings: string[];
  batchId?: string;
}

export function ImportClient() {
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [variantsFile, setVariantsFile] = useState<File | null>(null);
  const [productsCSV, setProductsCSV] = useState<string | null>(null);
  const [variantsCSV, setVariantsCSV] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const { addToast } = useToastWithCompat();

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
    });
  };

  const handleProductsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".csv")) {
      addToast("Only CSV files are allowed", "error");
      return;
    }
    
    setProductsFile(file);
    const content = await fileToBase64(file);
    setProductsCSV(content);
    setPreview(null);
    setImportResult(null);
  };

  const handleVariantsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith(".csv")) {
      addToast("Only CSV files are allowed", "error");
      return;
    }
    
    setVariantsFile(file);
    const content = await fileToBase64(file);
    setVariantsCSV(content);
    setPreview(null);
    setImportResult(null);
  };

  const handlePreview = async () => {
    if (!productsCSV) {
      addToast("Please select a products CSV file", "error");
      return;
    }
    
    setIsPreviewing(true);
    try {
      const result = await runImportAction(productsCSV, variantsCSV, true);
      if ("dryRun" in result && result.dryRun && "preview" in result && result.preview) {
        // Convert Map to serializable format
        const previewData = {
          ...result.preview,
          generatedUIDs: Array.from(result.preview.generatedUIDs.entries()),
          variantImageMergePlan: Array.from(result.preview.variantImageMergePlan.entries()),
        };
        setPreview(previewData as any);
        addToast("Preview generated successfully", "success");
      }
    } catch (error: any) {
      addToast(error.message || "Preview failed", "error");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!productsCSV) {
      addToast("Please select a products CSV file", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await runImportAction(productsCSV, variantsCSV, false);
      if ("success" in result) {
        const mappedResult: ImportResult = {
          success: result.success,
          products_created: result.products_created,
          variants_created: result.variants_created,
          images_queued: result.images_queued,
          errors: result.errors.map(e => ({
            row_index: e.row_index,
            file_type: e.file_type,
            error_message: e.error_message,
          })),
          warnings: result.warnings,
          batchId: result.batchId,
        };
        setImportResult(mappedResult);
        if (result.success) {
          addToast(`Import completed: ${result.products_created} products, ${result.variants_created} variants`, "success");
        } else {
          addToast("Import completed with errors", "error");
        }
      }
    } catch (error: any) {
      addToast(error.message || "Import failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const clearFiles = () => {
    setProductsFile(null);
    setVariantsFile(null);
    setProductsCSV(null);
    setVariantsCSV(null);
    setPreview(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Products CSV */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-night">Products CSV *</label>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleProductsFileChange}
              className="hidden"
              id="products-file"
            />
            <label
              htmlFor="products-file"
              className={`flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                productsFile
                  ? "border-gold bg-gold/5"
                  : "border-silver-light hover:border-gold"
              }`}
            >
              {productsFile ? (
                <>
                  <FileText className="w-6 h-6 text-gold" />
                  <div className="text-left">
                    <p className="font-medium text-night">{productsFile.name}</p>
                    <p className="text-xs text-silver-dark">
                      {(productsFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-silver-dark" />
                  <span className="text-silver-dark">Click to upload products CSV</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Variants CSV */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-night">Variants CSV (Optional)</label>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleVariantsFileChange}
              className="hidden"
              id="variants-file"
            />
            <label
              htmlFor="variants-file"
              className={`flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                variantsFile
                  ? "border-blue-500 bg-blue-50"
                  : "border-silver-light hover:border-blue-500"
              }`}
            >
              {variantsFile ? (
                <>
                  <FileText className="w-6 h-6 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-night">{variantsFile.name}</p>
                    <p className="text-xs text-silver-dark">
                      {(variantsFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-silver-dark" />
                  <span className="text-silver-dark">Click to upload variants CSV</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <AdminButton
          onClick={handlePreview}
          disabled={!productsCSV || isPreviewing || isLoading}
          icon={isPreviewing ? Loader2 : Play}
        >
          {isPreviewing ? "Generating Preview..." : "Preview Import"}
        </AdminButton>
        
        <AdminButton
          onClick={handleImport}
          disabled={!productsCSV || isLoading || isPreviewing}
          icon={isLoading ? Loader2 : Upload}
          variant="primary"
        >
          {isLoading ? "Importing..." : "Start Import"}
        </AdminButton>
        
        {(productsFile || variantsFile) && (
          <AdminButton onClick={clearFiles} variant="outline" icon={X}>
            Clear Files
          </AdminButton>
        )}
      </div>

      {/* Preview Section */}
      {preview && (
        <div className="bg-white border border-silver-light rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-night flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Import Preview
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-silver-dark">Products to Create</p>
              <p className="text-2xl font-bold text-night">{preview.productsToCreate}</p>
            </div>
            <div>
              <p className="text-xs text-silver-dark">Variants to Create</p>
              <p className="text-2xl font-bold text-night">{preview.variantsToCreate}</p>
            </div>
            <div>
              <p className="text-xs text-silver-dark">UIDs to Generate</p>
              <p className="text-2xl font-bold text-gold">{preview.productsNeedingUID.length}</p>
            </div>
            <div>
              <p className="text-xs text-silver-dark">Conflicts</p>
              <p className="text-2xl font-bold text-red-600">{preview.conflicts.length}</p>
            </div>
          </div>

          {preview.generatedUIDs && Array.from(preview.generatedUIDs.entries()).length > 0 && (
            <div>
              <p className="text-sm font-medium text-night mb-2">Generated UIDs:</p>
              <div className="bg-offwhite p-3 rounded text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                {Array.from(preview.generatedUIDs.entries()).map(([key, uid]) => (
                  <div key={key}>{uid}</div>
                ))}
              </div>
            </div>
          )}

          {preview.conflicts.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Conflicts Found:
              </p>
              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm space-y-1">
                {preview.conflicts.map((conflict, idx) => (
                  <div key={idx} className="text-red-800">{conflict.message}</div>
                ))}
              </div>
            </div>
          )}

          {preview.duplicateSKUs.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-600 mb-2">Duplicate SKUs (will merge images):</p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm space-y-1">
                {preview.duplicateSKUs.map((dup, idx) => (
                  <div key={idx}>
                    SKU {dup.sku} appears in rows: {dup.rows.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Result Section */}
      {importResult && (
        <div className={`bg-white border rounded-lg p-6 space-y-4 ${
          importResult.success ? "border-green-200" : "border-red-200"
        }`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${
            importResult.success ? "text-green-600" : "text-red-600"
          }`}>
            {importResult.success ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            Import {importResult.success ? "Completed" : "Failed"}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-silver-dark">Products Created</p>
              <p className="text-2xl font-bold text-night">{importResult.products_created}</p>
            </div>
            <div>
              <p className="text-xs text-silver-dark">Variants Created</p>
              <p className="text-2xl font-bold text-night">{importResult.variants_created}</p>
            </div>
            <div>
              <p className="text-xs text-silver-dark">Images Queued</p>
              <p className="text-2xl font-bold text-night">{importResult.images_queued}</p>
            </div>
            <div>
              <p className="text-xs text-silver-dark">Errors</p>
              <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
            </div>
          </div>

          {importResult.batchId && (
            <p className="text-xs text-silver-dark">Batch ID: {importResult.batchId}</p>
          )}

          {importResult.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm space-y-1 max-h-48 overflow-y-auto">
                {importResult.errors.map((error, idx) => (
                  <div key={idx} className="text-red-800">
                    Row {error.row_index} ({error.file_type}): {error.error_message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResult.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-600 mb-2">Warnings:</p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm space-y-1 max-h-48 overflow-y-auto">
                {importResult.warnings.map((warning, idx) => (
                  <div key={idx} className="text-yellow-800">{warning}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-offwhite border border-silver-light rounded-lg p-6">
        <h3 className="text-sm font-bold text-night mb-3">Import Instructions</h3>
        <ul className="text-sm text-silver-dark space-y-2 list-disc list-inside">
          <li>Products CSV is required. Variants CSV is optional but recommended.</li>
          <li>If a product UID is missing, it will be auto-generated in format ZYN-XXXX.</li>
          <li>Tags column in products CSV is ignored. Use Tag_List from variants CSV.</li>
          <li>Variant images are merged by SKU (first row with Images_JSON is used).</li>
          <li>Missing images are allowed and can be added later via Media Library.</li>
          <li>Always preview before importing to catch conflicts and errors.</li>
        </ul>
      </div>
    </div>
  );
}

