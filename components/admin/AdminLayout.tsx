import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

export function AdminLayout({ children, role, unreadCount }: { children: React.ReactNode; role?: string; unreadCount?: number }) {
  return (
    <div className="min-h-screen bg-offwhite font-sans text-night">
      <AdminSidebar role={role} />
      
      <div className="pl-[240px] min-h-screen flex flex-col">
        <AdminTopBar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
