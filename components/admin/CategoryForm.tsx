"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, CategoryInput } from "@/lib/admin/validators";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface CategoryFormProps {
  initialData?: any;
  isNew?: boolean;
}

export default function CategoryForm({ initialData, isNew }: CategoryFormProps) {
  const { register, handleSubmit } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: initialData || {
      name: "",
      slug: "",
      is_active: true,
      show_in_megamenu: false,
      position: 0
    }
  });
  const { addToast } = useToastWithCompat();
  const router = useRouter();

  const onSubmit = async (data: CategoryInput) => {
    try {
      const url = isNew ? "/api/admin/categories/create" : `/api/admin/categories/${initialData.id}/update`;
      const method = isNew ? "POST" : "PUT";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) throw new Error("Failed");
      addToast("Saved successfully", "success");
      router.push("/admin/categories");
    } catch (e) {
      addToast("Error saving category", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 max-w-2xl">
      <AdminCard title="Category Details">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input {...register("name")} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input {...register("slug")} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("show_in_megamenu")} />
              Show in Mega Menu
            </label>
          </div>
        </div>
      </AdminCard>
      <div className="flex justify-end">
        <AdminButton type="submit">Save Category</AdminButton>
      </div>
    </form>
  );
}

