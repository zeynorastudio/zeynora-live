import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import CategoryForm from "@/components/admin/CategoryForm";

export default async function NewCategoryPage() {
  await requireSuperAdmin();

  return (
    <div className="p-6">
      <CategoryForm isNew />
    </div>
  );
}

