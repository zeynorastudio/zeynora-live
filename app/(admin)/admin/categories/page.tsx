import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CategoryTree from "@/components/admin/CategoryTree";

export default async function CategoriesPage() {
  await requireSuperAdmin();

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("categories").select("*").order("position");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="serif-display text-3xl mb-6">Category Management</h1>
      <CategoryTree initialCategories={data || []} />
    </div>
  );
}

