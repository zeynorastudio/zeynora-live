"use client";

import React from "react";
import { Eye, FileJson } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";
import { AdminButton } from "@/components/admin/AdminButton";
import { Badge } from "@/components/ui/Badge";

export interface ActivityLogEntryData {
  id: string;
  actor_email: string; // or masked
  actor_role: string;
  action: string;
  detail: any; // JSON
  ip_address?: string;
  created_at: string;
}

interface ActivityLogEntryProps {
  entry: ActivityLogEntryData;
  isSuperAdmin: boolean;
}

export function ActivityLogEntry({ entry, isSuperAdmin }: ActivityLogEntryProps) {
  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("upload")) return "bg-green-100 text-green-800 border-green-200";
    if (action.includes("update") || action.includes("edit")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (action.includes("delete") || action.includes("remove")) return "bg-red-100 text-red-800 border-red-200";
    if (action.includes("login") || action.includes("invite")) return "bg-purple-100 text-purple-800 border-purple-200";
    return "bg-offwhite text-silver-darker border-silver-light";
  };

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-offwhite/30 border-b border-silver-light last:border-0 transition-colors">
      <div className="w-32 flex-shrink-0 text-xs text-silver-dark tabular-nums">
        {new Date(entry.created_at).toLocaleString()}
      </div>
      
      <div className="w-48 flex-shrink-0">
        <div className="text-sm font-medium text-night truncate" title={entry.actor_email}>
          {entry.actor_email}
        </div>
        <div className="text-[10px] text-silver-dark uppercase tracking-wider">
          {entry.actor_role}
        </div>
      </div>

      <div className="w-32 flex-shrink-0">
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getActionColor(entry.action)}`}>
          {entry.action}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs text-silver-darker font-mono truncate max-w-md bg-offwhite/50 p-1 rounded">
           {JSON.stringify(entry.detail).substring(0, 60)}...
        </div>
      </div>

      <div className="flex-shrink-0">
        <Dialog>
          <DialogTrigger asChild>
            <button className="p-2 hover:bg-offwhite rounded-full text-silver-dark hover:text-gold transition-colors" title="View Payload">
              <Eye className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-silver-light">
                 <FileJson className="w-5 h-5 text-gold" />
                 <h3 className="serif-display text-xl text-night">Activity Details</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-xs font-bold text-silver-dark uppercase tracking-wide">Actor</label>
                  <p className="text-sm text-night font-medium">{entry.actor_email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-silver-dark uppercase tracking-wide">Timestamp</label>
                  <p className="text-sm text-night font-medium">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-silver-dark uppercase tracking-wide">Action</label>
                  <p className="text-sm text-night font-medium capitalize">{entry.action}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-silver-dark uppercase tracking-wide">IP Address</label>
                  <p className="text-sm text-night font-mono">{entry.ip_address || "N/A"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-silver-dark uppercase tracking-wide">Payload Data</label>
                <pre className="bg-night text-offwhite p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-[300px]">
                  {JSON.stringify(entry.detail, null, 2)}
                </pre>
              </div>

              {!isSuperAdmin && entry.detail && JSON.stringify(entry.detail).includes("@") && (
                 <p className="mt-2 text-[10px] text-silver-dark italic">
                   Note: Some sensitive fields may be masked for your role.
                 </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


