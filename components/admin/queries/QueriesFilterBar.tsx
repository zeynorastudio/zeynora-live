"use client";

import React from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select"; // Need to check if Select component exists and its API
import { AdminButton } from "@/components/admin/AdminButton";

interface QueriesFilterBarProps {
  filters: {
    status: string;
    assignedTo: string;
    dateFrom: string;
    dateTo: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export function QueriesFilterBar({ filters, onFilterChange, onApply, onClear }: QueriesFilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-lg border border-silver-light space-y-4 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-silver-dark" />
          <Input 
            placeholder="Search subject, order ID, or customer..." 
            className="pl-9 bg-offwhite/30"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-40">
          <select 
            className="w-full h-10 px-3 rounded-md border border-silver-light text-sm bg-white focus:ring-1 focus:ring-gold/50 outline-none"
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Assigned Filter */}
        <div className="w-full md:w-40">
          <select 
            className="w-full h-10 px-3 rounded-md border border-silver-light text-sm bg-white focus:ring-1 focus:ring-gold/50 outline-none"
            value={filters.assignedTo}
            onChange={(e) => onFilterChange("assignedTo", e.target.value)}
            aria-label="Filter by assignment"
          >
            <option value="all">All Agents</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-2 border-t border-silver-light/50">
        <div className="flex gap-2 items-center w-full md:w-auto">
          <span className="text-xs font-medium text-silver-dark uppercase tracking-wide">Date Range:</span>
          <Input 
            type="date" 
            className="w-auto" 
            value={filters.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
          />
          <span className="text-silver-dark">-</span>
          <Input 
            type="date" 
            className="w-auto" 
            value={filters.dateTo}
            onChange={(e) => onFilterChange("dateTo", e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end">
          <AdminButton variant="ghost" size="sm" onClick={onClear} icon={X}>
            Clear
          </AdminButton>
          <AdminButton variant="primary" size="sm" onClick={onApply} icon={Filter}>
            Apply Filters
          </AdminButton>
        </div>
      </div>
    </div>
  );
}


