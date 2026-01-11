import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CategoryImageEditor from "@/components/admin/category/CategoryImageEditor";
import { Database } from "@/types/supabase";

type Category = Database['public']['Tables']['categories']['Row'];

export const metadata = {
  title: "Category Images | Admin",
};

export default async function CategoryImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();
  
  const category = data as Category | null;

  if (!category) {
    return (
      <div className="p-8 text-center">Category not found</div>
    );
  }

  const isSuperAdmin = session.role === "super_admin";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="serif-display text-2xl text-night">Manage Images: <span className="text-gold-darker">{category.name}</span></h1>
        <p className="sans-base text-silver-dark mt-1">Update tile and banner imagery.</p>
      </div>

      <CategoryImageEditor 
        categoryId={category.id}
        initialTilePath={category.tile_image_path || undefined}
        initialBannerPath={category.banner_image_path || undefined}
        readOnly={!isSuperAdmin}
      />
    </div>
  );
}

