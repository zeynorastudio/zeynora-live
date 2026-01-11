"use client";

import React, { useState, useMemo } from "react";
import { QueriesFilterBar } from "./QueriesFilterBar";
import { QueriesList, Query } from "./QueriesList";
import { QueryDetailDrawer } from "./QueryDetailDrawer";
import { AlertCircle } from "lucide-react";

interface QueriesPageClientProps {
  initialQueries: Query[];
  userRole?: string;
  currentUserId?: string;
}

export function QueriesPageClient({ initialQueries, userRole, currentUserId }: QueriesPageClientProps) {
  const [filters, setFilters] = useState({
    status: "all",
    assignedTo: "all",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      assignedTo: "all",
      dateFrom: "",
      dateTo: "",
      search: "",
    });
  };

  // Client-side filtering
  const filteredQueries = useMemo(() => {
    return initialQueries.filter(query => {
      // Status
      if (filters.status !== "all" && query.status !== filters.status) return false;
      
      // Assigned
      if (filters.assignedTo === "me" && query.assigned_to !== currentUserId) return false;
      if (filters.assignedTo === "unassigned" && query.assigned_to) return false;
      
      // Search
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matchesSubject = query.subject.toLowerCase().includes(term);
        const matchesId = query.id.toLowerCase().includes(term);
        const matchesCustomer = query.customer_name.toLowerCase().includes(term) || query.customer_email.toLowerCase().includes(term);
        const matchesOrder = query.order_id?.toLowerCase().includes(term);
        
        if (!matchesSubject && !matchesId && !matchesCustomer && !matchesOrder) return false;
      }

      // Date Range (Simple string comparison for YYYY-MM-DD)
      if (filters.dateFrom) {
        const qDate = new Date(query.created_at).toISOString().split('T')[0];
        if (qDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const qDate = new Date(query.created_at).toISOString().split('T')[0];
        if (qDate > filters.dateTo) return false;
      }

      return true;
    });
  }, [initialQueries, filters, currentUserId]);

  const handleSelectQuery = (query: Query) => {
    setSelectedQuery(query);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Missing Backend Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-blue-800 mb-1">Backend Integration Pending</h3>
          <p className="text-xs text-blue-700 leading-relaxed mb-2">
            The <code>queries</code> table and associated API endpoints (<code>getQueries</code>) are missing from the current backend.
            This page is currently showing <strong>mock data</strong> for demonstration purposes.
          </p>
          <div className="text-[10px] font-mono bg-blue-100/50 p-2 rounded text-blue-800 border border-blue-200">
            <strong>Required Schema (TODO):</strong><br/>
            Table: <code>queries</code> (id, order_id, customer_id, subject, message, status, created_at, assigned_to)<br/>
            Table: <code>query_messages</code> (id, query_id, sender_type, message, is_internal, attachments, created_at)
          </div>
        </div>
      </div>

      <QueriesFilterBar 
        filters={filters}
        onFilterChange={handleFilterChange}
        onApply={() => {}} // Filters apply reactively in this client implementation
        onClear={clearFilters}
      />

      <QueriesList 
        queries={filteredQueries} 
        onSelectQuery={handleSelectQuery}
        currentUserId={currentUserId}
      />

      <QueryDetailDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        query={selectedQuery}
        currentUserId={currentUserId}
      />
    </div>
  );
}


