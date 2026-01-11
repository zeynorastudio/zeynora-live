import React from "react";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin"; // Assuming this helper exists or I use check in component
import { FileDown, Calendar, AlertCircle } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { Input } from "@/components/ui/Input";

export const metadata = {
  title: "Export Queries | Super Admin",
};

export default async function QueriesExportPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="serif-display text-3xl text-night">Export Queries Data</h1>
        <p className="text-silver-dark mt-1">Download support ticket data for analysis.</p>
      </div>

      <div className="bg-white rounded-lg border border-silver-light p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-night uppercase tracking-wide">Date Range</label>
            <div className="flex gap-2 items-center">
              <Input type="date" className="flex-1" />
              <span className="text-silver-dark">-</span>
              <Input type="date" className="flex-1" />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-bold text-night uppercase tracking-wide">Status Filter</label>
             <select className="w-full h-10 px-3 rounded-md border border-silver-light bg-white focus:ring-1 focus:ring-gold/50 outline-none">
               <option value="all">All Statuses</option>
               <option value="open">Open Only</option>
               <option value="resolved">Resolved Only</option>
             </select>
          </div>
        </div>

        <div className="bg-offwhite/50 p-6 rounded-lg border border-silver-light mb-8">
          <h3 className="text-sm font-bold text-night mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gold-darker" />
            Export Functionality
          </h3>
          <p className="text-sm text-silver-dark mb-4">
            The automated CSV export endpoint is currently under development. 
            Use the command below to extract data directly from the database if needed immediately.
          </p>
          <div className="bg-night text-offwhite font-mono text-xs p-4 rounded overflow-x-auto relative group">
            <code className="block whitespace-pre">
{`\COPY (SELECT * FROM queries WHERE created_at > '2023-01-01') TO 'queries_export.csv' WITH CSV HEADER;`}
            </code>
          </div>
        </div>

        <div className="flex justify-end">
          <AdminButton icon={FileDown} disabled>
            Download CSV (Coming Soon)
          </AdminButton>
        </div>
      </div>
    </div>
  );
}


