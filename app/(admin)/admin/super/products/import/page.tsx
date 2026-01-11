import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { ImportClient } from "./ImportClient";

export const metadata = {
  title: "Bulk Import Products | Super Admin",
};

export default async function BulkImportPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="serif-display text-night text-3xl">Bulk Import Products</h1>
        <p className="sans-base text-silver-dark mt-2">
          Import products and variants from CSV files. Super Admin only.
        </p>
      </div>

      <ImportClient />
    </div>
  );
}

















