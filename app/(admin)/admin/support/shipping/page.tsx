import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";

export default async function AdminShippingQueriesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("shipping_queries").select("*").order("created_at", { ascending: false });
  const queries: any[] | null = data;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="serif-display text-3xl mb-6">Shipping Queries</h1>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-offwhite border-b uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Order #</th>
              <th className="px-6 py-3">Message</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {queries?.map((q) => (
              <tr key={q.id}>
                <td className="px-6 py-4">{new Date(q.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="font-medium">{q.customer_name}</div>
                  <div className="text-xs text-silver-dark">{q.email}</div>
                </td>
                <td className="px-6 py-4 font-mono">{q.order_number || "-"}</td>
                <td className="px-6 py-4 max-w-xs truncate">{q.message}</td>
                <td className="px-6 py-4"><Badge variant={q.status === "open" ? "destructive" : "vine"}>{q.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

