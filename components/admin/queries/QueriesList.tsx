"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { QuickActions } from "./QuickActions";

export interface Query {
  id: string;
  subject: string;
  customer_name: string;
  customer_email: string;
  order_id?: string;
  status: 'open' | 'pending' | 'resolved';
  assigned_to?: string; // user_id
  created_at: string;
  is_read?: boolean;
}

interface QueriesListProps {
  queries: Query[];
  onSelectQuery: (query: Query) => void;
  currentUserId?: string;
}

export function QueriesList({ queries, onSelectQuery, currentUserId }: QueriesListProps) {
  if (queries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-silver-light">
        <p className="text-silver-dark">No queries found matching your filters.</p>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive'; // Or a custom 'warning' variant if available, using destructive for high attention
      case 'pending': return 'secondary';
      case 'resolved': return 'success';
      default: return 'outline';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-silver-light overflow-hidden shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-offwhite text-silver-darker font-medium uppercase text-xs tracking-wider border-b border-silver-light">
          <tr>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Subject / ID</th>
            <th className="px-6 py-3">Customer</th>
            <th className="px-6 py-3">Assigned To</th>
            <th className="px-6 py-3">Date</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-silver-light">
          {queries.map((query) => (
            <tr 
              key={query.id} 
              className={`hover:bg-offwhite/50 transition-colors cursor-pointer ${!query.is_read ? 'bg-blue-50/30' : ''}`}
              onClick={() => onSelectQuery(query)}
            >
              <td className="px-6 py-4">
                <Badge variant={getStatusVariant(query.status)} className="capitalize">
                  {query.status}
                </Badge>
              </td>
              <td className="px-6 py-4 max-w-xs">
                <div className="font-medium text-night truncate" title={query.subject}>
                  {query.subject}
                </div>
                <div className="text-xs text-silver-dark font-mono mt-0.5">
                  #{query.id.substring(0, 8)}
                </div>
                {query.order_id && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-offwhite text-silver-darker border border-silver-light mt-1">
                    Order #{query.order_id.substring(0, 8)}
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-night">{query.customer_name}</div>
                <div className="text-xs text-silver-dark">{query.customer_email}</div>
              </td>
              <td className="px-6 py-4">
                {query.assigned_to ? (
                   <span className={`text-xs px-2 py-1 rounded-full ${query.assigned_to === currentUserId ? 'bg-gold/10 text-gold-darker font-medium' : 'bg-offwhite text-silver-darker'}`}>
                     {query.assigned_to === currentUserId ? 'Me' : 'Agent'}
                   </span>
                ) : (
                  <span className="text-xs text-silver-light italic">Unassigned</span>
                )}
              </td>
              <td className="px-6 py-4 text-silver-dark whitespace-nowrap">
                {new Date(query.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-right">
                <QuickActions 
                  isRead={query.is_read}
                  isResolved={query.status === 'resolved'}
                  isAssignedToMe={query.assigned_to === currentUserId}
                  onMarkRead={() => {/* TODO: Call API */}}
                  onResolve={() => {/* TODO: Call API */}}
                  onAssignSelf={() => {/* TODO: Call API */}}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


