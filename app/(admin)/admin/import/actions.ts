"use server";

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { runImport } from "@/lib/importer/index";
import { ImportSummary } from "@/lib/importer/types";

export async function runImportAction(
  productsBase64: string,
  variantsBase64?: string
): Promise<{ success: boolean; summary?: ImportSummary; error?: string }> {
  try {
    console.log("🔨 Import action called");
    
    // Check auth
    const session = await getAdminSession();
    if (!session) {
      console.error("❌ No session");
      return { success: false, error: "Not authenticated" };
    }
    
    if (session.role !== "super_admin") {
      console.error("❌ Not super_admin");
      return { success: false, error: "Only Super Admins can run imports" };
    }

    console.log("✅ Auth passed, decoding CSVs...");

    // Decode base64 to CSV strings
    const productsCsv = Buffer.from(productsBase64, "base64").toString("utf-8");
    const variantsCsv = variantsBase64 
      ? Buffer.from(variantsBase64, "base64").toString("utf-8") 
      : "";

    console.log("📄 Products CSV length:", productsCsv.length);
    console.log("📄 Variants CSV length:", variantsCsv.length);

    // Validate headers
    const productLines = productsCsv.split("\n");
    if (productLines.length < 2) {
      return { success: false, error: "Products CSV must have header and at least one data row" };
    }

    const productHeaders = productLines[0].toLowerCase();
    const requiredHeaders = ["uid", "name", "price"];
    
    for (const header of requiredHeaders) {
      if (!productHeaders.includes(header)) {
        return { 
          success: false, 
          error: `Products CSV missing required header: ${header}` 
        };
      }
    }

    console.log("💾 Running importer...");

    // Run the importer
    const summary = await runImport(productsCsv, variantsCsv, {
      isFilePath: false,
      dryRun: false,
    });

    console.log("✅ Import complete:", {
      products_created: summary.products_created,
      products_updated: summary.products_updated,
      variants_created: summary.variants_created,
      variants_updated: summary.variants_updated,
      errors: summary.errors.length,
    });

    return { success: true, summary };

  } catch (error: any) {
    console.error("💥 Import error:", error);
    return { 
      success: false, 
      error: error.message || "Import failed" 
    };
  }
}

























