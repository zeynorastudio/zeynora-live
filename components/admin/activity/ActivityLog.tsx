"use client";

import React, { useState } from "react";
import { ActivityLogEntry, ActivityLogEntryData } from "./ActivityLogEntry";
import { Download, Filter, Search } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import { Input } from "@/components/ui/Input";

// Corrected import path assumption, if file is separate. Actually I'll just use the type defined in ActivityLogEntry if exported.
import { ActivityLogEntry as EntryComponent } from "./ActivityLogEntry";

interface ActivityLogProps {
  entries: ActivityLogEntryData[];
  isSuperAdmin: boolean;
}

export function ActivityLog({ entries, isSuperAdmin }: ActivityLogProps) {
  const [filter, setFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.actor_email.toLowerCase().includes(filter.toLowerCase()) || 
      entry.action.toLowerCase().includes(filter.toLowerCase());
    
    const matchesAction = actionFilter === "all" || entry.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(entries.map(e => e.action)));

  const handleExport = () => {
    // TODO: Trigger export endpoint
    alert("TODO: Call /api/admin/activity/export");
  };

  return (
    <div className="bg-white rounded-lg border border-silver-light shadow-sm">
      {/* Toolbar */}
      <div className="p-4 border-b border-silver-light flex flex-col md:flex-row gap-4 justify-between items-center bg-offwhite/30">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
             <Input 
               placeholder="Search actor or action..." 
               className="pl-9 w-full md:w-64 bg-white"
               value={filter}
               onChange={(e) => setFilter(e.target.value)}
             />
          </div>
          
          <select 
            className="h-10 px-3 rounded-md border border-silver-light text-sm bg-white focus:ring-1 focus:ring-gold/50 outline-none"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        {isSuperAdmin && (
          <AdminButton variant="outline" size="sm" icon={Download} onClick={handleExport}>
            Export Log
          </AdminButton>
        )}
      </div>

      {/* List Header */}
      <div className="flex items-center gap-4 py-2 px-4 bg-offwhite border-b border-silver-light text-[10px] font-bold text-silver-darker uppercase tracking-wider">
        <div className="w-32">Timestamp</div>
        <div className="w-48">Actor</div>
        <div className="w-32">Action</div>
        <div className="flex-1">Details Preview</div>
        <div className="w-8"></div>
      </div>

      {/* List Body */}
      <div className="divide-y divide-silver-light max-h-[600px] overflow-y-auto">
        {filteredEntries.length > 0 ? (
          filteredEntries.map(entry => (
            <EntryComponent key={entry.id} entry={entry} isSuperAdmin={isSuperAdmin} />
          ))
        ) : (
          <div className="p-8 text-center text-silver-dark text-sm">
            No activity logs found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}


