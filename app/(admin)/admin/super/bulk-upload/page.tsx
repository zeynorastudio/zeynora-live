import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function SuperAdminBulkUploadPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-2xl">Bulk Upload</h1>
        <p className="sans-base text-silver-dark mt-2">Import products via CSV/Excel</p>
      </div>
      
      <div className="h-64 bg-white rounded-xl border border-silver-light flex items-center justify-center text-silver-dark">
        TODO: Bulk upload implementation
      </div>
    </div>
  );
}


