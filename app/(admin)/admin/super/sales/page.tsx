import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";

export default async function SuperAdminSalesPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif-display text-night text-3xl">Sales & Discounts</h1>
          <p className="sans-base text-silver-dark mt-2">Manage automated sales and coupons</p>
        </div>
        <AdminButton icon={Plus}>New Sale</AdminButton>
      </div>

      <AdminCard>
        <AdminTable headers={["Sale Name", "Type", "Discount", "Duration", "Status", "Actions"]}>
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center text-silver-dark">
              TODO: Implement sales logic
            </td>
          </tr>
        </AdminTable>
      </AdminCard>
    </div>
  );
}
