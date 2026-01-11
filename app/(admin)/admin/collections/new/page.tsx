import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import CollectionForm from "@/components/admin/CollectionForm";

export default async function NewCollectionPage() {
  await requireSuperAdmin();

  return (
    <div className="p-6">
      <CollectionForm isNew />
    </div>
  );
}

