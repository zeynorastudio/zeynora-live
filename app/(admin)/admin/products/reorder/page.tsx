import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ProductReorderList } from "./components/ProductReorderList";

export const metadata = {
  title: "Reorder Products | Admin",
};

export default async function ReorderPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  
  if (session.role !== "super_admin") {
    return (
      <div className="p-8 text-center">Access Denied. Super Admin only.</div>
    );
  }

  const supabase = createServiceRoleClient();
  const { data: products } = await supabase
    .from("products")
    .select("uid, name, main_image_path, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <ProductReorderList initialProducts={products || []} />
    </div>
  );
}
