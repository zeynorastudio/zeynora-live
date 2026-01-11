"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import { AdminButton } from "@/components/admin/AdminButton";
import { Filter } from "lucide-react";

interface OrdersFilterBarProps {
  onFilterChange: (filters: any) => void;
}

export function OrdersFilterBar({ onFilterChange }: OrdersFilterBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");

  const handleApply = () => {
    onFilterChange({ searchTerm, status });
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-silver-light shadow-sm">
      <div className="relative flex-1">
        <input 
          type="text" 
          placeholder="Search orders by ID or Customer Name..." 
          className="w-full px-4 py-2 border border-silver-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="flex gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] bg-white border-silver-light">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <AdminButton onClick={handleApply} icon={Filter} variant="outline">
          Apply
        </AdminButton>
      </div>
    </div>
  );
}


