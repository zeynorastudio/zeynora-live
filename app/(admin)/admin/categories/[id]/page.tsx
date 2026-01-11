import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CategoryForm from "@/components/admin/CategoryForm";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await requireSuperAdmin();

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("categories").select("*").eq("id", resolvedParams.id).single();

  return (
    <div className="p-6">
      <CategoryForm initialData={data} />
    </div>
  );
}

