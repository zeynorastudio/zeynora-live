import { AdminCard } from "@/components/admin/AdminCard";
import { AdminButton } from "@/components/admin/AdminButton";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function SuperAdminSettingsPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-3xl">Global Settings</h1>
        <p className="sans-base text-silver-dark mt-2">Super admin system configuration</p>
      </div>

      <AdminCard title="System Configuration">
        <div className="space-y-6 p-6">
          <div className="h-12 bg-offwhite rounded border border-silver-light flex items-center px-4 text-silver-dark">
            TODO: Maintenance Mode Toggle
          </div>
           <div className="h-12 bg-offwhite rounded border border-silver-light flex items-center px-4 text-silver-dark">
            TODO: Feature Flags
          </div>
          
          <div className="flex justify-end">
            <AdminButton disabled>Save Config</AdminButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
