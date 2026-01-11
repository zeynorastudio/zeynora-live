"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { collectionSchema, CollectionInput } from "@/lib/admin/validators";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "lucide-react";

interface CollectionFormProps {
  initialData?: any;
  isNew?: boolean;
}

export default function CollectionForm({ initialData, isNew }: CollectionFormProps) {
  const { register, control, handleSubmit, watch } = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema) as any,
    defaultValues: initialData || {
      title: "", slug: "", is_manual: true, active: false, featured: false
    }
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "rule_json" });
  const isManual = watch("is_manual");
  const { addToast } = useToastWithCompat();
  const router = useRouter();

  const onSubmit = async (data: CollectionInput) => {
    try {
      const url = isNew ? "/api/admin/collections/create" : `/api/admin/collections/${initialData.id}/update`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, { method, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      addToast("Saved", "success");
      router.push("/admin/collections");
    } catch (e) { addToast("Error", "error"); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <AdminCard title="Collection Info">
        <div className="grid grid-cols-2 gap-4">
          <div><label>Title</label><input {...register("title")} className="w-full border p-2 rounded" /></div>
          <div><label>Slug</label><input {...register("slug")} className="w-full border p-2 rounded" /></div>
        </div>
        <label className="flex items-center gap-2 mt-4">
          <input type="checkbox" {...register("is_manual")} /> Manual Collection?
        </label>
      </AdminCard>

      {!isManual && (
        <AdminCard title="Smart Rules">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2">
              <select {...register(`rule_json.${index}.field` as const)} className="border p-2">
                <option value="price">Price</option>
                <option value="tags">Tags</option>
                <option value="category">Category</option>
              </select>
              <select {...register(`rule_json.${index}.operator` as const)} className="border p-2">
                <option value="equals">Equals</option>
                <option value="gt">Greater Than</option>
                <option value="contains">Contains</option>
              </select>
              <input {...register(`rule_json.${index}.value` as const)} className="border p-2" placeholder="Value" />
              <button type="button" onClick={() => remove(index)}><Trash className="w-4 h-4" /></button>
            </div>
          ))}
          <AdminButton type="button" onClick={() => append({ field: "price", operator: "gt", value: "" })} icon={Plus} size="sm">Add Rule</AdminButton>
        </AdminCard>
      )}

      <div className="flex justify-end"><AdminButton type="submit">Save</AdminButton></div>
    </form>
  );
}

