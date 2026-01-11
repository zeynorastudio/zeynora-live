import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { ShieldCheck, Users, Archive, Activity } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function SuperAdminOverviewPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-3xl">Super Admin Overview</h1>
        <p className="sans-base text-silver-dark mt-2">System-wide controls and monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatCard title="System Health" value="Good" icon={Activity} trend="Stable" trendUp />
        <AdminStatCard title="Total Users" value="0" icon={Users} />
        <AdminStatCard title="Audit Logs" value="0" icon={ShieldCheck} />
        <AdminStatCard title="Database Size" value="0 MB" icon={Archive} />
      </div>

      <div className="p-6 bg-white rounded-xl border border-silver-light shadow-sm">
         <p className="text-silver-dark text-center py-12">
           TODO: Implement high-level system metrics and quick actions
         </p>
      </div>
    </div>
  );
}
