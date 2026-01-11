import { AdminCard } from "@/components/admin/AdminCard";
import { AdminButton } from "@/components/admin/AdminButton";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-3xl">Settings</h1>
        <p className="sans-base text-silver-dark mt-2">Store configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-2">
          <h3 className="font-medium text-night">General</h3>
          <nav className="flex flex-col space-y-1">
            <button className="text-left px-3 py-2 text-sm font-medium text-night bg-offwhite rounded-md">Store Details</button>
            <button className="text-left px-3 py-2 text-sm text-silver-darker hover:bg-offwhite rounded-md">Notifications</button>
            <button className="text-left px-3 py-2 text-sm text-silver-darker hover:bg-offwhite rounded-md">Users</button>
          </nav>
        </div>

        <div className="lg:col-span-2">
          <AdminCard title="Store Details">
            <div className="space-y-4">
              <div className="h-10 bg-offwhite rounded border border-silver-light" />
              <div className="h-10 bg-offwhite rounded border border-silver-light" />
              <div className="h-32 bg-offwhite rounded border border-silver-light" />
              
              <div className="pt-4 flex justify-end">
                <AdminButton disabled>Save Changes</AdminButton>
              </div>
            </div>
            <p className="text-center text-silver-dark mt-6">
              TODO: Implement settings form in Phase 3.x
            </p>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
