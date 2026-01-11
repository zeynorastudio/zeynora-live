"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";

interface AdminProductFiltersProps {
  showSuperAdminFilters: boolean;
}

export function AdminProductFilters({ showSuperAdminFilters }: AdminProductFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select>
        <SelectTrigger className="w-[180px] bg-white border-silver-light">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {/* Categories will be dynamic later */}
          <SelectItem value="sarees">Sarees</SelectItem>
          <SelectItem value="lehengas">Lehengas</SelectItem>
          <SelectItem value="suits">Suits</SelectItem>
        </SelectContent>
      </Select>

      {showSuperAdminFilters && (
        <Select defaultValue="active">
          <SelectTrigger className="w-[150px] bg-white border-silver-light">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select>
        <SelectTrigger className="w-[150px] bg-white border-silver-light">
          <SelectValue placeholder="Featured" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="featured">Featured Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}


