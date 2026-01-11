"use server";

import { getAdminSession } from "@/lib/auth/getAdminSession";
import { runImport, previewImport } from "@/lib/importer/index";
import { redirect } from "next/navigation";

export async function runImportAction(
  productsCSV: string | null,
  variantsCSV: string | null,
  dryRun: boolean = false
) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }
  
  if (session.role !== "super_admin") {
    throw new Error("Unauthorized: Super admin access required");
  }
  
  if (!productsCSV) {
    throw new Error("Products CSV is required");
  }
  
  if (dryRun) {
    const preview = await previewImport(productsCSV, variantsCSV || "");
    return { preview, dryRun: true };
  }
  
  const result = await runImport(productsCSV, variantsCSV || "", {
    dryRun: false,
    revalidatePaths: ["/admin/super/products"],
  });
  
  return result;
}





