import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function SuperAdminLogsPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="serif-display text-night text-3xl">Audit Logs</h1>
        <p className="sans-base text-silver-dark mt-2">System activity trail</p>
      </div>

      <AdminCard>
        <AdminTable headers={["Timestamp", "Actor", "Action", "Target", "Details"]}>
          <tr>
            <td colSpan={5} className="px-6 py-12 text-center text-silver-dark">
              TODO: Implement audit log viewer
            </td>
          </tr>
        </AdminTable>
      </AdminCard>
    </div>
  );
}
