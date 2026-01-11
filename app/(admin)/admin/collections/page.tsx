import React from "react";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AdminButton } from "@/components/admin/AdminButton";
import { Plus } from "lucide-react";
import { Database } from "@/types/supabase";

type Collection = Database['public']['Tables']['collections']['Row'];

export default async function CollectionsPage() {
  await requireSuperAdmin();

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("collections").select("*").order("created_at", { ascending: false });
  
  const collections = data as Collection[] | null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between mb-6">
        <h1 className="serif-display text-3xl">Collections</h1>
        <Link href="/admin/collections/new"><AdminButton icon={Plus}>New Collection</AdminButton></Link>
      </div>
      <div className="grid gap-4">
        {collections?.map((c) => (
          <div key={c.id} className="bg-white p-4 border rounded shadow-sm flex justify-between">
            <div>
              <h3 className="font-bold">{c.name}</h3>
              <p className="text-sm text-gray-500">{c.is_seasonal ? "Seasonal" : "Regular"}</p>
            </div>
            <Link href={`/admin/collections/${c.id}`} className="text-gold hover:underline">Edit</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

