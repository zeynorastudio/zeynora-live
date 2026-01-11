import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CollectionForm from "@/components/admin/CollectionForm";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await requireSuperAdmin();

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("collections").select("*").eq("id", resolvedParams.id).single();

  return (
    <div className="p-6">
      <CollectionForm initialData={data} />
    </div>
  );
}

