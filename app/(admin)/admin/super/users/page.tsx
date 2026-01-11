import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminButton } from "@/components/admin/AdminButton";
import { UserPlus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function SuperAdminUsersPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif-display text-night text-3xl">Users & Roles</h1>
          <p className="sans-base text-silver-dark mt-2">Manage staff access and permissions</p>
        </div>
        <AdminButton icon={UserPlus}>Invite User</AdminButton>
      </div>

      <AdminCard>
        <AdminTable headers={["User", "Email", "Role", "Status", "Last Active", "Actions"]}>
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-silver-dark">
              TODO: Implement user management table
            </td>
          </tr>
        </AdminTable>
      </AdminCard>
    </div>
  );
}
