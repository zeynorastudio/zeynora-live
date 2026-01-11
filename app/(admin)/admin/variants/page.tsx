import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { VariantTable } from "./components/VariantTable";

export const metadata = {
  title: "Variant Manager | Admin",
};

export default async function VariantsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="serif-display text-3xl text-night">
          {session.role === "super_admin" ? "Bulk Variant Editor" : "Stock Editor"}
        </h1>
        <p className="sans-base text-silver-dark mt-1">
          Manage inventory and pricing across all products.
        </p>
      </div>

      <VariantTable role={session.role} />
    </div>
  );
}
