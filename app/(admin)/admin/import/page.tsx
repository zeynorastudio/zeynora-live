import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import CsvUploadForm from "./components/CsvUploadForm";

export const metadata = {
  title: "Import Data | Admin Dashboard",
};

export default async function ImportPage() {
  const session = await getAdminSession();
  
  // Unauthenticated → login
  if (!session) {
    redirect("/admin/login");
  }
  
  // Admin (not super_admin) → inventory
  if (session.role !== "super_admin") {
    redirect("/admin/inventory");
  }

  // Super admin can access
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="serif-display text-3xl text-night mb-2">Bulk Import</h1>
      <p className="sans-base text-silver-dark mb-8">
        Upload CSV files to bulk import products and variants. Products CSV is required, Variants CSV is optional.
      </p>

      <CsvUploadForm />
    </div>
  );
}
