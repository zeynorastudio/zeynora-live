"use client";

import React from "react";

interface AdminRoleContextType {
  role: "admin" | "super_admin" | null;
}

const AdminRoleContext = React.createContext<AdminRoleContextType>({ role: null });

export const useAdminRole = () => React.useContext(AdminRoleContext);

export default function AdminRoleProvider({
  role,
  children,
}: {
  role: "admin" | "super_admin" | null;
  children: React.ReactNode;
}) {
  return (
    <AdminRoleContext.Provider value={{ role }}>
      {children}
    </AdminRoleContext.Provider>
  );
}
