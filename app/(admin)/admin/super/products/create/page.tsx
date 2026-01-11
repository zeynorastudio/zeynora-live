import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { SuperProductForm } from "@/components/admin/products/SuperProductForm";

export default async function CreateProductPage() {
  await requireSuperAdmin();

  return <SuperProductForm mode="create" />;
}
